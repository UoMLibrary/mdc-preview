<script lang="ts">
	// Preview UI Components
	import Header from '$lib/Tei/MDCPreview/Preview/Header.svelte';
	import TitleBar from '$lib/Tei/MDCPreview/Preview/TitleBar.svelte';
	import ImageViewer from '$lib/Tei/MDCPreview/Preview/ImageViewer.svelte';
	import ItemPanel from '$lib/Tei/MDCPreview/Preview/ItemPanel.svelte';
	import type { ViewModel } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		viewModel: ViewModel;
		page?: number;
		updatepage?: UpdatePage;
	}

	let { viewModel, page = 1, updatepage = () => {} }: Props = $props();

	$effect(() => {
		viewModel;
		page = 1;
	});
</script>

<Header />
<TitleBar
	title="My Item"
	{page}
	pageTotal={viewModel?.pages?.length || 0}
	pdfData={viewModel.pdfObj}
	{updatepage}
/>
<div class="flex flex-col md:flex-row">
	<div class="flex-1 bg-black">
		<ImageViewer pages={viewModel.pages} {page} showNavigator={true} />
	</div>
	<div class="flex-1"><ItemPanel {viewModel} {page} {updatepage} /></div>
</div>
