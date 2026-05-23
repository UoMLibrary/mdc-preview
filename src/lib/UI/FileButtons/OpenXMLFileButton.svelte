<script>
	/*
		A button component that provides a filepicker restricted to XML
		files. Selection of the file by the user triggers the file to be
		loaded as XML and a loaded event is dispatched to the calling
		button containing the fileSize, Name and a JavaScipt Object
		representing the XML file contents

		The button can be styled by passing in a button to the slot e.g

	<OpenXMLFileButton let:openFile on:loaded={(e) => console.log(e.detail.xml)}>
		<button class="p-1 mr-2" on:click={openFile}>Load</button>
	</OpenXMLFileButton>

		It passes the xml object, fileData (size,name etc) and parses the first XML
		comment for key pair values
	*/
	import { parseFirstXMLComment } from '$lib/Utils/xmlutils.js';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleFileOpen() {
		let xmlString = '';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.xml';

		fileInput.addEventListener('change', function handleChange(event) {
			dispatch('started');
			const file = event.target.files[0];
			const reader = new FileReader();

			reader.onload = function () {
				xmlString = reader.result;

				let parser = new DOMParser();
				let parsererrorNS = parser
					.parseFromString('INVALID', 'application/xml')
					.getElementsByTagName('parsererror')[0].namespaceURI;
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
					let errors = [];
					const parserErrorArray = Array.from(
						xmlDoc.getElementsByTagNameNS(parsererrorNS, 'parsererror')
					);
					parserErrorArray.forEach((errDoc) => {
						const divElement = errDoc.querySelector('div');
						if (divElement?.textContent) errors.push(divElement?.textContent);
					});
					dispatch('error', { fileData, xmlDoc: null, metaData, errors });
				} else {
					// Dispatch a loaded event with the file details, xml and metadata
					dispatch('loaded', { fileData, xmlDoc: xmlDoc, metaData, errors: [] });
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

<slot openFile={handleFileOpen}>
	<button type="button" on:click={handleFileOpen}>Open XML File</button>
</slot>
