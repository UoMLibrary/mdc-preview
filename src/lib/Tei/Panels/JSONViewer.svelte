<script>
	import { JsonView } from '@zerodevx/svelte-json-view';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	let { jsonData, depth = 0, title = '', savefile = 'data.json', message = '' } = $props();

	let currentDepth = $derived(depth);

	const objectDepth = (o) =>
		Object(o) === o ? 1 + Math.max(-1, ...Object.values(o).map(objectDepth)) : 0;

	const maxDepth = $derived(objectDepth(jsonData) || 0);

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
				<button class="" onclick={decreaseDepth}
					><SvgIcon name="square-minus" color="#666666" scale="1.0" /></button
				>
				<span class="py-2">{currentDepth + 1}</span>
				<button class="mr-2" onclick={increaseDepth}
					><SvgIcon name="square-plus" color="#666666" scale="1.0" /></button
				>
			{/if}

			{#if jsonData && Object.keys(jsonData).length}
				<SaveJsonFileButton {jsonData} fileName={savefile}>
					{#snippet children(saveFile)}
						<button type="button" class="p-1 mr-2" onclick={saveFile}>Save</button>
					{/snippet}
				</SaveJsonFileButton>
			{/if}
			<!-- <button class="p-1 mr-2" onclick={clear}>Clear</button> -->
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
