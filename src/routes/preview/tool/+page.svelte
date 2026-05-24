<script lang="ts">
	// Stores
	import TeiStore from '$lib/stores/tei-store.js';
	import SefStore from '$lib/stores/sef-store.js';
	import ConfigStore from '$lib/stores/config-store.js';

	import {
		createPreviewViewModel,
		runPreviewJsonTransform,
		runPreviewPreTransform,
		type CudlObject,
		type PreviewConfig,
		type TransformDisplayError,
		type ViewModel
	} from '$lib/Tei/preview-pipeline.js';
	import { previewSefIds } from '$lib/Tei/preview-sef-ids.js';
	import type { SefItem } from '$lib/stores/sef-store.js';

	// Tool Panels and Preview
	import SourceTEI from '$lib/Tei/Panels/SourceTEI.svelte';
	import StylesheetCompilerPanel from '$lib/Tei/Panels/StylesheetCompilerPanel.svelte';
	import XMLViewerPanel from '$lib/Tei/Panels/XMLViewerPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import Config from '$lib/Tei/Panels/Config.svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';

	import SvgIcon from '$lib/UI/SvgIcon.svelte';
	import PrintPanel from '$lib/Tei/Panels/PrintPanel.svelte';

	let page = $state(0);
	let preTransformXmlDocOutput = $state<XMLDocument | null>(null); // the output of the preTransform (transient)
	let JSONTransformObjOutput = $state<CudlObject | null>(null); // the output of the JSON transform (transient)
	let ViewModelOutput = $state<ViewModel | null>(null); // output of the View model transform (transient)

	let PreTransformError = $state<TransformDisplayError | null>(null);
	let JSONtransformError = $state<TransformDisplayError | null>(null);

	$effect(() => {
		runPreTransform($TeiStore.xmlDoc, $SefStore?.[previewSefIds.preTransform]);
	});

	$effect(() => {
		runJSONTransform(preTransformXmlDocOutput, $SefStore?.[previewSefIds.jsonTransform]);
	});

	$effect(() => {
		runViewModelTransform(JSONTransformObjOutput, $ConfigStore);
	});

	async function runPreTransform(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		PreTransformError = null;
		const stylesheet = sefObj?.sef ? SefStore.getKeyCopy(previewSefIds.preTransform) : null;
		const result = await runPreviewPreTransform(xmlDoc, stylesheet);

		preTransformXmlDocOutput = result.value;
		PreTransformError = result.error;
	}

	async function runJSONTransform(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		JSONtransformError = null;
		const stylesheet = sefObj?.sef ? SefStore.getKeyCopy(previewSefIds.jsonTransform) : null;
		const result = await runPreviewJsonTransform(xmlDoc, stylesheet);

		JSONTransformObjOutput = result.value;
		JSONtransformError = result.error;
	}

	async function runViewModelTransform(cudlJson: CudlObject | null, configObj: PreviewConfig) {
		ViewModelOutput = createPreviewViewModel(cudlJson, configObj);
	}

	// Handle page navigation from Preview internal components.
	function changePage(nextPage: number) {
		page = nextPage;
	}
</script>

<div class="preview-workspace preview-workspace--compact">
	<!-- UI to load TEI XML file -->
	<SourceTEI title="Source TEI Document" />

	<!-- + symbol (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- Load a pre-filter stylesheet or precompiled SEF for SaxonJS. -->
	<StylesheetCompilerPanel title="Pre-filter stylesheet" sefId={previewSefIds.preTransform} />

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	{#if PreTransformError}
		<div class="preview-error">
			<p class="preview-error__line">
				<strong>{PreTransformError.name}</strong>
				<span class="preview-error__code">({PreTransformError.code})</span>
			</p>
			<p class="preview-error__line">{PreTransformError.message}</p>
			<pre class="preview-error__stack">{PreTransformError.stack}</pre>
		</div>
	{/if}

	<!-- XML Viewer that contains preFilter transform XSLT output -->
	<XMLViewerPanel
		title="XML output from Pre filter transformation"
		xmlDoc={preTransformXmlDocOutput}
		saveFile="preFilterOutput.xml"
		message="XML content generation requires TEI XML and preFiler XSLT to be configured"
	/>

	<!-- + symbol (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- Load a JSON transform stylesheet or precompiled SEF for SaxonJS. -->
	<StylesheetCompilerPanel title="JSON transform stylesheet" sefId={previewSefIds.jsonTransform} />

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	{#if JSONtransformError}
		<div class="preview-error">
			<p class="preview-error__line">
				<strong>{JSONtransformError.name}</strong>
				{#if JSONtransformError.code}<span class="preview-error__code"
						>({JSONtransformError.code})</span
					>{/if}
			</p>
			<p class="preview-error__line">{JSONtransformError.message}</p>
			<pre class="preview-error__stack">{JSONtransformError.stack}</pre>
		</div>
	{/if}

	<!-- JSON Viewer that contains JSONtransform XSLT output -->
	<JSONViewer
		jsonData={JSONTransformObjOutput}
		title="Cudl JSON output"
		savefile="jsonTransformOutput.json"
		message="JSON content generation requires Prefilter Output and JSON transform XSLT to be configured"
	/>

	<!-- + symbol (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- UI to specify url paths etc for transform into final JSON ViewModel -->
	<Config title="Configuration" />

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
	<JSONViewer
		jsonData={ViewModelOutput}
		title="View Model"
		savefile="viewmodel.json"
		message="View Model generation requires Cudl Output and Configuration be configured"
	/>

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	<!-- Print panel to give option of downloading a pdf of available images -->
	<PrintPanel title="Print pdf" data={ViewModelOutput?.pdfObj} />

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	<!-- Preview panel showing an example of the final viewer output, contains an embedded
		 Preview component. TODO: specify 'Preview' here to swap between a pure data view 
		 and a styled view for a particular organisation.  -->
	<PreviewPanel
		title="Preview"
		message="Preview generation requires a ViewModel to be set"
		viewModel={ViewModelOutput}
		{page}
		updatepage={changePage}
	/>

	<!-- Transcriptions/translations XSLT -->
</div>
