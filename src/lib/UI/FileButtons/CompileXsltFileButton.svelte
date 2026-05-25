<script lang="ts">
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

	type CancelCompile = () => void;
	type XsltCompileProgressStage = 'xslt-uploaded' | 'sef-compiling' | 'sef-loaded';

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
		try {
			const xmlFile = await selectParsedXmlFile({ accept: '.xsl, .xslt', started });
			if (!xmlFile) return;

			const { fileData, contents, metaData, errors } = xmlFile;
			progress('xslt-uploaded');

			if (errors.length > 0) {
				error({ fileData, sef: null, metaData, errors });
				return;
			}

			progress('sef-compiling');
			const sef = await compileXslt({ contents });
			progress('sef-loaded');
			loaded({ fileData, sef, metaData, errors: [] });
		} catch (compileError) {
			if (isCompilationCancelled(compileError)) return;

			error({
				fileData: createSyntheticFileData('XSLT compile error'),
				sef: null,
				metaData: {},
				errors: [getErrorMessage(compileError)]
			});
		}
	}

	async function handleProjectOpen() {
		try {
			const xsltProject = await selectParsedXsltProject({
				accept: '.xsl, .xslt',
				started,
				preferredEntryNames
			});
			if (!xsltProject) return;

			const { fileData, contents, metaData, errors, entryPath, files } = xsltProject;
			progress('xslt-uploaded');

			if (errors.length > 0) {
				error({ fileData, sef: null, metaData, errors });
				return;
			}

			progress('sef-compiling');
			const sef = await compileXslt({ contents, entryPath, files });
			progress('sef-loaded');
			loaded({ fileData, sef, metaData, errors: [], entryPath, files });
		} catch (projectError) {
			if (isCompilationCancelled(projectError)) return;

			error({
				fileData: createSyntheticFileData('XSLT project'),
				sef: null,
				metaData: {},
				errors: [getErrorMessage(projectError)]
			});
		}
	}

	async function compileXslt(payload: {
		contents: string;
		entryPath?: string;
		files?: ParsedXsltProjectResult['files'];
	}): Promise<unknown> {
		const { body, contentType } = createCompileRequest(payload);
		const controller = new AbortController();
		let abortReason: 'cancel' | 'timeout' | null = null;
		const timeout = setTimeout(() => {
			if (controller.signal.aborted) return;

			abortReason = 'timeout';
			controller.abort();
		}, 120_000);
		const cancel = () => {
			if (controller.signal.aborted) return;

			abortReason = 'cancel';
			controller.abort();
		};
		setActiveCancel(cancel);

		try {
			const resp = await fetch('/api/compile-xslt-to-sef', {
				method: 'POST',
				headers: {
					'Content-Type': contentType
				},
				body,
				signal: controller.signal
			});

			const json = await resp.json();
			if (!resp.ok || json.status !== 'success') {
				throw new Error(json.error ?? `XSLT compilation failed with HTTP ${resp.status}`);
			}

			return json.sef;
		} catch (compileError) {
			if (controller.signal.aborted) {
				if (abortReason === 'cancel') throw new XsltCompilationCancelled();
				throw new Error('XSLT compilation timed out after 120 seconds.');
			}

			throw compileError;
		} finally {
			clearTimeout(timeout);
			clearActiveCancel(cancel);
		}
	}

	function createCompileRequest(payload: {
		contents: string;
		entryPath?: string;
		files?: ParsedXsltProjectResult['files'];
	}) {
		return payload.files && payload.files.length > 1
			? {
					body: JSON.stringify({ entryPath: payload.entryPath, files: payload.files }),
					contentType: 'application/json'
				}
			: { body: payload.contents, contentType: 'text/plain' };
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

	function getErrorMessage(errorValue: unknown) {
		return errorValue instanceof Error ? errorValue.message : String(errorValue);
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
