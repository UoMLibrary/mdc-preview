<script lang="ts">
	// Stores
	import TeiStore from '$lib/stores/tei-store.js';
	import SefStore from '$lib/stores/sef-store.js';
	import ConfigStore from '$lib/stores/config-store.js';
	import { createDisplayError } from '$lib/Tei/transform-errors.js';
	import {
		getStylesheetTransformEndStage,
		getTransformInputStage,
		runGuardedTransform,
		type TransformStage
	} from '$lib/Tei/transform-progress.js';

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

	interface TransformInputState {
		xmlDoc: XMLDocument | null | undefined;
		stylesheet: unknown;
	}

	interface TransformInputChange extends TransformInputState {
		sefObj: SefItem | null | undefined;
	}

	let page = $state(0);
	let preTransformXmlDocOutput = $state<XMLDocument | null>(null); // the output of the preTransform (transient)
	let JSONTransformObjOutput = $state<CudlObject | null>(null); // the output of the JSON transform (transient)
	let ViewModelOutput = $state<ViewModel | null>(null); // output of the View model transform (transient)

	let PreTransformError = $state<TransformDisplayError | null>(null);
	let JSONtransformError = $state<TransformDisplayError | null>(null);
	let ViewModelError = $state<TransformDisplayError | null>(null);
	let preTransformStage = $state<TransformStage>('idle');
	let jsonTransformStage = $state<TransformStage>('idle');
	let preTransformMessages = $state<TransformProgressMessage[]>([]);
	let jsonTransformMessages = $state<TransformProgressMessage[]>([]);
	let preTransformRun = 0;
	let jsonTransformRun = 0;
	let previousPreTransformInput: TransformInputState | null = null;
	let previousJsonTransformInput: TransformInputState | null = null;

	$effect(runPreTransformWhenInputChanges);
	$effect(runJsonTransformWhenInputChanges);

	$effect(() => {
		runViewModelTransform(JSONTransformObjOutput, $ConfigStore);
	});

	function runPreTransformWhenInputChanges() {
		const input = getPreTransformInput();
		if (!hasTransformInputChanged(previousPreTransformInput, input)) return;

		previousPreTransformInput = input;
		runPreTransform(input.xmlDoc, input.sefObj);
	}

	function runJsonTransformWhenInputChanges() {
		const input = getJsonTransformInput();
		if (!hasTransformInputChanged(previousJsonTransformInput, input)) return;

		previousJsonTransformInput = input;
		runJSONTransform(input.xmlDoc, input.sefObj);
	}

	function getPreTransformInput(): TransformInputChange {
		const sefObj = $SefStore?.[previewSefIds.preTransform];
		return { xmlDoc: $TeiStore.xmlDoc, stylesheet: sefObj?.sef, sefObj };
	}

	function getJsonTransformInput(): TransformInputChange {
		const sefObj = $SefStore?.[previewSefIds.jsonTransform];
		return { xmlDoc: preTransformXmlDocOutput, stylesheet: sefObj?.sef, sefObj };
	}

	async function runPreTransform(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		const runId = ++preTransformRun;
		const stylesheet = preparePreTransformRun(xmlDoc, sefObj);

		await runGuardedTransform({
			isStale: () => runId !== preTransformRun,
			run: () =>
				runPreviewPreTransform(xmlDoc, stylesheet, {
					progress: (message) => {
						if (runId !== preTransformRun) return;

						preTransformMessages = [...preTransformMessages.slice(-5), message];
					}
				}),
			applyResult: (result) => applyPreTransformResult(result, xmlDoc, stylesheet),
			applyError: applyPreTransformError
		});
	}

	async function runJSONTransform(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		const runId = ++jsonTransformRun;
		const stylesheet = prepareJsonTransformRun(xmlDoc, sefObj);

		await runGuardedTransform({
			isStale: () => runId !== jsonTransformRun,
			run: () =>
				runPreviewJsonTransform(xmlDoc, stylesheet, {
					progress: (message) => {
						if (runId !== jsonTransformRun) return;

						jsonTransformMessages = [...jsonTransformMessages.slice(-5), message];
					}
				}),
			applyResult: (result) => applyJsonTransformResult(result, xmlDoc, stylesheet),
			applyError: applyJsonTransformError
		});
	}

	function preparePreTransformRun(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		PreTransformError = null;
		preTransformStage = getStylesheetTransformStartStage(xmlDoc, sefObj);
		preTransformMessages = [];
		return getStylesheetCopy(previewSefIds.preTransform, sefObj);
	}

	function prepareJsonTransformRun(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	) {
		JSONtransformError = null;
		jsonTransformStage = getStylesheetTransformStartStage(xmlDoc, sefObj);
		jsonTransformMessages = [];
		return getStylesheetCopy(previewSefIds.jsonTransform, sefObj);
	}

	function applyPreTransformResult(
		result: Awaited<ReturnType<typeof runPreviewPreTransform>>,
		xmlDoc: XMLDocument | null | undefined,
		stylesheet: unknown
	) {
		preTransformXmlDocOutput = result.value;
		PreTransformError = result.error;
		preTransformStage = getStylesheetTransformEndStage(
			result.value,
			result.error,
			hasXmlDocument(xmlDoc),
			Boolean(stylesheet)
		);
	}

	function applyPreTransformError(error: unknown) {
		preTransformXmlDocOutput = null;
		PreTransformError = createDisplayError(error);
		preTransformStage = 'idle';
	}

	function applyJsonTransformResult(
		result: Awaited<ReturnType<typeof runPreviewJsonTransform>>,
		xmlDoc: XMLDocument | null | undefined,
		stylesheet: unknown
	) {
		JSONTransformObjOutput = result.value;
		JSONtransformError = result.error;
		jsonTransformStage = getStylesheetTransformEndStage(
			result.value,
			result.error,
			hasXmlDocument(xmlDoc),
			Boolean(stylesheet)
		);
	}

	function applyJsonTransformError(error: unknown) {
		JSONTransformObjOutput = null;
		JSONtransformError = createDisplayError(error);
		jsonTransformStage = 'idle';
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

	function hasTransformInputChanged(
		previousInput: TransformInputState | null,
		currentInput: TransformInputState
	) {
		if (!previousInput) return true;
		if (previousInput.xmlDoc !== currentInput.xmlDoc) return true;

		return previousInput.stylesheet !== currentInput.stylesheet;
	}

	function getStylesheetTransformStartStage(
		xmlDoc: XMLDocument | null | undefined,
		sefObj: SefItem | null | undefined
	): TransformStage {
		return getTransformInputStage(hasXmlDocument(xmlDoc), Boolean(sefObj?.sef));
	}

	function getStylesheetCopy(sefId: string, sefObj: SefItem | null | undefined) {
		return sefObj?.sef ? SefStore.getKeyCopy(sefId) : null;
	}

	function hasXmlDocument(xmlDoc: XMLDocument | null | undefined) {
		return Boolean(xmlDoc?.documentElement);
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
		message="XML content generation requires TEI XML and preFilter XSLT to be configured"
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

	{#if ViewModelOutput}
		<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
		<JSONViewer jsonData={ViewModelOutput} title="View Model" savefile="viewmodel.json" />
	{/if}

	<!-- Transcriptions/translations XSLT -->
</div>
