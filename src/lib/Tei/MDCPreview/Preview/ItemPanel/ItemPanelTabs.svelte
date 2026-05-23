<script>
	let { tabItems = [], activeItem, tabChange = () => {} } = $props();
</script>

<nav class="bg-zinc-100">
	<ul class="flex text-sm text-zinc-800 border-b-[1px]">
		{#each tabItems as item (item)}
			<li class="relative">
				<button
					type="button"
					class="cursor-pointer px-5 py-3 relative"
					onclick={() => tabChange(item)}
					class:active={item === activeItem}
				>
					<span class="select-none">{item}</span>
				</button>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.active {
		background: white;
	}

	.active::after {
		content: '';
		display: inline;
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		border-bottom: 1px solid #fff !important;
	}
</style>
