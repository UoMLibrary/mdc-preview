<script lang="ts">
	/*
		A button component that provides a filepicker restricted to XML
		files. Selection of the file by the user triggers the file to be
		loaded as XML and a loaded event is dispatched to the calling
		button containing the fileSize, Name and a JavaScipt Object
		representing the XML file contents

		The button can be styled by passing in a button to the slot e.g

	<OpenXMLFileButton loaded={(payload) => console.log(payload.xmlDoc)}>
		{#snippet children(openFile)}
			<button class="tool-panel__button" onclick={openFile}>Load</button>
		{/snippet}
	</OpenXMLFileButton>

		It passes the xml object, fileData (size,name etc) and parses the first XML
		comment for key pair values
	*/
	import {
		noop,
		selectParsedXmlFile,
		type FileButtonWithErrorProps,
		type XmlFilePayloadBase
	} from './file-button-utils.js';

	interface ErrorPayload extends XmlFilePayloadBase {
		xmlDoc: null;
	}

	interface LoadedPayload extends XmlFilePayloadBase {
		xmlDoc: XMLDocument;
	}

	let {
		children,
		started = noop,
		error = noop,
		loaded = noop
	}: FileButtonWithErrorProps<LoadedPayload, ErrorPayload> = $props();

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

{#if children}
	{@render children(handleFileOpen)}
{:else}
	<button type="button" onclick={handleFileOpen}>Open XML File</button>
{/if}
