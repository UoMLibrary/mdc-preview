<script lang="ts">
	// Tool Panels and Preview
	import SourceTEI from '$lib/Tei/Panels/SourceTEI.svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';

	// Stores
	import TeiStore from '$lib/stores/tei-store.js';

	import { previewConfigData } from '$lib/Tei/preview-utils.js';
	import {
		createPreviewViewModel,
		runPreviewJsonTransform,
		runPreviewPreTransform,
		type CudlObject,
		type PreviewConfig,
		type ViewModel
	} from '$lib/Tei/preview-pipeline.js';

	// We load the sef when the page is loaded, this preview page doen't need to react to
	// live updates in the sef files
	import { sef as preTransformSef } from './preTransform.sef.json';
	import { sef as jsonTransformSef } from './JSONTransform.sef.json';

	let page = $state(0);
	let selectedOrg = $state('manchester');
	let selectedConfig = $derived(previewConfigData[selectedOrg]);

	let preTransformXmlDocOutput = $state<XMLDocument | null>(null); // the output of the preTransform (transient)
	let JSONTransformObjOutput = $state<CudlObject | null>(null); // the output of the JSON transform (transient)
	let ViewModelOutput = $state<ViewModel | null>(null); // output of the View model transform (transient)

	$effect(() => {
		runPreTransform($TeiStore.xmlDoc);
	});

	$effect(() => {
		runJSONTransform(preTransformXmlDocOutput);
	});

	$effect(() => {
		runViewModelTransform(JSONTransformObjOutput, selectedConfig);
	});

	async function runPreTransform(xmlDoc: XMLDocument | null | undefined) {
		const result = await runPreviewPreTransform(xmlDoc, preTransformSef);
		preTransformXmlDocOutput = result.value;
	}

	async function runJSONTransform(xmlDoc: XMLDocument | null | undefined) {
		const result = await runPreviewJsonTransform(xmlDoc, jsonTransformSef);
		JSONTransformObjOutput = result.value;
	}

	async function runViewModelTransform(
		cudlJson: CudlObject | null,
		config: PreviewConfig | undefined
	) {
		ViewModelOutput = createPreviewViewModel(cudlJson, config);
	}

	function selectConfig(org: string) {
		selectedOrg = org;
	}

	// Handle page navigation from Preview internal components.
	function changePage(nextPage: number) {
		page = nextPage;
	}
</script>

<div class="preview-workspace">
	<!-- UI to load TEI XML file -->
	<SourceTEI title="Source TEI Document" />
	<div class="preview-org-selector">
		<button
			class="preview-org-button {selectedOrg == 'cambridge' ? 'preview-org-button--selected' : ''}"
			onclick={() => selectConfig('cambridge')}>Cambridge</button
		>
		<button
			class="preview-org-button {selectedOrg == 'lancaster' ? 'preview-org-button--selected' : ''}"
			onclick={() => selectConfig('lancaster')}>Lancaster</button
		>
		<button
			class="preview-org-button {selectedOrg == 'manchester' ? 'preview-org-button--selected' : ''}"
			onclick={() => selectConfig('manchester')}>Manchester</button
		>
	</div>

	<!-- Preview panel showing an example of the final viewer output, contains an embedded
		 Preview component. TODO: specify 'Preview' here to swap between a pure data view 
		 and a styled view for a particular organisation.  -->
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
</div>
