<script lang="ts">
	import JsonTree from '$lib/UI/JsonTree.svelte';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	type JsonData = unknown;
	type JsonContainer = Record<string, unknown> | unknown[];
	type JsonTreeHandle = {
		resetManualExpansion: () => void;
	};

	interface Props {
		jsonData?: JsonData | null;
		depth?: number;
		title?: string;
		savefile?: string;
		message?: string;
	}

	let { jsonData, depth = 0, title = '', savefile = 'data.json', message = '' }: Props = $props();

	let currentDepth = $derived(depth);
	let jsonTree = $state<JsonTreeHandle | null>(null);

	const maxDepth = $derived(getMaxContainerDepth(jsonData));
	const hasJsonData = $derived(isObjectWithKeys(jsonData));

	function isObjectWithKeys(value: unknown): value is object {
		return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
	}

	function isJsonContainer(value: unknown): value is JsonContainer {
		return typeof value === 'object' && value !== null;
	}

	function getMaxContainerDepth(value: unknown, depth = 0): number {
		if (!isJsonContainer(value)) return Math.max(0, depth - 1);

		const childDepths = Object.values(value).map((entry) => getMaxContainerDepth(entry, depth + 1));
		return Math.max(depth, ...childDepths);
	}

	function clampDepth(value: number) {
		return Math.min(Math.max(value, 0), maxDepth);
	}

	function setGlobalDepth(value: number) {
		currentDepth = clampDepth(value);
		jsonTree?.resetManualExpansion();
	}

	function increaseDepth() {
		setGlobalDepth(currentDepth + 1);
	}
	function decreaseDepth() {
		setGlobalDepth(currentDepth - 1);
	}

	function collapseAll() {
		setGlobalDepth(0);
	}

	function expandAll() {
		setGlobalDepth(maxDepth);
	}
</script>

<div class="tool-panel">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
		<div>
			{#if maxDepth > 0}
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
				<button type="button" class="tool-panel__button" onclick={collapseAll}>Collapse all</button>
				<button type="button" class="tool-panel__button" onclick={expandAll}>Expand all</button>
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
			<JsonTree bind:this={jsonTree} depth={currentDepth} value={jsonData} />
		{:else}
			<div class="tool-panel__message">{message}</div>
		{/if}
	</div>
</div>
