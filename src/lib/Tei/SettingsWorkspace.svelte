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
		type TransformProgressMessage,
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

	type StylesheetTransformStage = 'idle' | 'waiting-for-input' | 'transforming' | 'complete';
	interface TransformInputState {
		xmlDoc: XMLDocument | null | undefined;
		stylesheet: unknown;
	}

	let page = $state(0);
	let preTransformXmlDocOutput = $state<XMLDocument | null>(null); // the output of the preTransform (transient)
	let JSONTransformObjOutput = $state<CudlObject | null>(null); // the output of the JSON transform (transient)
	let ViewModelOutput = $state<ViewModel | null>(null); // output of the View model transform (transient)

	let PreTransformError = $state<TransformDisplayError | null>(null);
	let JSONtransformError = $state<TransformDisplayError | null>(null);
	let ViewModelError = $state<TransformDisplayError | null>(null);
	let preTransformStage = $state<StylesheetTransformStage>('idle');
	let jsonTransformStage = $state<StylesheetTransformStage>('idle');
	let preTransformMessages = $state<TransformProgressMessage[]>([]);
	let jsonTransformMessages = $state<TransformProgressMessage[]>([]);
	let preTransformRun = 0;
	let jsonTransformRun = 0;
	let previousPreTransformInput: TransformInputState | null = null;
	let previousJsonTransformInput: TransformInputState | null = null;

	$effect(() => {
		const xmlDoc = $TeiStore.xmlDoc;
		const sefObj = $SefStore?.[previewSefIds.preTransform];
		if (!hasTransformInputChanged(previousPreTransformInput, xmlDoc, sefObj?.sef)) return;

		previousPreTransformInput = { xmlDoc, stylesheet: sefObj?.sef };
		runPreTransform(xmlDoc, sefObj);
	});

	$effect(() => {
		const xmlDoc = preTransformXmlDocOutput;
		const sefObj = $SefStore?.[previewSefIds.jsonTransform];
		if (!hasTransformInputChanged(previousJsonTransformInput, xmlDoc, sefObj?.sef)) return;

		previousJsonTransformInput = { xmlDoc, stylesheet: sefObj?.sef };
		runJSONTransform(xmlDoc, sefObj);
	});

	$effect(() => {
		runViewModelTransform(JSONTransformObjOutput, $ConfigStore);
	});

	async function runPreTransform(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		const runId = ++preTransformRun;
		PreTransformError = null;
		preTransformStage = getTransformStartStage(xmlDoc, sefObj);
		preTransformMessages = [];

		try {
			const stylesheet = sefObj?.sef ? SefStore.getKeyCopy(previewSefIds.preTransform) : null;
			if (xmlDoc?.documentElement && stylesheet) preTransformStage = 'transforming';

			const result = await runPreviewPreTransform(xmlDoc, stylesheet, {
				progress: (message) => {
					if (runId !== preTransformRun) return;

					preTransformMessages = [...preTransformMessages.slice(-5), message];
				}
			});
			if (runId !== preTransformRun) return;

			preTransformXmlDocOutput = result.value;
			PreTransformError = result.error;
			preTransformStage = getTransformEndStage(result.value, result.error, xmlDoc, stylesheet);
		} catch (error) {
			if (runId !== preTransformRun) return;

			preTransformXmlDocOutput = null;
			PreTransformError = createDisplayError(error);
			preTransformStage = 'idle';
		}
	}

	async function runJSONTransform(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		const runId = ++jsonTransformRun;
		JSONtransformError = null;
		jsonTransformStage = getTransformStartStage(xmlDoc, sefObj);
		jsonTransformMessages = [];

		try {
			const stylesheet = sefObj?.sef ? SefStore.getKeyCopy(previewSefIds.jsonTransform) : null;
			if (xmlDoc?.documentElement && stylesheet) jsonTransformStage = 'transforming';

			const result = await runPreviewJsonTransform(xmlDoc, stylesheet, {
				progress: (message) => {
					if (runId !== jsonTransformRun) return;

					jsonTransformMessages = [...jsonTransformMessages.slice(-5), message];
				}
			});
			if (runId !== jsonTransformRun) return;

			JSONTransformObjOutput = result.value;
			JSONtransformError = result.error;
			jsonTransformStage = getTransformEndStage(result.value, result.error, xmlDoc, stylesheet);
		} catch (error) {
			if (runId !== jsonTransformRun) return;

			JSONTransformObjOutput = null;
			JSONtransformError = createDisplayError(error);
			jsonTransformStage = 'idle';
		}
	}

	async function runViewModelTransform(cudlJson: CudlObject | null, configObj: PreviewConfig) {
		ViewModelError = null;

		try {
			ViewModelOutput = createPreviewViewModel(cudlJson, configObj);
		} catch (error) {
			ViewModelOutput = null;
			ViewModelError = createDisplayError(error);
		}
	}

	// Handle page navigation from Preview internal components.
	function changePage(nextPage: number) {
		page = nextPage;
	}

	function createDisplayError(error: unknown): TransformDisplayError {
		if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

		const code = (error as Error & { code?: string | number }).code;
		return { name: error.name, message: error.message, stack: error.stack, code };
	}

	function hasTransformInputChanged(
		previousInput: TransformInputState | null,
		xmlDoc: XMLDocument | null | undefined,
		stylesheet: unknown
	) {
		if (!previousInput) return true;
		return previousInput.xmlDoc !== xmlDoc || previousInput.stylesheet !== stylesheet;
	}

	function getTransformStartStage(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	): StylesheetTransformStage {
		if (xmlDoc?.documentElement && sefObj?.sef) return 'transforming';
		if (sefObj?.sef) return 'waiting-for-input';
		return 'idle';
	}

	function getTransformEndStage<T>(
		value: T | null,
		error: TransformDisplayError | null,
		xmlDoc: XMLDocument | null | undefined,
		stylesheet: unknown
	): StylesheetTransformStage {
		if (error) return 'idle';
		if (value) return 'complete';
		if (stylesheet && !xmlDoc?.documentElement) return 'waiting-for-input';
		return 'idle';
	}
</script>

<div class="preview-workspace preview-workspace--compact settings-workspace">
	<!-- UI to load TEI XML file -->
	<SourceTEI title="Source TEI Document" />

	<!-- + symbol (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- Load a pre-filter stylesheet or precompiled SEF for SaxonJS. -->
	<StylesheetCompilerPanel
		title="Pre-filter stylesheet"
		sefId={previewSefIds.preTransform}
		runtimeError={PreTransformError}
		transformStage={preTransformStage}
		transformMessages={preTransformMessages}
	/>

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

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
	<StylesheetCompilerPanel
		title="JSON transform stylesheet"
		sefId={previewSefIds.jsonTransform}
		runtimeError={JSONtransformError}
		transformStage={jsonTransformStage}
		transformMessages={jsonTransformMessages}
	/>

	<!-- down arrow (decorative) -->
	<div class="preview-flow-marker">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

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

	{#if ViewModelError}
		<div class="preview-error">
			<p class="preview-error__line">
				<strong>{ViewModelError.name}</strong>
				{#if ViewModelError.code}<span class="preview-error__code">({ViewModelError.code})</span
					>{/if}
			</p>
			<p class="preview-error__line">{ViewModelError.message}</p>
			<pre class="preview-error__stack">{ViewModelError.stack}</pre>
		</div>
	{/if}

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
