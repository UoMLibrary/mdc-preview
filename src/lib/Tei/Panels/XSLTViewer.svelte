<script>
	import SefStore from '$lib/stores/sef-store.js';
	import { getPanelStatus } from '$lib/Tei/panel-status.js';
	import OpenXsltFileButton from '$lib/UI/FileButtons/OpenXSLTFileButton.svelte';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';

	let { title = '', sefId = '' } = $props();
	let isLoading = $state(false);

	const sefData = $derived($SefStore?.[sefId]);
	const noXSLTLoaded = $derived(!sefData?.sef && !sefData?.fileData);
	const status = $derived(getPanelStatus(!!sefData?.errors?.length, !!sefData?.sef));
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
				started={() => {
					SefStore.clearKeyValue(sefId);
					isLoading = true;
				}}
				loaded={(payload) => {
					SefStore.setKeyValue(sefId, payload);
					isLoading = false;
				}}
				error={(payload) => {
					SefStore.setKeyValue(sefId, payload);
					isLoading = false;
				}}
			>
				{#snippet children(openXsltFile)}
					<button type="button" class="p-1 mr-2" onclick={openXsltFile}>Load XSLT</button>
				{/snippet}
			</OpenXsltFileButton>

			<OpenJsonFileButton
				started={() => (isLoading = true)}
				loaded={(payload) => {
					SefStore.setKeyValue(sefId, payload.json);
					isLoading = false;
				}}
			>
				{#snippet children(openSefFile)}
					<button type="button" class="p-1 mr-2" onclick={openSefFile}>Load SEF</button>
				{/snippet}
			</OpenJsonFileButton>

			{#if sefData?.sef}
				<SaveJsonFileButton fileName={`${sefId}.sef.json`} jsonData={sefData}>
					{#snippet children(saveFile)}
						<button type="button" class="p-1 mr-2" onclick={saveFile}>Save SEF</button>
					{/snippet}
				</SaveJsonFileButton>
			{/if}

			<button class="p-1 mr-2" onclick={() => SefStore.clearKeyValue(sefId)}>Clear</button>
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4 text-xs pb-2">
		{#if isLoading}
			<div class="flex justify-center">
				<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
			</div>
		{:else}
			{#if noXSLTLoaded}
				<p class="p-1">No TEI XML loaded</p>
			{/if}
			{#if sefData?.fileData && Object.keys(sefData?.fileData).length > 1}
				<p class="text-sm font-bold p-1">File details</p>
				<div class="mb-2 px-2">
					{#each Object.entries(sefData?.fileData) as [key, value] (key)}
						<p><span class="font-bold">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.metaData && Object.keys(sefData.metaData).length > 1}
				<p class="text-sm font-bold p-1">Metadata</p>
				<div class="mb-2 px-2">
					{#each Object.entries(sefData.metaData) as [key, value] (key)}
						<p><span class="font-bold">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.errors && sefData.errors.length > 0}
				<p class="text-sm font-bold p-1 text-red-800">Parsing errors</p>
				<div class="mb-2 px-2 text-red-800 font-mono">
					{#each sefData.errors as error, index (index)}
						<p>{error}</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
