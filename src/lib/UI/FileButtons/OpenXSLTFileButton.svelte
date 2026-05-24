<script lang="ts">
	import { selectParsedXmlFile, type XmlFilePayloadBase } from './file-button-utils.js';

	interface ErrorPayload extends XmlFilePayloadBase {
		sef: null;
	}

	interface LoadedPayload extends XmlFilePayloadBase {
		sef: unknown;
	}

	interface Props {
		label?: string;
		started?: () => Promise<void> | void;
		loaded?: (payload: LoadedPayload) => void;
		error?: (payload: ErrorPayload) => void;
	}

	const ignoreSefLoaded = (_payload: LoadedPayload) => {};
	const ignoreSefError = (_payload: ErrorPayload) => {};

	let {
		label = 'Load XSLT',
		started,
		loaded = ignoreSefLoaded,
		error = ignoreSefError
	}: Props = $props();

	async function handleFileOpen() {
		const xmlFile = await selectParsedXmlFile({ accept: '.xsl, .xslt', started });
		if (!xmlFile) return;

		const { fileData, contents, metaData, errors } = xmlFile;

		if (errors.length > 0) {
			error({ fileData, sef: null, metaData, errors });
			return;
		}

		// POST XSLT to the API to compile a SEF file used by SaxonJS.
		const resp = await fetch('/api/compile-xslt-to-sef', {
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
