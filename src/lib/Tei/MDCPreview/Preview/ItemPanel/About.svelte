<script lang="ts">
	import Information from './MetaData/Information.svelte';
	import type { ViewModel } from '$lib/Tei/createViewModel.js';

	interface Props {
		viewModel: ViewModel;
	}

	let { viewModel }: Props = $props();
</script>

<div class="about-panel">
	<h2 class="about-panel__title">
		{viewModel.aboutObj.title}
		{#if viewModel?.aboutObj?.shelfLocator}({viewModel.aboutObj.shelfLocator}){/if}
	</h2>
	<article class="about-panel__abstract rich-text">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html viewModel.aboutObj.abstractHTML}
	</article>
	<div class="about-panel__metadata">
		<Information metadata={viewModel.displayMetadata} />
	</div>
	<div class="about-panel__rights">
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
