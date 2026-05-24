<script lang="ts">
	import SefStore from '$lib/stores/sef-store.js';
	import { getPanelStatus } from '$lib/Tei/panel-status.js';
	import OpenXsltFileButton from '$lib/UI/FileButtons/OpenXSLTFileButton.svelte';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';
	import type { PreviewSefId } from '$lib/Tei/preview-sef-ids.js';
	import type { SefItem } from '$lib/stores/sef-store.js';

	interface Props {
		title?: string;
		sefId: PreviewSefId;
	}

	let { title = '', sefId }: Props = $props();
	let isLoading = $state(false);

	const sefData = $derived($SefStore?.[sefId]);
	const noXSLTLoaded = $derived(!sefData?.sef && !sefData?.fileData);
	const status = $derived(getPanelStatus(!!sefData?.errors?.length, !!sefData?.sef));
</script>

<div
	class="tool-panel {status == 'ERROR' ? 'tool-panel--error' : ''} {status == 'SUCCESS'
		? 'tool-panel--success'
		: ''}"
>
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<p class="tool-panel__title tool-panel__title--file">
			<span class="tool-panel__details-label">{title}: </span>{sefData?.fileData?.basename || ''}
		</p>

		<div class="tool-panel__actions">
			<OpenXsltFileButton
				label="Load XSLT"
				started={() => {
					SefStore.clearKeyValue(sefId);
					isLoading = true;
				}}
				loaded={(payload) => {
					SefStore.setKeyValue(sefId, payload as SefItem);
					isLoading = false;
				}}
				error={(payload) => {
					SefStore.setKeyValue(sefId, payload as SefItem);
					isLoading = false;
				}}
			/>

			<OpenJsonFileButton
				label="Load SEF"
				started={() => {
					isLoading = true;
				}}
				loaded={(payload) => {
					SefStore.setKeyValue(sefId, payload.json as SefItem);
					isLoading = false;
				}}
			/>

			{#if sefData?.sef}
				<SaveJsonFileButton label="Save SEF" fileName={`${sefId}.sef.json`} jsonData={sefData} />
			{/if}

			<button class="tool-panel__button" onclick={() => SefStore.clearKeyValue(sefId)}>Clear</button
			>
		</div>
	</div>
	<!-- Panel Body -->
	<div class="tool-panel__body tool-panel__body--text">
		{#if isLoading}
			<div class="tool-panel__loading">
				<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
			</div>
		{:else}
			{#if noXSLTLoaded}
				<p class="tool-panel__empty">No TEI XML loaded</p>
			{/if}
			{#if sefData?.fileData && Object.keys(sefData?.fileData).length > 1}
				<p class="tool-panel__section-title">File details</p>
				<div class="tool-panel__details">
					{#each Object.entries(sefData?.fileData) as [key, value] (key)}
						<p><span class="tool-panel__details-label">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.metaData && Object.keys(sefData.metaData).length > 1}
				<p class="tool-panel__section-title">Metadata</p>
				<div class="tool-panel__details">
					{#each Object.entries(sefData.metaData) as [key, value] (key)}
						<p><span class="tool-panel__details-label">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.errors && sefData.errors.length > 0}
				<p class="tool-panel__section-title tool-panel__section-title--error">Parsing errors</p>
				<div class="tool-panel__error-details">
					{#each sefData.errors as error, index (index)}
						<p>{error}</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
