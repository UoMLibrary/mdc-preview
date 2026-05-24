<script lang="ts">
	import type { CudlRecord } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		page?: number;
		data: CudlRecord;
		clickable?: boolean;
		updatepage?: UpdatePage;
	}

	let { page = 1, data, clickable = false, updatepage = () => {} }: Props = $props();

	let isCurrentPage = $derived(data.startPagePosition == page);
</script>

{#if clickable}
	<button
		class="contents-child-button {isCurrentPage
			? 'contents-child-button--current'
			: 'contents-child-button--default'}"
		onclick={() => updatepage(data.startPagePosition)}
	>
		<!-- {page} -->
		{data.label}
		<span class="contents-child-meta {isCurrentPage ? 'contents-child-meta--current' : ''}">
			(image {data.startPagePosition}, page {data.startPageLabel})</span
		>
	</button>
{:else}
	<div class="contents-child-text">
		{data.label}
		<span class="contents-child-meta">
			(image {data.startPagePosition}, page {data.startPageLabel})</span
		>
	</div>
{/if}
