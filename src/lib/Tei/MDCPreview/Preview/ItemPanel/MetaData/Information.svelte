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

		<div class="pt-2 prose-sm">
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
