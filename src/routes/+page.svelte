<script lang="ts">
	import EmptyWorkspace from '$lib/App/EmptyWorkspace.svelte';
	import PreviewWorkspace from '$lib/Tei/PreviewWorkspace.svelte';
	import TeiStore from '$lib/stores/tei-store.js';
</script>

{#if $TeiStore?.xmlDoc}
	<PreviewWorkspace />
{:else if $TeiStore?.errors?.length}
	<EmptyWorkspace title="Unable to load TEI file" messages={$TeiStore.errors} />
{:else}
	<EmptyWorkspace />
{/if}
