<script lang="ts">
	interface Props {
		tabItems?: string[];
		activeItem: string;
		tabChange?: (item: string) => void;
	}

	let { tabItems = [], activeItem, tabChange = () => {} }: Props = $props();
</script>

<nav class="item-tabs">
	<ul class="item-tabs__list">
		{#each tabItems as item (item)}
			<li class="item-tabs__item">
				<button
					type="button"
					class="item-tabs__button"
					onclick={() => tabChange(item)}
					class:active={item === activeItem}
				>
					<span class="item-tabs__label">{item}</span>
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
