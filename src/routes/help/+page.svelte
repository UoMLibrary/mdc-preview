<script lang="ts">
	import MarkdownDocument from '$lib/Docs/MarkdownDocument.svelte';

	interface Props {
		data: {
			readme: string;
		};
	}

	let { data }: Props = $props();
</script>

<div class="help-page">
	<MarkdownDocument markdown={data.readme} />
</div>
