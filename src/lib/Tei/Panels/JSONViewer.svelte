<script>
	import Modal from '$lib/UI/MarkdownModal.svelte';
	let showModal = false;

	import { JsonView } from '@zerodevx/svelte-json-view';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import Icon from 'svelte-awesome';
	import { faSquarePlus, faSquareMinus } from '@fortawesome/free-regular-svg-icons';

	export let markdownHelp;
	export let jsonData;
	export let depth = 0;
	export let title = '';
	export let savefile = 'data.json';
	export let message = '';

	let currentDepth = depth;
	let maxDepth = 0;

	const objectDepth = (o) =>
		Object(o) === o ? 1 + Math.max(-1, ...Object.values(o).map(objectDepth)) : 0;

	$: maxDepth = objectDepth(jsonData) || 0;

	function increaseDepth() {
		currentDepth += 1;
		if (currentDepth > maxDepth - 1) currentDepth = maxDepth - 1;
	}
	function decreaseDepth() {
		currentDepth -= 1;
		if (currentDepth < 0) currentDepth = 0;
	}
</script>

<div class="rounded-md bg-white mb-4 text-xs pb-1">
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<div>
			{#if title}<p class="p-1 px-2 font-bold text-sm">{title}</p>{/if}
		</div>
		<div>
			{#if maxDepth > 1}
				<!-- only show depth tools if there is any depth -->
				<span class="py-2 mr-2">Depth: </span>
				<button class="" on:click={decreaseDepth}
					><Icon data={faSquareMinus} style="color: #666666" scale="1.0" /></button
				>
				<span class="py-2">{currentDepth + 1}</span>
				<button class="mr-2" on:click={increaseDepth}
					><Icon data={faSquarePlus} style="color: #666666" scale="1.0" /></button
				>
			{/if}

			{#if jsonData && Object.keys(jsonData).length}
				<SaveJsonFileButton let:saveFile {jsonData} fileName={savefile}>
					<button type="button" class="p-1 mr-2" on:click={saveFile}>Save</button>
				</SaveJsonFileButton>
			{/if}
			<!-- <button class="p-1 mr-2" on:click={(e) => dispatch('clear')}>Clear</button> -->

			{#if markdownHelp}
				<button
					class="w-4 h-4 mr-2 bg-gray-400 rounded-full text-white text-center text-xs"
					on:click={(e) => (showModal = true)}>?</button
				>
			{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4">
		{#if jsonData && Object.keys(jsonData).length}
			<JsonView depth={currentDepth} json={jsonData} />
		{:else}
			<div class="h-4">{message}</div>
		{/if}
	</div>
</div>

<Modal bind:showModal {title} markdown={markdownHelp} />
