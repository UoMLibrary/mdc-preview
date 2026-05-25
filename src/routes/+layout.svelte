<script lang="ts">
	import '../app.css';
	import AppShell from '$lib/App/AppShell.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<AppShell>
	{@render children()}
</AppShell>
