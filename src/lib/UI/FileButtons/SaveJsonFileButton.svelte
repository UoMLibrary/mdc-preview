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

	import type { Snippet } from 'svelte';

	type SaveFile = () => void;

	interface Props {
		jsonData: unknown;
		fileName?: string;
		children?: Snippet<[SaveFile]>;
		started?: () => void;
		saved?: (payload: { fileName: string }) => void;
	}

	let { jsonData, fileName = 'data.json', children, started, saved }: Props = $props();

	// Download to users device
	function handleSave() {
		started?.();
		const jsonDataString = JSON.stringify(jsonData, null, 2);
		const blob = new Blob([jsonDataString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();

		// TODO: Check for errors
		saved?.({ fileName });

		// Clean up
		URL.revokeObjectURL(url);
		link.remove();
	}
</script>

{#if children}
	{@render children(handleSave)}
{:else}
	<button type="button" onclick={handleSave}>Save JSON File</button>
{/if}
