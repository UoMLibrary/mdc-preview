<script lang="ts">
	import { JsonView } from '@zerodevx/svelte-json-view';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	type JsonData = unknown;

	interface Props {
		jsonData?: JsonData | null;
		depth?: number;
		title?: string;
		savefile?: string;
		message?: string;
	}

	let { jsonData, depth = 0, title = '', savefile = 'data.json', message = '' }: Props = $props();

	let currentDepth = $derived(depth);

	const objectDepth = (value: unknown): number =>
		Object(value) === value
			? 1 + Math.max(-1, ...Object.values(value as Record<string, unknown>).map(objectDepth))
			: 0;

	const maxDepth = $derived(objectDepth(jsonData) || 0);
	const hasJsonData = $derived(isObjectWithKeys(jsonData));

	function isObjectWithKeys(value: unknown): value is object {
		return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
	}

	function increaseDepth() {
		currentDepth += 1;
		if (currentDepth > maxDepth - 1) currentDepth = maxDepth - 1;
	}
	function decreaseDepth() {
		currentDepth -= 1;
		if (currentDepth < 0) currentDepth = 0;
	}
</script>

<div class="tool-panel">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
		<div>
			{#if maxDepth > 1}
				<!-- only show depth tools if there is any depth -->
				<span class="tool-panel__json-depth-label">Depth: </span>
				<button onclick={decreaseDepth}
					><SvgIcon name="square-minus" color="#666666" scale="1.0" /></button
				>
				<span class="tool-panel__json-depth-value">{currentDepth + 1}</span>
				<button class="tool-panel__json-depth-button" onclick={increaseDepth}
					><SvgIcon name="square-plus" color="#666666" scale="1.0" /></button
				>
			{/if}

			{#if hasJsonData}
				<SaveJsonFileButton {jsonData} fileName={savefile}>
					{#snippet children(saveFile)}
						<button type="button" class="tool-panel__button" onclick={saveFile}>Save</button>
					{/snippet}
				</SaveJsonFileButton>
			{/if}
			<!-- <button class="tool-panel__button" onclick={clear}>Clear</button> -->
		</div>
	</div>
	<!-- Panel Body -->
	<div class="tool-panel__body">
		{#if hasJsonData}
			<JsonView depth={currentDepth} json={jsonData} />
		{:else}
			<div class="tool-panel__message">{message}</div>
		{/if}
	</div>
</div>
