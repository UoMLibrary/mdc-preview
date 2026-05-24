<script lang="ts">
	import { downloadTextFile, type SaveFileButtonProps } from './file-button-utils.js';

	interface Props extends SaveFileButtonProps {
		jsonData: unknown;
	}

	let { jsonData, fileName = 'data.json', label = 'Save' }: Props = $props();

	// Download to users device
	function handleSave() {
		const jsonDataString = JSON.stringify(jsonData, null, 2);
		downloadTextFile(jsonDataString, fileName, 'application/json');
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleSave}>{label}</button>
