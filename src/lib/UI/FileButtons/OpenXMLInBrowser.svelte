<script lang="ts">
	// Open XML Doc button in a new browser tab. Defaults to hidden if there is no
	// valid xml doc
	interface Props {
		tabName?: string;
		xmlDoc?: XMLDocument | null;
	}

	let { tabName = '_blank', xmlDoc }: Props = $props();

	function openXMLInBrowser(xmlDoc: XMLDocument | null | undefined, tabName: string) {
		if (!xmlDoc?.documentElement) return;
		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);
		// Create a Blob URL from the XML content
		const blob = new Blob([xmlString], { type: 'text/xml' });
		const url = URL.createObjectURL(blob);
		window.open(url, tabName);
	}
</script>

{#if xmlDoc?.documentElement}
	<button class="tool-panel__button" onclick={() => openXMLInBrowser(xmlDoc, tabName)}
		>View XML</button
	>
{/if}
