<script lang="ts">
	// TODO: currently using a hardwired Preview, ideally pass in which one to use
	// Possibly via a <slot/>
	// import Preview from '$lib/MDCUI/Preview.svelte';
	import Preview from '$lib/Tei/MDCPreview/Preview.svelte';
	import type { ViewModel } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		title?: string;
		message?: string;
		viewModel?: ViewModel | null;
		page?: number;
		updatepage?: UpdatePage;
	}

	let { title = '', message = '', viewModel, page = 1, updatepage = () => {} }: Props = $props();
</script>

<div class="tool-panel">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div>
		{#if !viewModel}
			<div class="tool-panel__message tool-panel__message--inset">{message}</div>
		{:else}
			<!-- Pass the update page through to the parent component -->
			<Preview {viewModel} {page} {updatepage} />
		{/if}
	</div>
</div>
