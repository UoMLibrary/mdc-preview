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

	import { downloadTextFile, type SaveFileButtonProps } from './file-button-utils.js';

	interface Props extends SaveFileButtonProps {
		xmlDoc?: XMLDocument;
	}

	let { xmlDoc, fileName = 'data.xml', children, started, saved }: Props = $props();

	// Download to users device
	function handleSave() {
		if (!xmlDoc?.documentElement) return;

		started?.();
		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);
		downloadTextFile(xmlString, fileName, 'text/xml');

		// TODO: Check for errors
		saved?.({ fileName });
	}
</script>

{#if children}
	{@render children(handleSave)}
{:else}
	<button type="button" onclick={handleSave}>Save XML File</button>
{/if}
