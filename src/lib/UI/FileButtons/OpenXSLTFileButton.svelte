<script>
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

	<OpenXSLTFileButton let:openFile on:loaded={(e) => console.log(e.detail)}>
		<button class="p-1 mr-2" on:click={openFile}>Load</button>
	</OpenXSLTFileButton>
	*/
	import { parseFirstXMLComment } from '$lib/Utils/xmlutils.js';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleFileOpen() {
		let xmlString = '';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.xsl, .xslt';

		fileInput.addEventListener('change', function handleChange(event) {
			dispatch('started');
			const file = event.target.files[0];
			const reader = new FileReader();

			reader.onload = async function () {
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
					dispatch('error', { fileData, sef: null, metaData, errors });
				} else {
					// POST xmlString to api to convert to sef file used by SaxtonJS
					// send the xsl string to be processed into a sef file
					let resp = await fetch('/api/sef', {
						method: 'POST',
						headers: {
							'Content-Type': 'text/plain'
						},
						body: xmlString
					});
					// TODO: Capture errors from sef transform here and dispatch as error
					let json = await resp.json();
					// Dispatch a loaded event with the file details, xml and metadata
					dispatch('loaded', { fileData, sef: json.sef, metaData, errors: [] });
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
	<button type="button" on:click={handleFileOpen}>Open XSLT File</button>
</slot>
