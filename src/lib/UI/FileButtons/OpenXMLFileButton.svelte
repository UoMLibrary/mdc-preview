<script lang="ts">
	import { selectParsedXmlFile, type XmlFilePayloadBase } from './file-button-utils.js';

	interface ErrorPayload extends XmlFilePayloadBase {
		xmlDoc: null;
	}

	interface LoadedPayload extends XmlFilePayloadBase {
		xmlDoc: XMLDocument;
	}

	interface Props {
		label?: string;
		started?: () => Promise<void> | void;
		error?: (payload: ErrorPayload) => void;
		loaded?: (payload: LoadedPayload) => void;
	}

	const ignoreLoaded = (_payload: LoadedPayload) => {};
	const ignoreError = (_payload: ErrorPayload) => {};

	let { label = 'Load', started, error = ignoreError, loaded = ignoreLoaded }: Props = $props();

	async function handleFileOpen() {
		const xmlFile = await selectParsedXmlFile({ accept: '.xml', started });
		if (!xmlFile) return;

		const { fileData, xmlDoc, metaData, errors } = xmlFile;

		if (errors.length > 0) {
			error({ fileData, xmlDoc: null, metaData, errors });
		} else {
			loaded({ fileData, xmlDoc, metaData, errors: [] });
		}
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleFileOpen}>{label}</button>
