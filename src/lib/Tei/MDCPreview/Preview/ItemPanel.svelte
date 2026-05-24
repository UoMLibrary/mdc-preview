<script lang="ts">
	import ItemPanelTabs from './ItemPanel/ItemPanelTabs.svelte';
	import About from './ItemPanel/About.svelte';
	import Content from './ItemPanel/Content.svelte';
	import Thumbnails from './ItemPanel/Thumbnails.svelte';
	import Metadata from './ItemPanel/Metadata.svelte';
	import ActionPanel from './ItemPanel/ActionPanel.svelte';
	import type { ViewModel } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		viewModel: ViewModel;
		page?: number;
		updatepage?: UpdatePage;
	}

	let { viewModel, page = 1, updatepage = () => {} }: Props = $props();

	let tabItems = ['About', 'Contents', 'Thumbnails', 'Metadata', 'More...'];
	let activeItem = $state('About');
</script>

<aside class="item-panel">
	<ItemPanelTabs {activeItem} {tabItems} tabChange={(item) => (activeItem = item)} />
	<div class="item-panel__content">
		{#if activeItem == 'About'}
			<About {viewModel} />
		{:else if activeItem == 'Contents'}
			<Content contents={viewModel.contentsObj} {page} {updatepage} />
		{:else if activeItem == 'Thumbnails'}
			<Thumbnails thumbnails={viewModel.thumbnails} {updatepage} />
		{:else if activeItem == 'Metadata'}
			<Metadata metadata={viewModel.displayMetadata} />
		{:else}
			<div class="item-panel__placeholder">
				<p class="item-panel__placeholder-text">Under construction...</p>
			</div>
		{/if}
	</div>
	<ActionPanel />
</aside>
