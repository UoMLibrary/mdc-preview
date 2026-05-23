<script>
	let { page = 1, data, clickable = false, updatepage = () => {} } = $props();

	let isCurrentPage = $derived(data.startPagePosition == page);
</script>

{#if clickable}
	<button
		class=" w-full text-left py-1 px-2 {isCurrentPage
			? 'bg-purple-500 text-white'
			: 'bg-zinc-200 hover:bg-zinc-100'}"
		onclick={() => updatepage(data.startPagePosition)}
	>
		<!-- {page} -->
		{data.label}
		<span class="text-xs {isCurrentPage ? 'text-white' : 'text-gray-400'}">
			(image {data.startPagePosition}, page {data.startPageLabel})</span
		>
	</button>
{:else}
	<div class="px-2 py-1">
		{data.label}
		<span class="text-xs text-gray-400">
			(image {data.startPagePosition}, page {data.startPageLabel})</span
		>
	</div>
{/if}
