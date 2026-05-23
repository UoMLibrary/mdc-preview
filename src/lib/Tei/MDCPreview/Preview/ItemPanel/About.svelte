<script>
	import Information from './MetaData/Information.svelte';

	let { viewModel } = $props();
</script>

<div class="">
	<h2 class="m-4 text-xl">
		{viewModel.aboutObj.title}
		{#if viewModel?.aboutObj?.shelfLocator}({viewModel.aboutObj.shelfLocator}){/if}
	</h2>
	<article class="m-4 rich-text">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html viewModel.aboutObj.abstractHTML}
	</article>
	<div class="m-4">
		<Information metadata={viewModel.displayMetadata} />
	</div>
	<div class="m-4 text-xs text-gray-400">
		{#if viewModel?.aboutObj?.displayImageRights}{viewModel.aboutObj.displayImageRights}{/if}
	</div>
</div>

<style>
	.rich-text {
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.rich-text :global(p) {
		margin: 0 0 0.75rem;
	}

	.rich-text :global(a) {
		color: #632390;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
