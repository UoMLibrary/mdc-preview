<script>
	import Child from './Child.svelte';
	import Children from './Children.svelte';

	let { children: structureChildren = [], page = 1, updatepage = () => {} } = $props();
</script>

<div class="m-3 border border-gray-300 rounded-md overflow-hidden text-sm">
	{#each structureChildren as child (child.data?.startPagePosition ?? child.data?.label ?? child)}
		{#if child.children}
			<div class="m-3 border border-gray-300 rounded-md overflow-hidden text-sm">
				<Child data={child.data} {page} />
				<div>
					<Children children={child.children} {page} {updatepage} />
				</div>
			</div>
		{:else}
			<Child data={child.data} {page} {updatepage} clickable={true} />
		{/if}
	{/each}
</div>
