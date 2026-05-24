<script lang="ts">
	import { downloadTextFile } from './file-button-utils.js';

	interface Props {
		xmlDoc?: XMLDocument;
		fileName?: string;
		label?: string;
	}

	let { xmlDoc, fileName = 'data.xml', label = 'Save' }: Props = $props();

	// Download to users device
	function handleSave() {
		const documentElement = xmlDoc?.documentElement;
		if (!documentElement) return;

		let xmlString = new XMLSerializer().serializeToString(documentElement);
		downloadTextFile(xmlString, fileName, 'text/xml');
	}
</script>

<button type="button" class="tool-panel__button" onclick={handleSave}>{label}</button>
