<script lang="ts">
	/*
		A button component that provides a filepicker restricted to XSLT
		files. Selection of the file by the user triggers the file to be
		loaded as XSLT (XML) it then compiles it to a sef file (used by 
		SaxonJS).
		The compile bit happens in an API POST to /api/sef with the 
		XSLTString as the body. A loaded event is then dispatched to the 
		calling button containing the fileData, Sef Object, metadata (it
		parses the first XML comment for key pair values) and an array of
		any errors

		The button can be styled by passing in a button to the slot e.g

	<OpenXSLTFileButton loaded={(payload) => console.log(payload)}>
		{#snippet children(openFile)}
			<button class="p-1 mr-2" onclick={openFile}>Load</button>
		{/snippet}
	</OpenXSLTFileButton>
	*/
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

	let { children, started, error, loaded }: FileButtonWithErrorProps<LoadedPayload, ErrorPayload> =
		$props();

	async function handleFileOpen() {
		const xmlFile = await selectParsedXmlFile({ accept: '.xsl, .xslt', started });
		if (!xmlFile) return;

		const { fileData, contents, metaData, errors } = xmlFile;

		if (errors.length > 0) {
			error?.({ fileData, sef: null, metaData, errors });
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
		loaded?.({ fileData, sef: json.sef, metaData, errors: [] });
	}
</script>

{#if children}
	{@render children(handleFileOpen)}
{:else}
	<button type="button" onclick={handleFileOpen}>Open XSLT File</button>
{/if}
