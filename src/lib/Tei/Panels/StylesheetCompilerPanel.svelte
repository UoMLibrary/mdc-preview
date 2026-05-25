<script lang="ts">
	import SefStore from '$lib/stores/sef-store.js';
	import { getPanelStatus } from '$lib/Tei/panel-status.js';
	import CompileXsltFileButton from '$lib/UI/FileButtons/CompileXsltFileButton.svelte';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';
	import { previewSefIds, type PreviewSefId } from '$lib/Tei/preview-sef-ids.js';
	import type { TransformDisplayError } from '$lib/Tei/preview-pipeline.js';
	import type { SefItem } from '$lib/stores/sef-store.js';

	type StylesheetLoadStage =
		| 'idle'
		| 'xslt-reading'
		| 'xslt-uploaded'
		| 'sef-compiling'
		| 'sef-reading'
		| 'sef-loaded'
		| 'xslt-error'
		| 'sef-error';
	type StylesheetLoadSource = 'unknown' | 'xslt' | 'sef';
	type StylesheetTransformStage = 'idle' | 'waiting-for-input' | 'transforming' | 'complete';
	type ProgressStepStatus = 'pending' | 'active' | 'done' | 'error';

	interface ProgressStep {
		label: string;
		status: ProgressStepStatus;
	}

	interface Props {
		title?: string;
		sefId: PreviewSefId;
		runtimeError?: TransformDisplayError | null;
		transformStage?: StylesheetTransformStage;
	}

	let { title = '', sefId, runtimeError = null, transformStage = 'idle' }: Props = $props();
	let loadStage = $state<StylesheetLoadStage>('idle');
	let loadSource = $state<StylesheetLoadSource>('unknown');
	let cancelCompile: (() => void) | null = null;

	const sefData = $derived($SefStore?.[sefId]);
	const noStylesheetLoaded = $derived(!sefData?.sef && !sefData?.fileData);
	const emptyMessage = $derived(getEmptyMessage(sefId));
	const preferredEntryNames = $derived(getPreferredEntryNames(sefId));
	const isLoading = $derived(isLoadStageBusy(loadStage));
	const progressSteps = $derived(
		getProgressSteps(loadStage, loadSource, transformStage, !!sefData?.sef, !!runtimeError)
	);
	const status = $derived(
		getPanelStatus(!!sefData?.errors?.length || !!runtimeError, !!sefData?.sef)
	);

	function getEmptyMessage(id: PreviewSefId) {
		if (id === previewSefIds.preTransform) return 'No pre-filter stylesheet loaded';
		if (id === previewSefIds.jsonTransform) return 'No JSON transform stylesheet loaded';
		return 'No stylesheet loaded';
	}

	function getPreferredEntryNames(id: PreviewSefId) {
		if (id === previewSefIds.preTransform) return ['preFilter', 'prefilter', 'preTransform'];
		if (id === previewSefIds.jsonTransform) return ['jsonTransform', 'json'];
		return [];
	}

	function startLoading() {
		clearStylesheet();
		loadSource = 'xslt';
		loadStage = 'xslt-reading';
	}

	function clearStylesheet() {
		cancelCompile?.();
		cancelCompile = null;
		loadStage = 'idle';
		loadSource = 'unknown';
		SefStore.clearKeyValue(sefId);
	}

	function startSefLoading() {
		clearStylesheet();
		loadSource = 'sef';
		loadStage = 'sef-reading';
	}

	function finishStylesheetLoad(payload: SefItem) {
		SefStore.setKeyValue(sefId, payload);
		loadSource = 'xslt';
		loadStage = 'sef-loaded';
	}

	function failStylesheetLoad(payload: SefItem) {
		SefStore.setKeyValue(sefId, payload);
		loadStage = loadStage === 'sef-compiling' ? 'sef-error' : 'xslt-error';
	}

	function finishSefLoad(payload: SefItem) {
		SefStore.setKeyValue(sefId, payload);
		loadSource = 'sef';
		loadStage = 'sef-loaded';
	}

	function isLoadStageBusy(stage: StylesheetLoadStage) {
		return ['xslt-reading', 'xslt-uploaded', 'sef-compiling', 'sef-reading'].includes(stage);
	}

	function getProgressSteps(
		stage: StylesheetLoadStage,
		source: StylesheetLoadSource,
		currentTransformStage: StylesheetTransformStage,
		hasSef: boolean,
		hasTransformError: boolean
	): ProgressStep[] {
		if (stage === 'idle' && !hasSef && currentTransformStage === 'idle') return [];
		const steps = getLoadProgressSteps(stage, source, hasSef);

		if (hasSef || stage === 'sef-loaded') {
			steps.push(getTransformProgressStep(currentTransformStage, hasTransformError));
		}

		return steps;
	}

	function getLoadProgressSteps(
		stage: StylesheetLoadStage,
		source: StylesheetLoadSource,
		hasSef: boolean
	): ProgressStep[] {
		if (source === 'sef' || stage === 'sef-reading') {
			return [
				{
					label: stage === 'sef-reading' ? 'Reading SEF' : 'SEF uploaded',
					status: stage === 'sef-reading' ? 'active' : 'done'
				},
				{ label: 'SEF loaded', status: stage === 'sef-loaded' || hasSef ? 'done' : 'pending' }
			];
		}

		if (stage === 'idle' && hasSef) return [{ label: 'SEF loaded', status: 'done' }];

		return [
			{
				label: stage === 'xslt-reading' ? 'Reading XSLT' : 'XSLT uploaded',
				status: getXsltUploadStatus(stage)
			},
			{
				label: 'Processing XSLT to SEF',
				status: getSefCompileStatus(stage)
			},
			{
				label: 'SEF loaded',
				status: stage === 'sef-loaded' || hasSef ? 'done' : 'pending'
			}
		];
	}

	function getXsltUploadStatus(stage: StylesheetLoadStage): ProgressStepStatus {
		if (stage === 'xslt-error') return 'error';
		if (stage === 'xslt-reading') return 'active';
		return 'done';
	}

	function getSefCompileStatus(stage: StylesheetLoadStage): ProgressStepStatus {
		if (stage === 'sef-error') return 'error';
		if (stage === 'sef-compiling') return 'active';
		if (stage === 'sef-loaded') return 'done';
		return 'pending';
	}

	function getTransformProgressStep(
		currentTransformStage: StylesheetTransformStage,
		hasTransformError: boolean
	): ProgressStep {
		if (hasTransformError) return { label: 'Transform failed', status: 'error' };
		if (currentTransformStage === 'transforming') {
			return { label: 'Transforming XML', status: 'active' };
		}
		if (currentTransformStage === 'complete') return { label: 'Transform complete', status: 'done' };
		if (currentTransformStage === 'waiting-for-input') {
			return { label: 'Waiting for XML input', status: 'pending' };
		}

		return { label: 'Transforming XML', status: 'pending' };
	}
