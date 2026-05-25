<script lang="ts">
	import { createHttpResponseMessage } from '$lib/Utils/http-response.js';
	import { getErrorMessage } from '$lib/Tei/transform-errors.js';
	import {
		selectParsedXmlFile,
		type FileData,
		type XmlFilePayloadBase
	} from './file-button-utils.js';
	import { selectParsedXsltProject, type ParsedXsltProjectResult } from './xslt-project-utils.js';

	interface ErrorPayload extends XmlFilePayloadBase {
		sef: null;
	}

	interface LoadedPayload extends XmlFilePayloadBase {
		entryPath?: string;
		files?: ParsedXsltProjectResult['files'];
		sef: unknown;
	}

	interface CompileSource extends XmlFilePayloadBase {
		contents: string;
		entryPath?: string;
		files?: ParsedXsltProjectResult['files'];
	}

	interface CompileRequest {
		contents: string;
		entryPath?: string;
		files?: ParsedXsltProjectResult['files'];
	}

	type CompileContext = Pick<ErrorPayload, 'fileData' | 'metaData'>;
	type CancelCompile = () => void;
	type XsltCompileProgressStage = 'xslt-uploaded' | 'sef-compiling' | 'sef-loaded';
	type AbortReason = 'cancel' | 'timeout';
	type CompileApiResponse =
		| { status: 'success'; sef: unknown }
		| { status: 'error'; error?: unknown };

	interface Props {
		label?: string;
		projectLabel?: string;
		preferredEntryNames?: string[];
		started?: () => Promise<void> | void;
		loaded?: (payload: LoadedPayload) => void;
		error?: (payload: ErrorPayload) => void;
		registerCancel?: (cancel: CancelCompile | null) => void;
		progress?: (stage: XsltCompileProgressStage) => void;
	}

	class XsltCompilationCancelled extends Error {
		constructor() {
			super('XSLT compilation cancelled.');
			this.name = 'XsltCompilationCancelled';
		}
	}

	const ignoreSefLoaded = (_payload: LoadedPayload) => {};
	const ignoreSefError = (_payload: ErrorPayload) => {};
	const ignoreCancelRegistration = (_cancel: CancelCompile | null) => {};
	const ignoreProgress = (_stage: XsltCompileProgressStage) => {};

	let {
		label = 'Load XSLT',
		projectLabel = 'Load XSLT project',
		preferredEntryNames = [],
		started,
		loaded = ignoreSefLoaded,
		error = ignoreSefError,
		registerCancel = ignoreCancelRegistration,
		progress = ignoreProgress
	}: Props = $props();

	let activeCancel: CancelCompile | null = null;

	async function handleFileOpen() {
		await handleStylesheetOpen(loadStylesheetFile, 'XSLT compile error');
	}

	async function handleProjectOpen() {
		await handleStylesheetOpen(loadStylesheetProject, 'XSLT project');
	}

	async function handleStylesheetOpen(
		loadSource: () => Promise<CompileSource | null>,
		fallbackName: string
	) {
		let compileContext: CompileContext | null = null;

		try {
			const source = await loadSource();
			if (!source) return;

			compileContext = createCompileContext(source);
			await compileAndLoadSource(source);
		} catch (compileError) {
			if (isCompilationCancelled(compileError)) return;

			error(createCompileErrorPayload(compileError, compileContext, fallbackName));
		}
	}

	async function loadStylesheetFile(): Promise<CompileSource | null> {
		return selectParsedXmlFile({ accept: '.xsl, .xslt', started });
	}

	async function loadStylesheetProject(): Promise<CompileSource | null> {
		return selectParsedXsltProject({
			accept: '.xsl, .xslt',
			started,
			preferredEntryNames
		});
	}

	async function compileAndLoadSource(source: CompileSource) {
		progress('xslt-uploaded');
		if (reportParseErrors(source)) return;

		progress('sef-compiling');
		const sef = await compileXslt(source);
		progress('sef-loaded');
		loaded(createLoadedPayload(source, sef));
	}

	function reportParseErrors(source: CompileSource) {
		if (source.errors.length === 0) return false;

		error({
			fileData: source.fileData,
			sef: null,
			metaData: source.metaData,
			errors: source.errors
		});
		return true;
	}

	function createLoadedPayload(source: CompileSource, sef: unknown): LoadedPayload {
		return {
			fileData: source.fileData,
			sef,
			metaData: source.metaData,
			errors: [],
			entryPath: source.entryPath,
			files: source.files
		};
	}

	async function compileXslt(payload: CompileRequest): Promise<unknown> {
		const { body, contentType } = createCompileRequest(payload);
		const abortable = createCompileAbort();
		setActiveCancel(abortable.cancel);

		try {
			const resp = await fetch('/api/compile-xslt-to-sef', {
				method: 'POST',
				headers: {
					'Content-Type': contentType
				},
				body,
				signal: abortable.signal
			});

			return readSuccessfulCompileResponse(resp);
		} catch (compileError) {
			const abortError = abortable.getError();
			if (abortError) throw abortError;

			throw compileError;
		} finally {
			abortable.clear();
			clearActiveCancel(abortable.cancel);
		}
	}

	function createCompileRequest(payload: CompileRequest) {
		return payload.files && payload.files.length > 1
			? {
					body: JSON.stringify({ entryPath: payload.entryPath, files: payload.files }),
					contentType: 'application/json'
				}
			: { body: payload.contents, contentType: 'application/xslt+xml' };
	}

	async function readSuccessfulCompileResponse(response: Response) {
		const json = await readCompileResponse(response);
		assertCompileSuccess(json, response);
		return json.sef;
	}

	async function readCompileResponse(response: Response): Promise<CompileApiResponse> {
		const responseText = await response.text();
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			try {
				return JSON.parse(responseText) as CompileApiResponse;
			} catch (_error) {
				return { status: 'error', error: createHttpResponseMessage(response, responseText) };
			}
		}

		return { status: 'error', error: createHttpResponseMessage(response, responseText) };
	}

	function assertCompileSuccess(
		payload: CompileApiResponse,
		response: Response
	): asserts payload is { status: 'success'; sef: unknown } {
		if (response.ok && payload.status === 'success') return;

		throw new Error(createCompileFailureMessage(payload, response));
	}

	function createCompileFailureMessage(payload: CompileApiResponse, response: Response) {
		if (payload.status === 'error' && payload.error) return getErrorMessage(payload.error);

		return `XSLT compilation failed with HTTP ${response.status}`;
	}

	function createCompileAbort() {
		const controller = new AbortController();
		let abortReason: AbortReason | null = null;
		const abortCompile = (reason: AbortReason) => {
			if (controller.signal.aborted) return;

			abortReason = reason;
			controller.abort();
		};
		const timeout = setTimeout(() => abortCompile('timeout'), 120_000);

		return {
			signal: controller.signal,
			cancel: () => abortCompile('cancel'),
			getError: () => getCompileAbortError(controller.signal, abortReason),
			clear: () => clearTimeout(timeout)
		};
	}

	function getCompileAbortError(signal: AbortSignal, abortReason: AbortReason | null) {
		if (!signal.aborted) return null;
		if (abortReason === 'cancel') return new XsltCompilationCancelled();

		return new Error('XSLT compilation timed out after 120 seconds.');
	}

	function createSyntheticFileData(name: string): FileData {
		return {
			basename: name,
			name,
			size: 0,
			lastModified: new Date(),
			type: 'application/xml'
		};
	}

	function createCompileContext(source: CompileSource): CompileContext {
		return { fileData: source.fileData, metaData: source.metaData };
	}

	function createCompileErrorPayload(
		errorValue: unknown,
		compileContext: CompileContext | null,
		fallbackName: string
	): ErrorPayload {
		return {
			fileData: getCompileErrorFileData(compileContext, fallbackName),
			sef: null,
			metaData: compileContext?.metaData ?? {},
			errors: [getErrorMessage(errorValue)]
		};
	}

	function getCompileErrorFileData(compileContext: CompileContext | null, fallbackName: string) {
		if (compileContext) return compileContext.fileData;

		return createSyntheticFileData(fallbackName);
	}

	function isCompilationCancelled(errorValue: unknown) {
		return errorValue instanceof XsltCompilationCancelled;
	}

	function setActiveCancel(cancel: CancelCompile) {
		activeCancel = cancel;
		registerCancel(cancel);
	}

	function clearActiveCancel(cancel: CancelCompile) {
		if (activeCancel !== cancel) return;

		activeCancel = null;
		registerCancel(null);
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleFileOpen}>{label}</button>
<button type="button" class="tool-panel__button" onclick={handleProjectOpen}>{projectLabel}</button>
