<script lang="ts">
	interface Props {
		title?: string;
		messages?: string[] | null;
	}

	let { title = 'No project loaded', messages = null }: Props = $props();
</script>

<section class="empty-workspace" aria-live="polite">
	<div class="empty-workspace__content">
		<h1 class="empty-workspace__title">{title}</h1>
		{#if messages?.length}
			<div class="empty-workspace__messages">
				{#each messages as message, index (index)}
					<p>{message}</p>
				{/each}
			</div>
		{/if}
	</div>
</section>
