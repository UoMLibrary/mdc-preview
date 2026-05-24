<script lang="ts">
	// import { JsonView } from '@zerodevx/svelte-json-view'; // Debugging
	import Children from './Content/Children.svelte';
	import Child from './Content/Child.svelte';
	import type { ContentsObject } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		contents?: ContentsObject;
		page?: number;
		updatepage?: UpdatePage;
	}

	// No content - https://www.digitalcollections.manchester.ac.uk/view/AR-HAM-00001-00001-00002-00001/1
	// Simple version - https://www.digitalcollections.manchester.ac.uk/view/MS-PERSIAN-00013/773
	// can be nested - see https://stage.digitalcollections.manchester.ac.uk/view/VS-VPH-00023/1
	// recursion in Svelte - https://svelte.dev/tutorial/svelte-self
	let { contents, page = 1, updatepage = () => {} }: Props = $props();

	const childStructures = $derived(contents?.structure?.children ?? []);
</script>

<div class="contents-panel">
	{#if contents?.structure?.data}
		<div class="contents-section">
			<Child data={contents.structure.data} {updatepage} clickable={true} {page} />
		</div>
	{/if}

	{#if childStructures.length > 0}
		<Children children={childStructures} {updatepage} {page} />
	{/if}
</div>
<!-- DEBUGGING -->
<!-- {#if contents?.structure}
	<div>
		<JsonView depth="4" json={contents.structure} />
	</div>
{/if} -->
