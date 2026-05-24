<script lang="ts">
	import Information from './MetaData/Information.svelte';
	import type { DisplayMetadataItem } from '$lib/Tei/createViewModel.js';

	interface Props {
		metadata: DisplayMetadataItem[];
	}

	let { metadata }: Props = $props();
</script>

<div class="metadata-panel">
	<Information {metadata} />
</div>
