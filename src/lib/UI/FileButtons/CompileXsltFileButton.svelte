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

	interface Props {
		label?: string;
		projectLabel?: string;
		preferredEntryNames?: string[];
		started?: () => Promise<void> | void;
		loaded?: (payload: LoadedPayload) => void;
		error?: (payload: ErrorPayload) => void;
	}

	const ignoreSefLoaded = (_payload: LoadedPayload) => {};
	const ignoreSefError = (_payload: ErrorPayload) => {};

	let {
		label = 'Load XSLT',
		projectLabel = 'Load XSLT project',
		preferredEntryNames = [],
		started,
		loaded = ignoreSefLoaded,
		error = ignoreSefError
	}: Props = $props();

	async function handleFileOpen() {
		try {
			const xmlFile = await selectParsedXmlFile({ accept: '.xsl, .xslt', started });
			if (!xmlFile) return;

			const { fileData, contents, metaData, errors } = xmlFile;

			if (errors.length > 0) {
				error({ fileData, sef: null, metaData, errors });
				return;
			}

			const sef = await compileXslt({ contents });
			loaded({ fileData, sef, metaData, errors: [] });
		} catch (compileError) {
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

			if (errors.length > 0) {
				error({ fileData, sef: null, metaData, errors });
				return;
			}

			const sef = await compileXslt({ contents, entryPath, files });
			loaded({ fileData, sef, metaData, errors: [], entryPath, files });
		} catch (projectError) {
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

		const resp = await fetch('/api/compile-xslt-to-sef', {
			method: 'POST',
			headers: {
				'Content-Type': contentType
			},
			body
		});

		const json = await resp.json();
		if (!resp.ok || json.status !== 'success') {
			throw new Error(json.error ?? `XSLT compilation failed with HTTP ${resp.status}`);
		}

		return json.sef;
	}

	function createCompileRequest(payload: {
		contents: string;
		entryPath?: string;
		files?: ParsedXsltProjectResult['files'];
	}) {
		return payload.files
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
</script>

<button type="button" class="tool-panel__button" onclick={handleFileOpen}>{label}</button>
<button type="button" class="tool-panel__button" onclick={handleProjectOpen}>{projectLabel}</button>
