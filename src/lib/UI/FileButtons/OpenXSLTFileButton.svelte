<script lang="ts">
	import {
		selectParsedXmlFile,
		type FileButtonWithErrorProps,
		type XmlFilePayloadBase
	} from './file-button-utils.js';

	interface ErrorPayload extends XmlFilePayloadBase {
		sef: null;
	}

	interface LoadedPayload extends XmlFilePayloadBase {
		sef: unknown;
	}

	const ignoreLoaded = (_payload: LoadedPayload) => {};
	const ignoreError = (_payload: ErrorPayload) => {};

	let {
		label = 'Load XSLT',
		started,
		error = ignoreError,
		loaded = ignoreLoaded
	}: FileButtonWithErrorProps<LoadedPayload, ErrorPayload> = $props();

	async function handleFileOpen() {
		const xmlFile = await selectParsedXmlFile({ accept: '.xsl, .xslt', started });
		if (!xmlFile) return;

		const { fileData, contents, metaData, errors } = xmlFile;

		if (errors.length > 0) {
			error({ fileData, sef: null, metaData, errors });
			return;
		}

		// POST xmlString to api to convert to sef file used by SaxonJS
		const resp = await fetch('/api/sef', {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain'
			},
			body: contents
		});
		// TODO: Capture errors from sef transform here and dispatch as error
		const json = await resp.json();
		loaded({ fileData, sef: json.sef, metaData, errors: [] });
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleFileOpen}>{label}</button>
