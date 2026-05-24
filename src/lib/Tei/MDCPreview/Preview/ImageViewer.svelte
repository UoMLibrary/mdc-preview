<script lang="ts">
	import SvgIcon from '$lib/UI/SvgIcon.svelte';
	import { onMount } from 'svelte';

	type OpenSeadragonModule = typeof import('openseadragon');
	type OpenSeadragonViewer = import('openseadragon').Viewer;

	interface Props {
		pages?: unknown[];
		page?: number;
		showNavigator?: boolean;
		preserveSettings?: boolean;
	}

	// The OpenSeadragon import and viewer instance https://openseadragon.github.io/
	let OpenSeadragon: OpenSeadragonModule | null = null;
	let viewer = $state<OpenSeadragonViewer | null>(null);

	let {
		pages = [],
		page = 1,
		showNavigator = true,
		preserveSettings = $bindable(false)
	}: Props = $props();

	let tiles = $derived.by(() => {
		const imageUrl = pages[page - 1];
		return imageUrl ? [imageUrl] : [];
	});

	$effect(() => {
		if (!viewer || !tiles.length) return;
		viewer.open(tiles, page);
	});

	onMount(() => {
		let cancelled = false;

		// Dynamically load openseadragon so it doesn't try to run on the server
		void import('openseadragon').then((module) => {
			OpenSeadragon = module;
			if (!cancelled) setupOpenSeaDragonViewer();
		});

		return () => {
			cancelled = true;
			destroyOpenSeaDragonViewer();
		};
	});

	function setupOpenSeaDragonViewer(): void {
		if (!OpenSeadragon) return;
		// https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
		// https://openseadragon.github.io/docs/OpenSeadragon.Viewer.html#goToNextPage
		viewer = new OpenSeadragon.default({
			id: 'seadragon-viewer',
			debugMode: false,
			autoHideControls: true,
			showRotationControl: true,
			zoomInButton: 'zoomIn',
			zoomOutButton: 'zoomOut',
			homeButton: 'zoomHome', // Optional button set in viewer properties
			rotateLeftButton: 'rotateLeft',
			rotateRightButton: 'rotateRight',
			fullPageButton: 'fullscreen',
			maxZoomPixelRatio: 1,
			minZoomImageRatio: 1,
			showNavigator: showNavigator,
			navigatorPosition: 'TOP_LEFT',
			gestureSettingsTouch: true, // Cambridge have this set
			preserveViewport: preserveSettings //  remembers the zoom and pan between images.
		});

		viewer.addHandler('home', zoomHomeEventHandler);
	}

	function zoomHomeEventHandler(): void {
		// Reset the rotation when zooming to the home position
		viewer?.viewport.setRotation(0);
	}

	function destroyOpenSeaDragonViewer(): void {
		if (!viewer) return;
		viewer.removeHandler('home', zoomHomeEventHandler);
		viewer.destroy();
		viewer = null;
	}

	// Only way to update preserve viewport is to tear down the viewer and
	// initialise a new one
	function updatePreserveViewport(): void {
		destroyOpenSeaDragonViewer();
		setupOpenSeaDragonViewer();
	}
</script>

<div class="image-viewer">
	<div id="seadragon-viewer" class="image-viewer__canvas"></div>

	<div class="image-viewer__fullscreen">
		<button class="image-viewer__button" id="fullscreen"
			><SvgIcon name="expand" color="white" scale="1.0" /></button
		>
	</div>

	<div class="image-viewer__controls">
		<button class="image-viewer__button" id="zoomHome"
			><SvgIcon name="home" color="white" scale="1.0" /></button
		>
		<button class="image-viewer__button" id="zoomIn"
			><SvgIcon name="magnifying-glass-plus" color="white" scale="1.0" /></button
		>
		<button class="image-viewer__button" id="zoomOut"
			><SvgIcon name="magnifying-glass-minus" color="white" scale="1.0" /></button
		>
		<button class="image-viewer__button" id="rotateLeft"
			><SvgIcon name="rotate-left" color="white" scale="1.0" /></button
		>
		<button class="image-viewer__button" id="rotateRight"
			><SvgIcon name="rotate-right" color="white" scale="1.0" /></button
		>

		<div class="image-viewer__option">
			<input
				class="image-viewer__checkbox"
				type="checkbox"
				id="preserve-viewport"
				bind:checked={preserveSettings}
				onchange={updatePreserveViewport}
			/>
			<label for="preserve-viewport" class="image-viewer__label">Preserve state</label>
		</div>
	</div>
</div>
