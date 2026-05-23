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
			<button class="p-1 mr-2" onclick={openFile}>Load</button>
		{/snippet}
	</OpenXMLFileButton>

		It passes the xml object, fileData (size,name etc) and parses the first XML
		comment for key pair values
	*/
	import { parseFirstXMLComment } from '$lib/Utils/xmlutils.js';
	import type { Snippet } from 'svelte';
	import type { parseFirstXMLComment as ParseFirstXMLComment } from '$lib/Utils/xmlutils.js';

	type MetaData = ReturnType<typeof ParseFirstXMLComment>;

	interface FileData {
		basename: string;
		name: string;
		size: number;
		lastModified: Date;
		type: string;
	}

	type OpenFile = () => void;
	type ErrorPayload = { fileData: FileData; xmlDoc: null; metaData: MetaData; errors: string[] };
	type LoadedPayload = {
		fileData: FileData;
		xmlDoc: XMLDocument;
		metaData: MetaData;
		errors: string[];
	};

	interface Props {
		children?: Snippet<[OpenFile]>;
		started?: () => void;
		error?: (payload: ErrorPayload) => void;
		loaded?: (payload: LoadedPayload) => void;
	}

	let { children, started, error, loaded }: Props = $props();

	function handleFileOpen() {
		let xmlString = '';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.xml';

		fileInput.addEventListener('change', function handleChange(event: Event) {
			started?.();
			const file = (event.currentTarget as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();

			reader.onload = function () {
				xmlString = String(reader.result ?? '');

				let parser = new DOMParser();
				let parsererrorNS =
					parser
						.parseFromString('INVALID', 'application/xml')
						.getElementsByTagName('parsererror')[0].namespaceURI ?? '';
				let xmlDoc = parser.parseFromString(xmlString, 'text/xml');

				// Get any metadata and filedata
				let metaData = parseFirstXMLComment(xmlString);
				let fileData = {
					basename: file.name.replace(/\.[^/.]+$/, ''), // filename without extension;
					name: file.name,
					size: file.size,
					lastModified: new Date(file.lastModified),
					type: file.type
				};

				// TODO: TEST FOR VALID XML - Error could be returned as HTML doc
				if (xmlDoc.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0) {
					let errors: string[] = [];
					const parserErrorArray = Array.from(
						xmlDoc.getElementsByTagNameNS(parsererrorNS, 'parsererror')
					);
					parserErrorArray.forEach((errDoc) => {
						const divElement = errDoc.querySelector('div');
						if (divElement?.textContent) errors.push(divElement?.textContent);
					});
					error?.({ fileData, xmlDoc: null, metaData, errors });
				} else {
					// Dispatch a loaded event with the file details, xml and metadata
					loaded?.({ fileData, xmlDoc: xmlDoc, metaData, errors: [] });
				}

				// Clean up
				fileInput.removeEventListener('change', handleChange);
				fileInput.remove();
			};
			reader.readAsText(file);
		});
		fileInput.click();
	}
</script>

{#if children}
	{@render children(handleFileOpen)}
{:else}
	<button type="button" onclick={handleFileOpen}>Open XML File</button>
{/if}
