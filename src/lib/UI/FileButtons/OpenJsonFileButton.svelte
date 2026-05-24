<script lang="ts">
	import { selectTextFile, type FileData } from './file-button-utils.js';

	type LoadedPayload = { fileData: FileData; json: unknown };

	interface Props {
		label?: string;
		started?: () => Promise<void> | void;
		loaded?: (payload: LoadedPayload) => void;
	}

	let { label = 'Load', started, loaded }: Props = $props();

	async function handleFileOpen() {
		const fileResult = await selectTextFile({ accept: '.json', started });
		if (!fileResult) return;

		// TODO: Deal with errors by dispatching an error event
		const json = JSON.parse(fileResult.contents);
		loaded?.({ fileData: fileResult.fileData, json });
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleFileOpen}>{label}</button>
