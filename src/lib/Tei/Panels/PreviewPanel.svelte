<script>
	// TODO: currently using a hardwired Preview, ideally pass in which one to use
	// Possibly via a <slot/>
	// import Preview from '$lib/MDCUI/Preview.svelte';
	import Preview from '$lib/Tei/MDCPreview/Preview.svelte';

	let { title = '', message = '', viewModel, page = 1, updatepage = () => {} } = $props();
</script>

<div class="rounded-md bg-white mb-4 text-xs pb-1">
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<div>
			{#if title}<p class="p-1 px-2 font-bold text-sm">{title}</p>{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div>
		{#if !viewModel}
			<div class="h-4 m-4">{message}</div>
		{:else}
			<!-- Pass the update page through to the parent component -->
			<Preview {viewModel} {page} {updatepage} />
		{/if}
	</div>
</div>
