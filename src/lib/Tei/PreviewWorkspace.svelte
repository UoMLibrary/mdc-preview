<script lang="ts">
	// Tool Panels and Preview
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import ConfigPresetSelect from '$lib/Tei/Panels/ConfigPresetSelect.svelte';

	// Stores
	import SefStore from '$lib/stores/sef-store.js';
	import TeiStore from '$lib/stores/tei-store.js';
	import { createDisplayError } from '$lib/Tei/transform-errors.js';
	import {
		getProgressStatus,
		getTransformEndStage,
		hasProgressStarted,
		runGuardedTransform,
		type TransformProgressStep,
		type TransformStage
	} from '$lib/Tei/transform-progress.js';

	import { previewSefIds, type PreviewSefId } from '$lib/Tei/preview-sef-ids.js';
	import { previewConfigData } from '$lib/Tei/preview-utils.js';
	import {
		createPreviewViewModel,
		runPreviewJsonTransformFromString,
		runPreviewPreTransformToString,
		type CudlObject,
		type PreviewConfig,
		type TransformDisplayError,
		type TransformProgressMessage,
		type ViewModel
	} from '$lib/Tei/preview-pipeline.js';

	import { sef as defaultPreTransformSef } from '$lib/Tei/default-sefs/preTransform.sef.json';
	import { sef as defaultJsonTransformSef } from '$lib/Tei/default-sefs/JSONTransform.sef.json';

	let page = $state(0);
	let selectedOrg = $state('manchester');
	let selectedConfig = $derived(previewConfigData[selectedOrg]);
	let activePreTransformSef = $derived(
		getActiveStylesheet(previewSefIds.preTransform, defaultPreTransformSef)
	);
	let activeJsonTransformSef = $derived(
		getActiveStylesheet(previewSefIds.jsonTransform, defaultJsonTransformSef)
	);

	let preTransformXmlOutput = $state<string | null>(null); // the serialized output of the preTransform (transient)
	let JSONTransformObjOutput = $state<CudlObject | null>(null); // the output of the JSON transform (transient)
	let ViewModelOutput = $state<ViewModel | null>(null); // output of the View model transform (transient)
	let PreTransformError = $state<TransformDisplayError | null>(null);
	let JSONTransformError = $state<TransformDisplayError | null>(null);
	let ViewModelError = $state<TransformDisplayError | null>(null);
	let preTransformStage = $state<TransformStage>('idle');
	let jsonTransformStage = $state<TransformStage>('idle');
	let viewModelStage = $state<TransformStage>('idle');
	let preTransformMessages = $state<TransformProgressMessage[]>([]);
	let jsonTransformMessages = $state<TransformProgressMessage[]>([]);
	let previewCancelled = $state(false);
	let preTransformRun = 0;
	let jsonTransformRun = 0;
	let preTransformController: AbortController | null = null;
	let jsonTransformController: AbortController | null = null;

	const canCancelPreview = $derived(
		preTransformStage === 'transforming' ||
			jsonTransformStage === 'transforming' ||
			viewModelStage === 'transforming'
	);

	const previewMessage = $derived(
		getPreviewMessage(
			previewCancelled,
			Boolean($TeiStore.xmlDoc?.documentElement),
			Boolean(activePreTransformSef),
			Boolean(activeJsonTransformSef),
			PreTransformError,
			JSONTransformError,
			ViewModelError
		)
	);

	const progressSteps = $derived(
		getProgressSteps({
			preStage: preTransformStage,
			jsonStage: jsonTransformStage,
			modelStage: viewModelStage,
			preError: PreTransformError,
			jsonError: JSONTransformError,
			modelError: ViewModelError,
			preDetail: getLatestTransformMessage(preTransformMessages),
			jsonDetail: getLatestTransformMessage(jsonTransformMessages),
			modelReady: Boolean(ViewModelOutput)
		})
	);

	interface PreviewProgressState {
		preStage: TransformStage;
		jsonStage: TransformStage;
		modelStage: TransformStage;
		preError: TransformDisplayError | null;
		jsonError: TransformDisplayError | null;
		modelError: TransformDisplayError | null;
		preDetail: string | null;
		jsonDetail: string | null;
		modelReady: boolean;
	}

	$effect(() => {
		runPreTransform($TeiStore.xmlDoc, activePreTransformSef);
	});

	$effect(() => {
		runJSONTransform(preTransformXmlOutput, activeJsonTransformSef);
	});

	$effect(() => {
		runViewModelTransform(JSONTransformObjOutput, selectedConfig);
	});

	async function runPreTransform(
		xmlDoc: XMLDocument | null | undefined,
		stylesheetInternal: unknown
	) {
		const runId = ++preTransformRun;
		const hasSource = hasXmlDocument(xmlDoc);
		const controller = preparePreTransformRun(hasSource, stylesheetInternal);

		await runGuardedTransform({
			isStale: () => runId !== preTransformRun,
			run: () =>
				runPreviewPreTransformToString(xmlDoc, stylesheetInternal, {
					signal: controller?.signal,
					progress: (message) => {
						if (runId !== preTransformRun) return;
						preTransformMessages = [...preTransformMessages.slice(-5), message];
					}
				}),
			applyResult: (result) => applyPreTransformResult(result, hasSource),
			applyError: applyPreTransformError,
			release: () => releasePreTransformController(controller)
		});
	}

	function preparePreTransformRun(hasSource: boolean, stylesheetInternal: unknown) {
		previewCancelled = false;
		preTransformController?.abort();
		const controller = createTransformController(hasSource, stylesheetInternal);
		preTransformController = controller;
		resetPreTransformState();
		preTransformStage = getTransformStartStage(controller, 'idle');
		return controller;
	}

	function resetPreTransformState() {
		preTransformXmlOutput = null;
		JSONTransformObjOutput = null;
		ViewModelOutput = null;
		PreTransformError = null;
		preTransformMessages = [];
	}

	function applyPreTransformResult(
		result: Awaited<ReturnType<typeof runPreviewPreTransformToString>>,
		hasSource: boolean
	) {
		preTransformXmlOutput = result.value;
		PreTransformError = result.error;
		preTransformStage = getTransformEndStage(result.value, result.error, hasSource);
	}

	function applyPreTransformError(error: unknown) {
		preTransformXmlOutput = null;
		PreTransformError = createDisplayError(error);
		preTransformStage = 'idle';
	}

	function releasePreTransformController(controller: AbortController | null) {
		if (preTransformController === controller) preTransformController = null;
	}

	async function runJSONTransform(
		xmlString: string | null | undefined,
		stylesheetInternal: unknown
	) {
		const runId = ++jsonTransformRun;
		const hasSource = Boolean(xmlString);
		const controller = prepareJsonTransformRun(hasSource, stylesheetInternal);

		await runGuardedTransform({
			isStale: () => runId !== jsonTransformRun,
			run: () =>
				runPreviewJsonTransformFromString(xmlString, stylesheetInternal, {
					signal: controller?.signal,
					progress: (message) => {
						if (runId !== jsonTransformRun) return;
						jsonTransformMessages = [...jsonTransformMessages.slice(-5), message];
					}
				}),
			applyResult: (result) => applyJsonTransformResult(result, hasSource),
			applyError: applyJsonTransformError,
			release: () => releaseJsonTransformController(controller)
		});
	}

	function prepareJsonTransformRun(hasSource: boolean, stylesheetInternal: unknown) {
		jsonTransformController?.abort();
		const controller = createTransformController(hasSource, stylesheetInternal);
		jsonTransformController = controller;
		JSONTransformObjOutput = null;
		ViewModelOutput = null;
		JSONTransformError = null;
		jsonTransformMessages = [];
		jsonTransformStage = getTransformStartStage(controller, 'waiting-for-input');
		return controller;
	}

	function applyJsonTransformResult(
		result: Awaited<ReturnType<typeof runPreviewJsonTransformFromString>>,
		hasSource: boolean
	) {
		JSONTransformObjOutput = result.value;
		JSONTransformError = result.error;
		jsonTransformStage = getTransformEndStage(result.value, result.error, hasSource);
	}

	function applyJsonTransformError(error: unknown) {
		JSONTransformObjOutput = null;
		JSONTransformError = createDisplayError(error);
		jsonTransformStage = 'idle';
	}

	function releaseJsonTransformController(controller: AbortController | null) {
		if (jsonTransformController === controller) jsonTransformController = null;
	}

	function runViewModelTransform(cudlJson: CudlObject | null, config: PreviewConfig | undefined) {
		ViewModelError = null;
		const inputs = getViewModelInputs(cudlJson, config);

		if (!inputs) {
			resetViewModelOutput();
			return;
		}

		createViewModelOutput(inputs.cudlJson, inputs.config);
	}

	function getViewModelInputs(cudlJson: CudlObject | null, config: PreviewConfig | undefined) {
		if (!cudlJson) return null;
		if (!config) return null;

		return { cudlJson, config };
	}

	function resetViewModelOutput() {
		ViewModelOutput = null;
		viewModelStage = 'waiting-for-input';
	}

	function createViewModelOutput(cudlJson: CudlObject, config: PreviewConfig) {
		viewModelStage = 'transforming';

		try {
			const viewModel = createPreviewViewModel(cudlJson, config);
			ViewModelOutput = viewModel;
			viewModelStage = viewModel ? 'complete' : 'waiting-for-input';
		} catch (error) {
			ViewModelOutput = null;
			ViewModelError = createDisplayError(error);
			viewModelStage = 'idle';
		}
	}

	function createTransformController(hasSource: boolean, stylesheetInternal: unknown) {
		return hasSource && stylesheetInternal ? new AbortController() : null;
	}

	function getTransformStartStage(
		controller: AbortController | null,
		fallbackStage: TransformStage
	): TransformStage {
		return controller ? 'transforming' : fallbackStage;
	}

	function selectConfig(org: string) {
		selectedOrg = org;
	}

	function getActiveStylesheet(sefId: PreviewSefId, defaultStylesheet: unknown) {
		const loadedStylesheet = $SefStore?.[sefId]?.sef;
		return loadedStylesheet ? SefStore.getKeyCopy(sefId) : defaultStylesheet;
	}

	// Handle page navigation from Preview internal components.
	function changePage(nextPage: number) {
		page = nextPage;
	}

	function cancelPreviewProcessing() {
		previewCancelled = true;
		preTransformRun += 1;
		jsonTransformRun += 1;
		preTransformController?.abort();
		jsonTransformController?.abort();
		preTransformController = null;
		jsonTransformController = null;
		preTransformXmlOutput = null;
		JSONTransformObjOutput = null;
		ViewModelOutput = null;
		PreTransformError = null;
		JSONTransformError = null;
		ViewModelError = null;
		preTransformMessages = [];
		jsonTransformMessages = [];
		preTransformStage = 'idle';
		jsonTransformStage = 'idle';
		viewModelStage = 'idle';
	}

	function getProgressSteps(state: PreviewProgressState): TransformProgressStep[] {
		if (shouldHideProgress(state)) return [];

		return [
			{ label: 'TEI loaded', status: 'done' },
			createProgressStep(
				state.preError,
				'Pre-filter transform failed',
				'Running pre-filter transform',
				state.preDetail,
				state.preStage
			),
			createProgressStep(
				state.jsonError,
				'JSON transform failed',
				'Running JSON transform',
				state.jsonDetail,
				state.jsonStage
			),
			createProgressStep(
				state.modelError,
				'Preview generation failed',
				'Creating preview',
				null,
				state.modelStage
			)
		];
	}

	function shouldHideProgress(state: PreviewProgressState) {
		const stages = [state.preStage, state.jsonStage, state.modelStage];
		return state.modelReady || (!hasProgressStarted(stages) && !hasProgressError(state));
	}

	function hasProgressError(state: PreviewProgressState) {
		return Boolean(state.preError || state.jsonError || state.modelError);
	}

	function createProgressStep(
		error: TransformDisplayError | null,
		errorLabel: string,
		activeLabel: string,
		detail: string | null,
		stage: TransformStage
	): TransformProgressStep {
		if (error) return { label: errorLabel, detail: error.message, status: 'error' };

		return {
			label: activeLabel,
			detail: detail ?? undefined,
			status: getProgressStatus(stage, false)
		};
	}

	function getLatestTransformMessage(messages: TransformProgressMessage[]) {
		return messages.at(-1)?.message ?? null;
	}

	function getPreviewMessage(
		cancelled: boolean,
		hasTei: boolean,
		hasPreTransform: boolean,
		hasJsonTransform: boolean,
		preError: TransformDisplayError | null,
		jsonError: TransformDisplayError | null,
		modelError: TransformDisplayError | null
	) {
		if (cancelled) return 'Preview generation was cancelled';

		const missingMessage = getMissingPreviewInputMessage(hasTei, hasPreTransform, hasJsonTransform);
		if (missingMessage) return missingMessage;
		if (hasTransformError(preError, jsonError, modelError)) return 'Preview generation failed';

		return 'Preview generation is waiting for transform output';
	}

	function getMissingPreviewInputMessage(
		hasTei: boolean,
		hasPreTransform: boolean,
		hasJsonTransform: boolean
	) {
		if (!hasTei) return 'Preview generation requires a TEI to be loaded';
		if (!hasPreTransform) return 'Preview generation requires a pre-filter stylesheet';
		if (!hasJsonTransform) return 'Preview generation requires a JSON transform stylesheet';

		return null;
	}

	function hasTransformError(
		preError: TransformDisplayError | null,
		jsonError: TransformDisplayError | null,
		modelError: TransformDisplayError | null
	) {
		return Boolean(preError || jsonError || modelError);
	}

	function hasXmlDocument(xmlDoc: XMLDocument | null | undefined) {
		return Boolean(xmlDoc?.documentElement);
	}
</script>

{#snippet previewHeaderActions()}
	<div class="preview-workspace__config-select">
		<ConfigPresetSelect selectedPreset={selectedOrg} selectPreset={selectConfig} />
	</div>
{/snippet}

<div class="preview-workspace preview-workspace--app">
	<!-- Preview panel showing an example of the final viewer output, contains an embedded
		 Preview component. TODO: specify 'Preview' here to swap between a pure data view 
		 and a styled view for a particular organisation.  -->
	<PreviewPanel
		title={`Preview: ${$TeiStore?.fileData?.name || 'Untitled TEI file'}`}
		message={previewMessage}
		viewModel={ViewModelOutput}
		{page}
		updatepage={changePage}
		headerActions={previewHeaderActions}
		{progressSteps}
		canCancel={canCancelPreview}
		onCancel={cancelPreviewProcessing}
	/>

	{#if ViewModelOutput}
		<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
		<JSONViewer jsonData={ViewModelOutput} title="View Model" savefile="viewmodel.json" />
	{/if}
</div>
