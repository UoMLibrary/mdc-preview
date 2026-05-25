<script lang="ts">
	// Tool Panels and Preview
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import ConfigPresetSelect from '$lib/Tei/Panels/ConfigPresetSelect.svelte';

	// Stores
	import TeiStore from '$lib/stores/tei-store.js';

	import { previewConfigData } from '$lib/Tei/preview-utils.js';
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

	// We load the sef when the page is loaded, this preview page doen't need to react to
	// live updates in the sef files
	import { sef as preTransformSef } from '$lib/Tei/default-sefs/preTransform.sef.json';
	import { sef as jsonTransformSef } from '$lib/Tei/default-sefs/JSONTransform.sef.json';

	let page = $state(0);
	let selectedOrg = $state('manchester');
	let selectedConfig = $derived(previewConfigData[selectedOrg]);

	let preTransformXmlDocOutput = $state<XMLDocument | null>(null); // the output of the preTransform (transient)
	let JSONTransformObjOutput = $state<CudlObject | null>(null); // the output of the JSON transform (transient)
	let ViewModelOutput = $state<ViewModel | null>(null); // output of the View model transform (transient)
	let PreTransformError = $state<TransformDisplayError | null>(null);
	let JSONTransformError = $state<TransformDisplayError | null>(null);
	let ViewModelError = $state<TransformDisplayError | null>(null);
	let preTransformStage = $state<PreviewTransformStage>('idle');
	let jsonTransformStage = $state<PreviewTransformStage>('idle');
	let viewModelStage = $state<PreviewTransformStage>('idle');
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
		previewCancelled
			? 'Preview generation was cancelled'
			: 'Preview generation requires a TEI to be loaded'
	);

	const progressSteps = $derived(
		getProgressSteps(
			preTransformStage,
			jsonTransformStage,
			viewModelStage,
			PreTransformError,
			JSONTransformError,
			ViewModelError,
			getLatestTransformMessage(preTransformMessages),
			getLatestTransformMessage(jsonTransformMessages)
		)
	);

	type PreviewTransformStage = 'idle' | 'waiting-for-input' | 'transforming' | 'complete';
	type ProgressStepStatus = 'pending' | 'active' | 'done' | 'error';

	interface ProgressStep {
		label: string;
		detail?: string;
		status: ProgressStepStatus;
	}

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
		const runId = ++preTransformRun;
		previewCancelled = false;
		preTransformController?.abort();
		const controller = xmlDoc?.documentElement ? new AbortController() : null;
		preTransformController = controller;
		preTransformXmlDocOutput = null;
		JSONTransformObjOutput = null;
		ViewModelOutput = null;
		PreTransformError = null;
		preTransformMessages = [];
		preTransformStage = xmlDoc?.documentElement ? 'transforming' : 'idle';

		try {
			const result = await runPreviewPreTransform(xmlDoc, preTransformSef, {
				signal: controller?.signal,
				progress: (message) => {
					if (runId !== preTransformRun) return;
					preTransformMessages = [...preTransformMessages.slice(-5), message];
				}
			});
			if (runId !== preTransformRun) return;

			preTransformXmlDocOutput = result.value;
			PreTransformError = result.error;
			preTransformStage = getTransformEndStage(result.value, result.error, xmlDoc);
		} catch (error) {
			if (runId !== preTransformRun) return;

			preTransformXmlDocOutput = null;
			PreTransformError = createDisplayError(error);
			preTransformStage = 'idle';
		} finally {
			if (preTransformController === controller) preTransformController = null;
		}
	}

	async function runJSONTransform(xmlDoc: XMLDocument | null | undefined) {
		const runId = ++jsonTransformRun;
		jsonTransformController?.abort();
		const controller = xmlDoc?.documentElement ? new AbortController() : null;
		jsonTransformController = controller;
		JSONTransformObjOutput = null;
		ViewModelOutput = null;
		JSONTransformError = null;
		jsonTransformMessages = [];
		jsonTransformStage = xmlDoc?.documentElement ? 'transforming' : 'waiting-for-input';

		try {
			const result = await runPreviewJsonTransform(xmlDoc, jsonTransformSef, {
				signal: controller?.signal,
				progress: (message) => {
					if (runId !== jsonTransformRun) return;
					jsonTransformMessages = [...jsonTransformMessages.slice(-5), message];
				}
			});
			if (runId !== jsonTransformRun) return;

			JSONTransformObjOutput = result.value;
			JSONTransformError = result.error;
			jsonTransformStage = getTransformEndStage(result.value, result.error, xmlDoc);
		} catch (error) {
			if (runId !== jsonTransformRun) return;

			JSONTransformObjOutput = null;
			JSONTransformError = createDisplayError(error);
			jsonTransformStage = 'idle';
		} finally {
			if (jsonTransformController === controller) jsonTransformController = null;
		}
	}

	async function runViewModelTransform(
		cudlJson: CudlObject | null,
		config: PreviewConfig | undefined
	) {
		ViewModelError = null;

		if (!cudlJson || !config) {
			ViewModelOutput = null;
			viewModelStage = 'waiting-for-input';
			return;
		}

		viewModelStage = 'transforming';

		try {
			ViewModelOutput = createPreviewViewModel(cudlJson, config);
			viewModelStage = ViewModelOutput ? 'complete' : 'waiting-for-input';
		} catch (error) {
			ViewModelOutput = null;
			ViewModelError = createDisplayError(error);
			viewModelStage = 'idle';
		}
	}

	function selectConfig(org: string) {
		selectedOrg = org;
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
		preTransformXmlDocOutput = null;
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

	function getTransformEndStage<T>(
		value: T | null,
		error: TransformDisplayError | null,
		xmlDoc: XMLDocument | null | undefined
	): PreviewTransformStage {
		if (error) return 'idle';
		if (value) return 'complete';
		if (!xmlDoc?.documentElement) return 'waiting-for-input';
		return 'idle';
	}

	function getProgressSteps(
		preStage: PreviewTransformStage,
		jsonStage: PreviewTransformStage,
		modelStage: PreviewTransformStage,
		preError: TransformDisplayError | null,
		jsonError: TransformDisplayError | null,
		modelError: TransformDisplayError | null,
		preDetail: string | null,
		jsonDetail: string | null
	): ProgressStep[] {
		if (ViewModelOutput || !hasProgressStarted(preStage, jsonStage, modelStage)) return [];

		return [
			{ label: 'TEI loaded', status: 'done' },
			{
				label: preError ? 'Pre-filter transform failed' : 'Running pre-filter transform',
				detail: preDetail ?? undefined,
				status: getProgressStatus(preStage, !!preError)
			},
			{
				label: jsonError ? 'JSON transform failed' : 'Running JSON transform',
				detail: jsonDetail ?? undefined,
				status: getProgressStatus(jsonStage, !!jsonError)
			},
			{
				label: modelError ? 'Preview generation failed' : 'Creating preview',
				detail: modelError?.message,
				status: getProgressStatus(modelStage, !!modelError)
			}
		];
	}

	function hasProgressStarted(...stages: PreviewTransformStage[]) {
		return stages.some((stage) => stage !== 'idle' && stage !== 'waiting-for-input');
	}

	function getProgressStatus(stage: PreviewTransformStage, hasError: boolean): ProgressStepStatus {
		if (hasError) return 'error';
		if (stage === 'transforming') return 'active';
		if (stage === 'complete') return 'done';
		return 'pending';
	}

	function getLatestTransformMessage(messages: TransformProgressMessage[]) {
		return messages.at(-1)?.message ?? null;
	}

	function createDisplayError(error: unknown): TransformDisplayError {
		if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

		const code = (error as Error & { code?: string | number }).code;
		return { name: error.name, message: error.message, stack: error.stack, code };
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

	<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
	<JSONViewer
		jsonData={ViewModelOutput}
		title="View Model"
		savefile="viewmodel.json"
		message="View Model generation requires a TEI to be loaded"
	/>
</div>
