<script lang="ts">
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	import { getPanelStatus } from '$lib/Tei/panel-status.js';
	import TeiStore from '$lib/stores/tei-store.js';
	import OpenXMLFileButton from '$lib/UI/FileButtons/OpenXMLFileButton.svelte';
	import OpenXmlInBrowser from '$lib/UI/FileButtons/OpenXMLInBrowser.svelte';

	interface Props {
		title?: string;
	}

	let { title = '' }: Props = $props();
	let isLoading = $state(false);

	// <!-- TODO: Add in TEI SUMMARY e.g Is image section populated, how many images, is basic metatdata complete -->
	// Visual component to allow loading of a TEI XML document

	const noTeiLoaded = $derived(!$TeiStore?.xmlDoc && !$TeiStore?.fileData);
	const status = $derived(getPanelStatus(!!$TeiStore?.errors?.length, !!$TeiStore?.xmlDoc));
</script>

<div
	class="tool-panel {status == 'ERROR' ? 'tool-panel--error' : ''} {status == 'SUCCESS'
		? 'tool-panel--success'
		: ''}"
>
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<p class="tool-panel__title tool-panel__title--file">
			{#if title}<span class="tool-panel__details-label">{`${title}: `}</span>{/if}{$TeiStore
				?.fileData?.basename || ''}
		</p>
		<div>
			<OpenXmlInBrowser xmlDoc={$TeiStore?.xmlDoc} tabName="teixml" />

			<OpenXMLFileButton
				started={() => {
					isLoading = true;
					TeiStore.clear();
				}}
				loaded={(payload) => {
					$TeiStore = payload;
					isLoading = false;
				}}
				error={(payload) => {
					$TeiStore = payload;
					isLoading = false;
				}}
			>
				{#snippet children(openFile)}
					<button type="button" class="tool-panel__button" onclick={openFile}>Load</button>
				{/snippet}
			</OpenXMLFileButton>

			<button class="tool-panel__button" onclick={() => TeiStore.clear()}>Clear</button>
		</div>
	</div>
	<!-- Panel Body -->
	<div class="tool-panel__body tool-panel__body--text">
		{#if isLoading}
			<div class="tool-panel__loading">
				<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
			</div>
		{:else}
			{#if noTeiLoaded}
				<p class="tool-panel__empty">No TEI XML loaded</p>
			{/if}
			{#if $TeiStore?.fileData && Object.keys($TeiStore?.fileData).length > 1}
				<p class="tool-panel__section-title">File details</p>
				<div class="tool-panel__details">
					{#each Object.entries($TeiStore?.fileData) as [key, value] (key)}
						<p><span class="tool-panel__details-label">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if $TeiStore?.metaData && Object.keys($TeiStore?.metaData).length > 1}
				<p class="tool-panel__section-title">Metadata</p>
				<div class="tool-panel__details">
					{#each Object.entries($TeiStore?.metaData) as [key, value] (key)}
						<p><span class="tool-panel__details-label">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if $TeiStore?.errors && $TeiStore?.errors.length > 0}
				<p class="tool-panel__section-title tool-panel__section-title--error">Parsing errors</p>
				<div class="tool-panel__error-details">
					{#each $TeiStore?.errors as error, index (index)}
						<p>{error}</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
