<script lang="ts">
	/* 
		A button component that takes an XML object and fileName
		as attributes. When clicked the XML object is stringified
		and downloaded to the users device using the suggested
		filename.
		
		The button can be styled by passing in a button to the slot e.g

	<SaveXMLFileButton xmlDoc={$XMLStore} fileName="myfile.xml">
		{#snippet children(saveFile)}
			<button class="p-1 mr-2" onclick={saveFile}>Save</button>
		{/snippet}
	</SaveXMLFileButton>
*/

	import type { Snippet } from 'svelte';

	type SaveFile = () => void;

	interface Props {
		xmlDoc?: XMLDocument;
		fileName?: string;
		children?: Snippet<[SaveFile]>;
		started?: () => void;
		saved?: (payload: { fileName: string }) => void;
	}

	let { xmlDoc, fileName = 'data.xml', children, started, saved }: Props = $props();

	// Download to users device
	function handleSave() {
		if (!xmlDoc?.documentElement) return;

		started?.();
		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);
		const blob = new Blob([xmlString], { type: 'text/xml' });
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
	<button type="button" onclick={handleSave}>Save XML File</button>
{/if}
