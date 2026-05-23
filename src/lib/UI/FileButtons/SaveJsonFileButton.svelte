<script>
	/* 
		A button component that takes a Javascript object and fileName
		as attributes. When clicked the JavaScript object is stringified
		to JSON and downloaded to the users device using the suggested
		filename.
		
		The button can be styled by passing in a button to the slot e.g

	<SaveJsonFileButton let:saveFile jsonData={$ConfigStore} fileName="config.json">
		<button class="p-1 mr-2" on:click={saveFile}>Save</button>
	</SaveJsonFileButton>
*/

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let jsonData;
	export let fileName = 'data.json';

	// Download to users device
	function handleSave() {
		dispatch('started');
		const jsonDataString = JSON.stringify(jsonData, null, 2);
		const blob = new Blob([jsonDataString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();

		// TODO: Check for errors
		dispatch('saved', { fileName });

		// Clean up
		URL.revokeObjectURL(url);
		link.remove();
	}
</script>

<slot saveFile={handleSave}>
	<button type="button" on:click={handleSave}>Save JSON File</button>
</slot>
