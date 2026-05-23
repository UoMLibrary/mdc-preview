<script lang="ts">
	/*
		A button component that provides a filepicker restricted to JSON
		files. Selection of the file by the user triggers the file to be
		loaded as JSON and a loaded event is dispatched to the calling
		button containing the fileSize, Name and a JavaScipt Object
		representing the JSON file contents

		The button can be styled by passing in a button to the slot e.g

	<OpenJsonFileButton loaded={(payload) => ConfigStore.loadJson(payload.json)}>
		{#snippet children(openFile)}
			<button class="p-1 mr-2" onclick={openFile}>Load</button>
		{/snippet}
	</OpenJsonFileButton>
*/

	import { selectTextFile, type FileButtonProps, type FileData } from './file-button-utils.js';

	type LoadedPayload = { fileData: FileData; json: unknown };

	let { children, started, loaded }: FileButtonProps<LoadedPayload> = $props();

	async function handleFileOpen() {
		const fileResult = await selectTextFile({ accept: '.json', started });
		if (!fileResult) return;

		// TODO: Deal with errors by dispatching an error event
		const json = JSON.parse(fileResult.contents);
		loaded?.({ fileData: fileResult.fileData, json });
	}
</script>

{#if children}
	{@render children(handleFileOpen)}
{:else}
	<button type="button" onclick={handleFileOpen}>Open Json File</button>
{/if}
