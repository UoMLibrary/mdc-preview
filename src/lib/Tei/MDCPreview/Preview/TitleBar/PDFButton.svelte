<script lang="ts">
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	interface Props {
		onclick?: () => void;
	}

	let { onclick = () => {} }: Props = $props();
</script>

<button {onclick}>
	<SvgIcon name="file-pdf" class="mdc-icon--light" scale="1.0" />
</button>
