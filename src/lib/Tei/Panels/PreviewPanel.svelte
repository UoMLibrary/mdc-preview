<script lang="ts">
	// TODO: currently using a hardwired Preview, ideally pass in which one to use
	// Possibly via a <slot/>
	// import Preview from '$lib/MDCUI/Preview.svelte';
	import Preview from '$lib/Tei/MDCPreview/Preview.svelte';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';
	import type { ViewModel } from '$lib/Tei/createViewModel.js';
	import type { Snippet } from 'svelte';

	type UpdatePage = (page: number) => void;
	type ProgressStepStatus = 'pending' | 'active' | 'done' | 'error';

	interface ProgressStep {
		label: string;
		detail?: string;
		status: ProgressStepStatus;
	}

	interface Props {
		title?: string;
		message?: string;
		viewModel?: ViewModel | null;
		page?: number;
		updatepage?: UpdatePage;
		headerActions?: Snippet;
		progressSteps?: ProgressStep[];
		canCancel?: boolean;
		onCancel?: () => void;
	}

	let {
		title = '',
		message = '',
		viewModel,
		page = 1,
		updatepage = () => {},
		headerActions,
		progressSteps = [],
		canCancel = false,
		onCancel = () => {}
	}: Props = $props();
</script>

<div class="tool-panel tool-panel--preview-surface">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
		{#if headerActions}
			<div class="tool-panel__actions">
				{@render headerActions()}
			</div>
		{/if}
	</div>
	<!-- Panel Body -->
	<div>
		{#if !viewModel}
			<div class="tool-panel__body tool-panel__body--text">
				{#if progressSteps.length > 0}
					<div class="tool-panel__progress" aria-live="polite">
						{#if canCancel}
							<div class="tool-panel__progress-actions">
								<button
									type="button"
									class="tool-panel__button tool-panel__button--danger"
									onclick={onCancel}
								>
									Cancel
								</button>
							</div>
						{/if}
						{#each progressSteps as step (step.label)}
							<div class="tool-panel__progress-step tool-panel__progress-step--{step.status}">
								<span class="tool-panel__progress-marker" aria-hidden="true">
									{#if step.status === 'active'}
										<LoadingSpinner size="12" unit="px" duration="1s" color="purple" />
									{/if}
								</span>
								<span>
									{step.label}
									{#if step.detail}
										<span class="tool-panel__progress-detail"> - {step.detail}</span>
									{/if}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="tool-panel__message">{message}</div>
				{/if}
			</div>
		{:else}
			<!-- Pass the update page through to the parent component -->
			<Preview {viewModel} {page} {updatepage} />
		{/if}
	</div>
</div>
