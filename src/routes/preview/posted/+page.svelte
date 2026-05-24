<script lang="ts">
	import { onMount } from 'svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import { createViewModel } from '$lib/Tei/createViewModel.js';
	import type { ViewModel } from '$lib/Tei/createViewModel.js';
	import { previewConfigData } from '$lib/Tei/preview-utils.js';
	import { transformXmlDocToJson, transformXmlStringToXml } from '$lib/Tei/preview-transform.js';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	// We load the sef when the page is loaded, this preview page doen't need to react to
	// live updates in the sef files
	import { sef as preTransformSef } from '../preTransform.sef.json';
	import { sef as jsonTransformSef } from '../JSONTransform.sef.json';

	interface Props {
		form?: {
			teistring?: FormDataEntryValue | null;
		};
	}

	// Variables
	let { form }: Props = $props();
	let ViewModelOutput = $state<ViewModel | null>(null);
	let page = $state(0);
	let loading = $state(true);

	onMount(async () => {
		loading = true;

		const preTransform = await transformXmlStringToXml(
			String(form?.teistring ?? ''),
			preTransformSef,
			{
				cleanFacsimile: true
			}
		);
		const jsonTransform = await transformXmlDocToJson(preTransform.value, jsonTransformSef);

		// Viewmodel creation
		ViewModelOutput = jsonTransform.value
			? createViewModel(jsonTransform.value, previewConfigData.manchester)
			: null;

		loading = false;
	});

	// Handle page navigation from Preview internal components.
	function changePage(nextPage: number) {
		page = nextPage;
	}
</script>

<div class="preview-workspace">
	{#if !loading}
		<PreviewPanel
			title="Preview"
			message="Preview generation requires a TEI to be loaded"
			viewModel={ViewModelOutput}
			{page}
			updatepage={changePage}
		/>

		<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
		<JSONViewer
			jsonData={ViewModelOutput}
			title="View Model"
			savefile="viewmodel.json"
			message="View Model generation requires a TEI to be loaded"
		/>
	{:else}
		<div class="tool-panel__loading">
			<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
		</div>
	{/if}
</div>
