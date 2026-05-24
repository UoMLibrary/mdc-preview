<script lang="ts">
	import { downloadTextFile } from './file-button-utils.js';

	interface Props {
		jsonData: unknown;
		fileName?: string;
		label?: string;
	}

	let { jsonData, fileName = 'data.json', label = 'Save' }: Props = $props();

	// Download to users device
	function handleSave() {
		const jsonDataString = JSON.stringify(jsonData, null, 2);
		downloadTextFile(jsonDataString, fileName, 'application/json');
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleSave}>{label}</button>
