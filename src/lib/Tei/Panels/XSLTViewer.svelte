<script>
	import SefStore from '$lib/stores/sef-store.js';
	import OpenXsltFileButton from '$lib/UI/FileButtons/OpenXSLTFileButton.svelte';
	import { Moon } from 'svelte-loading-spinners';

	import Modal from '$lib/UI/MarkdownModal.svelte';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';
	let showModal = false;

	export let markdownHelp;
	export let title = '';
	export let sefId = '';
	let isLoading = false;

	$: sefData = $SefStore?.[sefId];
	$: noXSLTLoaded = !sefData?.sef && !sefData?.fileData;
	$: status = getStatus(sefData);

	function getStatus(_sefData) {
		if (_sefData?.sef && _sefData?.errors?.length == 0) {
			status = 'SUCCESS';
		} else if (_sefData?.errors?.length > 0) {
			status = 'ERROR';
		} else status = '';

		return status;
	}
</script>

<div
	class="rounded-md bg-white mb-4 text-xs {status == 'ERROR' ? `border-4 border-red-400` : ''} 
	{status == 'SUCCESS' ? `border-4 border-green-600` : ''}"
>
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<p class="p-1 px-2 text-sm w-1/2">
			<span class="font-bold">{title}: </span>{sefData?.fileData?.basename || ''}
		</p>

		<div class="p-1">
			<OpenXsltFileButton
				let:openFile={openXsltFile}
				on:started={(e) => {
					SefStore.clearKeyValue(sefId);
					isLoading = true;
				}}
				on:loaded={(e) => {
					SefStore.setKeyValue(sefId, e.detail);
					isLoading = false;
				}}
				on:error={(e) => {
					SefStore.setKeyValue(sefId, e.detail);
					isLoading = false;
				}}
				><button type="button" class="p-1 mr-2" on:click={openXsltFile}>Load XSLT</button>
			</OpenXsltFileButton>

			<OpenJsonFileButton
				let:openFile={openSefFile}
				on:started={(e) => (isLoading = true)}
				on:loaded={(e) => {
					SefStore.setKeyValue(sefId, e.detail.json);
					isLoading = false;
				}}
				><button type="button" class="p-1 mr-2" on:click={openSefFile}>Load SEF</button
				></OpenJsonFileButton
			>

			{#if sefData?.sef}
				<SaveJsonFileButton let:saveFile fileName={`${sefId}.sef.json`} jsonData={sefData}>
					<button type="button" class="p-1 mr-2" on:click={saveFile}>Save SEF</button>
				</SaveJsonFileButton>
			{/if}

			<button class="p-1 mr-2" on:click={(e) => SefStore.clearKeyValue(sefId)}>Clear</button>

			{#if markdownHelp}
				<button
					class="w-4 h-4 mr-2 bg-gray-400 rounded-full text-white text-center text-xs"
					on:click={(e) => (showModal = true)}>?</button
				>
			{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4 text-xs pb-2">
		{#if isLoading}
			<div class="flex justify-center">
				<Moon size="30" unit="px" duration="2s" color="purple" />
			</div>
		{:else}
			{#if noXSLTLoaded}
				<p class="p-1">No TEI XML loaded</p>
			{/if}
			{#if sefData?.fileData && Object.keys(sefData?.fileData).length > 1}
				<p class="text-sm font-bold p-1">File details</p>
				<div class="mb-2 px-2">
					{#each Object.entries(sefData?.fileData) as [key, value]}
						<p><span class="font-bold">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.metaData && Object.keys(sefData.metaData).length > 1}
				<p class="text-sm font-bold p-1">Metadata</p>
				<div class="mb-2 px-2">
					{#each Object.entries(sefData.metaData) as [key, value]}
						<p><span class="font-bold">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.errors && sefData.errors.length > 0}
				<p class="text-sm font-bold p-1 text-red-800">Parsing errors</p>
				<div class="mb-2 px-2 text-red-800 font-mono">
					{#each sefData.errors as error}
						<p>{error}</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<Modal bind:showModal {title} markdown={markdownHelp} />
