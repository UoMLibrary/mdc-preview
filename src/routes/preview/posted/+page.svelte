<script>
	import { onMount } from 'svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import { createViewModel } from '$lib/Tei/createViewModel.js';
	import { cleanOutFacsimileElement, previewConfigData } from '$lib/Tei/preview-utils.js';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	// We load the sef when the page is loaded, this preview page doen't need to react to
	// live updates in the sef files
	import { sef as preTransformSef } from '../preTransform.sef.json';
	import { sef as jsonTransformSef } from '../JSONTransform.sef.json';

	// Variables
	let { form } = $props();
	let xmlString = $state();
	let ViewModelOutput = $state();
	let page = $state(0);
	let loading = $state(true);

	onMount(async () => {
		loading = true;

		// Bugfix: Clean up supplied XmlString
		xmlString = cleanOutFacsimileElement(form?.teistring);

		// Pre transform
		let transformConfig = {
			sourceText: xmlString,
			destination: 'serialized',
			stylesheetInternal: preTransformSef
		};
		let preTransformObj = await SaxonJS.transform(transformConfig, 'async');
		let preTransformXmlString = preTransformObj.principalResult;

		// JsonTransform
		transformConfig = {
			sourceText: preTransformXmlString,
			destination: 'serialized',
			stylesheetInternal: jsonTransformSef
		};
		let JsonTransformObj = await SaxonJS.transform(transformConfig, 'async');
		let JSONTransformObjOutput = JSON.parse(JsonTransformObj.principalResult);

		// Viewmodel creation
		ViewModelOutput = createViewModel(JSONTransformObjOutput, previewConfigData.manchester);

		loading = false;
	});

	// Handle page navigation from Preview internal components.
	function changePage(nextPage) {
		page = nextPage;
	}
</script>

<div class="p-4 bg-slate-300 pb-32 min-h-screen">
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
		<div class="flex justify-center">
			<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
		</div>
	{/if}
</div>