</script>

<div
	class="tool-panel {status == 'ERROR' ? 'tool-panel--error' : ''} {status == 'SUCCESS'
		? 'tool-panel--success'
		: ''}"
>
	<div class="tool-panel__header">
		<p class="tool-panel__title tool-panel__title--file">
			<span class="tool-panel__details-label">{title}: </span>{sefData?.fileData?.basename || ''}
		</p>

		<div class="tool-panel__actions">
			<CompileXsltFileButton
				label="Load XSLT"
				{preferredEntryNames}
				registerCancel={(cancel) => {
					cancelCompile = cancel;
				}}
				progress={(stage) => {
					loadStage = stage;
				}}
				started={startLoading}
				loaded={(payload) => {
					finishStylesheetLoad(payload as SefItem);
				}}
				error={(payload) => {
					failStylesheetLoad(payload as SefItem);
				}}
			/>

			<OpenJsonFileButton
				label="Load SEF"
				started={startSefLoading}
				loaded={(payload) => {
					finishSefLoad(payload.json as SefItem);
				}}
			/>

			{#if sefData?.sef}
				<SaveJsonFileButton label="Save SEF" fileName={`${sefId}.sef.json`} jsonData={sefData} />
			{/if}

			<button class="tool-panel__button" onclick={clearStylesheet}>Clear</button>
		</div>
	</div>

	<div class="tool-panel__body tool-panel__body--text">
		{#if progressSteps.length > 0}
			<div class="tool-panel__progress" aria-live="polite">
				{#each progressSteps as step (step.label)}
					<div class="tool-panel__progress-step tool-panel__progress-step--{step.status}">
						<span class="tool-panel__progress-marker" aria-hidden="true">
							{#if step.status === 'active'}
								<LoadingSpinner size="12" unit="px" duration="1s" color="purple" />
							{/if}
						</span>
						<span>{step.label}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if isLoading}
			<div class="tool-panel__loading"></div>
		{:else}
			{#if noStylesheetLoaded}
				<p class="tool-panel__empty">{emptyMessage}</p>
			{/if}
			{#if sefData?.fileData && Object.keys(sefData?.fileData).length > 1}
				<p class="tool-panel__section-title">Source file details</p>
				<div class="tool-panel__details">
					{#each Object.entries(sefData?.fileData) as [key, value] (key)}
						<p><span class="tool-panel__details-label">{key}</span>: {value}</p>
					{/each}
				</div>
			{/if}
			{#if sefData?.metaData && Object.keys(sefData.metaData).length > 1}
				<p class="tool-panel__section-title">Source metadata</p>
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
			{#if runtimeError}
				<p class="tool-panel__section-title tool-panel__section-title--error">
					Transformation error
				</p>
				<div class="tool-panel__error-details">
					<p>
						<strong>{runtimeError.name}</strong>
						{#if runtimeError.code}<span>({runtimeError.code})</span>{/if}
					</p>
					<p>{runtimeError.message}</p>
					{#if runtimeError.stack}<pre>{runtimeError.stack}</pre>{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
