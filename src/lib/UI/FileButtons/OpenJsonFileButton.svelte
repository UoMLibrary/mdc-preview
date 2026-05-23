<script>
	/*
		A button component that provides a filepicker restricted to JSON
		files. Selection of the file by the user triggers the file to be
		loaded as JSON and a loaded event is dispatched to the calling
		button containing the fileSize, Name and a JavaScipt Object
		representing the JSON file contents

		The button can be styled by passing in a button to the slot e.g

	<OpenJsonFileButton let:openFile on:loaded={(e) => ConfigStore.loadJson(e.detail.json)}>
		<button class="p-1 mr-2" on:click={openFile}>Load</button>
	</OpenJsonFileButton>
*/

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleFileOpen() {
		let fileContents = '';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.json';

		fileInput.addEventListener('change', function handleChange(event) {
			dispatch('started');
			const file = event.target.files[0];
			const reader = new FileReader();

			reader.onload = function () {
				fileContents = reader.result;
				let json = JSON.parse(fileContents);

				// TODO: Deal with errors by dispatching an error event
				// TODO: Remember to clean up after errors
				let fileData = {
					basename: file.name.replace(/\.[^/.]+$/, ''), // filename without extension;
					name: file.name,
					size: file.size,
					lastModified: new Date(file.lastModified),
					type: file.type
				};

				// Dispatch a loaded event with the file details
				dispatch('loaded', { fileData, json });

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
	<button type="button" on:click={handleFileOpen}>Open Json File</button>
</slot>
