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

	import type { Snippet } from 'svelte';

	interface FileData {
		basename: string;
		name: string;
		size: number;
		lastModified: Date;
		type: string;
	}

	type OpenFile = () => void;
	type LoadedPayload = { fileData: FileData; json: unknown };

	interface Props {
		children?: Snippet<[OpenFile]>;
		started?: () => void;
		loaded?: (payload: LoadedPayload) => void;
	}

	let { children, started, loaded }: Props = $props();

	function handleFileOpen() {
		let fileContents = '';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.json';

		fileInput.addEventListener('change', function handleChange(event: Event) {
			started?.();
			const file = (event.currentTarget as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();

			reader.onload = function () {
				fileContents = String(reader.result ?? '');
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
				loaded?.({ fileData, json });

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
	<button type="button" onclick={handleFileOpen}>Open Json File</button>
{/if}
