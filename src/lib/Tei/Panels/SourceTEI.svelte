<script>
	import Modal from '$lib/UI/MarkdownModal.svelte';
	import { Moon } from 'svelte-loading-spinners';

	import TeiStore from '$lib/stores/tei-store.js';
	import OpenXMLFileButton from '$lib/UI/FileButtons/OpenXMLFileButton.svelte';
	import OpenXmlInBrowser from '$lib/UI/FileButtons/OpenXMLInBrowser.svelte';

	let showModal = $state(false);

	let { title = '', markdownHelp } = $props();
	let isLoading = $state(false);

	// <!-- TODO: Add in TEI SUMMARY e.g Is image section populated, how many images, is basic metatdata complete -->
	// Visual component to allow loading of a TEI XML document

	const noTeiLoaded = $derived(!$TeiStore?.xmlDoc && !$TeiStore?.fileData);
	const status = $derived(getStatus($TeiStore));

	function getStatus(_teiData) {
		if (_teiData.xmlDoc && _teiData?.errors?.length == 0) {
			return 'SUCCESS';
		} else if (_teiData?.errors?.length > 0) {
			return 'ERROR';
		}
		return '';
	}
</script>

<div
	class="rounded-md bg-white mb-4 text-xs pb-1 {status == 'ERROR' ? `border-4 border-red-400` : ''} 
	{status == 'SUCCESS' ? `border-4 border-green-600` : ''}"
>
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<p class="p-1 px-2 text-sm w-1/2">
			{#if title}<span class="font-bold">{`${title}: `}</span>{/if}{$TeiStore?.fileData?.basename ||
				''}
		</p>
		<div>
			<OpenXmlInBrowser xmlDoc={$TeiStore?.xmlDoc} tabName="teixml" />

			<OpenXMLFileButton
				started={() => {
					isLoading = true;
					TeiStore.clear();
				}}
				loaded={(payload) => {
					isLoading = false;
					$TeiStore = payload;
				}}
				error={(payload) => {
					isLoading = false;
					$TeiStore = payload;
				}}
			>
				{#snippet children(openFile)}
					<button type="button" class="p-1 mr-2" onclick={openFile}>Load</button>
				{/snippet}
			</OpenXMLFileButton>

			<button class="p-1 mr-2" onclick={() => TeiStore.clear()}>Clear</button>

			<!-- Open help button -->
			{#if markdownHelp}
				<button
					class="w-4 h-4 mr-2 bg-gray-400 rounded-full text-white text-center text-xs"
					onclick={() => (showModal = true)}>?</button
				>
			{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4 text-xs">
		{#if isLoading}
			<div class="flex justify-center">
				<Moon size="30" unit="px" duration="2s" color="purple" />
			</div>
		{:else}
			{#if noTeiLoaded}
				<p class="  p-1">No TEI XML loaded</p>
			{/if}
			{#if $TeiStore?.fileData && Object.keys($TeiStore?.fileData).length > 1}
				<p class="text-sm font-bold p-1">File details</p>
				<div class="mb-2 px-2">
					{#each Object.entries($TeiStore?.fileData) as [key, value] (key)}
						<p><span class="font-bold">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if $TeiStore?.metaData && Object.keys($TeiStore?.metaData).length > 1}
				<p class="text-sm font-bold p-1">Metadata</p>
				<div class="mb-2 px-2">
					{#each Object.entries($TeiStore?.metaData) as [key, value] (key)}
						<p><span class="font-bold">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if $TeiStore?.errors && $TeiStore?.errors.length > 0}
				<p class="text-sm font-bold p-1 text-red-800">Parsing errors</p>
				<div class="mb-2 px-2 text-red-800 font-mono">
					{#each $TeiStore?.errors as error, index (index)}
						<p>{error}</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<Modal bind:showModal {title} markdown={markdownHelp} />
