<script>
	// Preview UI Components
	import Header from '$lib/Tei/MDCPreview/Preview/Header.svelte';
	import TitleBar from '$lib/Tei/MDCPreview/Preview/TitleBar.svelte';
	import ImageViewer from '$lib/Tei/MDCPreview/Preview/ImageViewer.svelte';
	import ItemPanel from '$lib/Tei/MDCPreview/Preview/ItemPanel.svelte';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let viewModel;
	export let page;

	$: (viewModel, (page = 1)); // If the viewModel changes, reset the page to 1
</script>

<Header />
<TitleBar
	title="My Item"
	{page}
	pageTotal={viewModel?.pages?.length || 0}
	pdfData={viewModel.pdfObj}
	on:updatepage
/>
<div class="flex flex-col md:flex-row">
	<div class="flex-1 bg-black">
		<ImageViewer pages={viewModel.pages} {page} showNavigator={true} />
	</div>
	<div class="flex-1"><ItemPanel {viewModel} {page} on:updatepage /></div>
</div>
