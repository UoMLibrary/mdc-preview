<script>
	import { resolve } from '$app/paths';

	// display the metadata key pairs
	let { metadata = [] } = $props();
</script>

{#if metadata?.length > 0}
	<div class="border border-purple-400 rounded-md overflow-hidden text-sm">
		<div class="flex justify-between bg-zinc-300 p-3">
			<h4 class="m-0 text-uom-purple">Information about this document</h4>
		</div>

		<div class="metadata-list">
			<ul>
				{#each metadata as data (data.label)}
					<li>
						<b>{data.label}: </b>
						{#each data.value as value, idx (idx)}
							{#if value?.link}
								<a href={resolve(value.link)} class="cudLink">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html value.text}</a
								>{#if idx < data.value.length - 1};&nbsp;{/if}
							{:else}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html value.text}{#if idx < data.value.length - 1};&nbsp;{/if}
							{/if}
						{/each}
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.metadata-list {
		padding-top: 0.5rem;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.metadata-list ul {
		margin: 0;
		padding: 0.5rem 1rem 1rem 1.5rem;
		list-style: disc;
	}

	.metadata-list li + li {
		margin-top: 0.375rem;
	}

	.metadata-list a {
		color: #632390;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
