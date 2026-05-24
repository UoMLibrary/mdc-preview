<script lang="ts">
	import { downloadTextFile, type SaveFileButtonProps } from './file-button-utils.js';

	interface Props extends SaveFileButtonProps {
		xmlDoc?: XMLDocument;
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
