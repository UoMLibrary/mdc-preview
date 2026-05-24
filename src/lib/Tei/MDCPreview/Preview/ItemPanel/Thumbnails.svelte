<script lang="ts">
	import type { ThumbnailItem } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		thumbnails?: ThumbnailItem[];
		updatepage?: UpdatePage;
	}

	let { thumbnails = [], updatepage = () => {} }: Props = $props();
</script>

<div class="thumbnail-panel">
	<div class="thumbnail-panel__grid">
		{#each thumbnails as thumbnail, idx (thumbnail.url)}
			<button onclick={() => updatepage(idx + 1)}>
				<div class="thumbnail-panel__card">
					<img src={thumbnail.url} alt={`An Image labelled '${thumbnail.label}'`} />
					<div class="thumbnail-panel__label">
						<!-- Don't show the page number if the label is the page number -->
						{#if thumbnail.label !== String(idx + 1)}{idx + 1}:{/if}&nbsp;{thumbnail.label}
					</div>
				</div>
			</button>
		{/each}
	</div>
</div>
