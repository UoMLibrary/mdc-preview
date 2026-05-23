<script>
	import Information from './MetaData/Information.svelte';

	let { metadata } = $props();
</script>

<div class="m-4">
	<Information {metadata} />
</div>
