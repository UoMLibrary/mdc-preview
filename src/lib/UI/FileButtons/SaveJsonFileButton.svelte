<script lang="ts">
	/* 
		A button component that takes a Javascript object and fileName
		as attributes. When clicked the JavaScript object is stringified
		to JSON and downloaded to the users device using the suggested
		filename.
		
		The button can be styled by passing in a button to the slot e.g

	<SaveJsonFileButton jsonData={$ConfigStore} fileName="config.json">
		{#snippet children(saveFile)}
			<button class="p-1 mr-2" onclick={saveFile}>Save</button>
		{/snippet}
	</SaveJsonFileButton>
*/

	import { downloadTextFile, type SaveFileButtonProps } from './file-button-utils.js';

	interface Props extends SaveFileButtonProps {
		jsonData: unknown;
	}

	let { jsonData, fileName = 'data.json', children, started, saved }: Props = $props();

	// Download to users device
	function handleSave() {
		started?.();
		const jsonDataString = JSON.stringify(jsonData, null, 2);
		downloadTextFile(jsonDataString, fileName, 'application/json');

		// TODO: Check for errors
		saved?.({ fileName });
	}
</script>

{#if children}
	{@render children(handleSave)}
{:else}
	<button type="button" onclick={handleSave}>Save JSON File</button>
{/if}
