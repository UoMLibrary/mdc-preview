<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	import ThemeSwitch from '$lib/App/ThemeSwitch.svelte';
	import { closeTeiFile, openTeiFile } from '$lib/Tei/tei-file-actions.js';
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let fileMenuOpen = $state(false);
	let fileMenuButton = $state<HTMLButtonElement | null>(null);
	let fileMenuPanel = $state<HTMLDivElement | null>(null);

	const previewHref = resolve('/');
	const helpHref = resolve('/help');
	const settingsHref = resolve('/settings');

	const isHelpRoute = $derived(page.route.id === '/help');
	const isSettingsRoute = $derived(page.route.id === '/settings');
	const isClosableRoute = $derived(isHelpRoute || isSettingsRoute);

	function toggleFileMenu() {
		fileMenuOpen = !fileMenuOpen;
	}

	function closeFileMenu() {
		fileMenuOpen = false;
	}

	async function handleOpenTeiFile() {
		closeFileMenu();
		await openTeiFile();
	}

	function handleCloseProject() {
		closeTeiFile();
		closeFileMenu();
	}

	function handleWindowClick(event: MouseEvent) {
		if (!fileMenuOpen) return;

		const target = event.target as Node | null;
		if (target && (fileMenuButton?.contains(target) || fileMenuPanel?.contains(target))) return;

		closeFileMenu();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
			event.preventDefault();
			void handleOpenTeiFile();
			return;
		}

		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'w') {
			event.preventDefault();
			handleCloseProject();
			return;
		}

		if (event.key === 'Escape') closeFileMenu();
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="app-shell">
	<header class="app-shell__chrome">
		<div class="app-shell__left">
			<nav class="app-shell__menus" aria-label="Application menus">
				<div class="app-shell__menu-wrap">
					<button
						bind:this={fileMenuButton}
						type="button"
						class="app-shell__menu-trigger"
						class:app-shell__menu-trigger--active={fileMenuOpen}
						aria-haspopup="true"
						aria-expanded={fileMenuOpen}
						onclick={toggleFileMenu}
					>
						File
					</button>

					{#if fileMenuOpen}
						<div
							bind:this={fileMenuPanel}
							class="app-shell__menu-panel"
							transition:fade={{ duration: 90 }}
						>
							<button type="button" class="app-shell__menu-item" onclick={handleOpenTeiFile}>
								<span>Open TEI file</span>
								<span class="app-shell__shortcut">Cmd/Ctrl+O</span>
							</button>
							<button type="button" class="app-shell__menu-item" onclick={handleCloseProject}>
								<span>Close</span>
								<span class="app-shell__shortcut">Cmd/Ctrl+W</span>
							</button>
							<div class="app-shell__menu-separator"></div>
							<a class="app-shell__menu-item" href={settingsHref} onclick={closeFileMenu}
								>Settings</a
							>
						</div>
					{/if}
				</div>

				<a
					class="app-shell__menu-trigger"
					class:app-shell__menu-trigger--active={isHelpRoute}
					href={helpHref}
					aria-current={isHelpRoute ? 'page' : undefined}
				>
					Help
				</a>
			</nav>
		</div>

		<div class="app-shell__right">
			<ThemeSwitch />
			{#if isClosableRoute}
				<a
					class="app-shell__icon-button"
					href={previewHref}
					aria-label={isHelpRoute ? 'Close help' : 'Close settings'}
					title={isHelpRoute ? 'Close help' : 'Close settings'}
				>
					<SvgIcon name="xmark" scale="0.82" />
				</a>
			{:else}
				<a
					class="app-shell__icon-button"
					href={settingsHref}
					aria-label="Open settings"
					title="Settings"
				>
					<SvgIcon name="gear" scale="0.92" />
				</a>
			{/if}
		</div>
	</header>

	<main class="app-shell__main">
		{@render children()}
	</main>
</div>
