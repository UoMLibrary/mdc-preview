<script>
	/* 
		A button component that takes an XML object and fileName
		as attributes. When clicked the XML object is stringified
		and downloaded to the users device using the suggested
		filename.
		
		The button can be styled by passing in a button to the slot e.g

	<SaveXMLFileButton let:saveFile xml={$XMLStore} fileName="myfile.xml">
		<button class="p-1 mr-2" on:click={saveFile}>Save</button>
	</SaveXMLFileButton>
*/

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let xmlDoc;
	export let fileName = 'data.xml';

	// Download to users device
	function handleSave() {
		dispatch('started');
		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);
		const blob = new Blob([xmlString], { type: 'text/xml' });
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
	<button type="button" on:click={handleSave}>Save XML File</button>
</slot>
