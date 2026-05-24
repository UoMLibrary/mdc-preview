<script lang="ts">
	// Visual component to allow handling XML (save, view, open in new window)
	import { browser } from '$app/environment';

	import SaveXMLFileButton from '$lib/UI/FileButtons/SaveXMLFileButton.svelte';
	import OpenXmlInBrowser from '$lib/UI/FileButtons/OpenXMLInBrowser.svelte';

	interface Props {
		xmlDoc?: XMLDocument | null;
		title?: string;
		saveFile?: string;
		message?: string;
	}

	let { xmlDoc, title = '', saveFile = 'data.xml', message = '' }: Props = $props();

	const xmlString = $derived(stringifyXmlDoc(xmlDoc));

	function stringifyXmlDoc(_xmlDoc?: XMLDocument | null) {
		if (browser && _xmlDoc) {
			let xmlString = new XMLSerializer().serializeToString(_xmlDoc.documentElement);
			return xmlString;
		} else return '';
	}
</script>

<div class="tool-panel">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
		<div>
			<OpenXmlInBrowser {xmlDoc} tabName="preoutput" />

			{#if xmlDoc}
				<SaveXMLFileButton label="Save" {xmlDoc} fileName={saveFile} />
			{/if}

			<!-- <button class="tool-panel__button" onclick={clear}>Clear</button> -->
		</div>
	</div>
	<!-- Panel Body -->
	<div class="tool-panel__body">
		{#if xmlString}
			<pre class="tool-panel__xml-output">{xmlString}</pre>
		{:else}
			<div class="tool-panel__message">{message}</div>
		{/if}
	</div>
</div>
