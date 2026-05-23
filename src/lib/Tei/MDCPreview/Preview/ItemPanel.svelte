<script>
	import ItemPanelTabs from './ItemPanel/ItemPanelTabs.svelte';
	import About from './ItemPanel/About.svelte';
	import Content from './ItemPanel/Content.svelte';
	import Thumbnails from './ItemPanel/Thumbnails.svelte';
	import Metadata from './ItemPanel/Metadata.svelte';
	import ActionPanel from './ItemPanel/ActionPanel.svelte';

	let { viewModel, page = 1, updatepage = () => {} } = $props();

	let tabItems = ['About', 'Contents', 'Thumbnails', 'Metadata', 'More...'];
	let activeItem = $state('About');
</script>

<aside class="flex flex-col min-h-[640px] h-[640px]">
	<ItemPanelTabs {activeItem} {tabItems} tabChange={(item) => (activeItem = item)} />
	<div class="flex-1 bg-white overflow-y-auto">
		{#if activeItem == 'About'}
			<About {viewModel} />
		{:else if activeItem == 'Contents'}
			<Content contents={viewModel.contentsObj} {page} {updatepage} />
		{:else if activeItem == 'Thumbnails'}
			<Thumbnails thumbnails={viewModel.thumbnails} {updatepage} />
		{:else if activeItem == 'Metadata'}
			<Metadata metadata={viewModel.displayMetadata} />
		{:else}
			<div class="text-xs"><p class="flex-1 p-4">Under construction...</p></div>
		{/if}
	</div>
	<ActionPanel />
</aside>
