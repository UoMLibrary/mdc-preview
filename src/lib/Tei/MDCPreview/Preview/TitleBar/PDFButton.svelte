<script>
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	let { onclick = () => {} } = $props();
</script>

<button {onclick}>
	<SvgIcon name="file-pdf" class="text-white" scale="1.0" />
</button>
