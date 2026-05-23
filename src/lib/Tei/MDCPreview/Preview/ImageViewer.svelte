<script>
	import Icon from 'svelte-awesome';
	import {
		faHouse,
		faMagnifyingGlassPlus,
		faMagnifyingGlassMinus,
		faRotateLeft,
		faRotateRight,
		faUpRightAndDownLeftFromCenter
	} from '@fortawesome/free-solid-svg-icons';
	import { onMount } from 'svelte';

	// The OpenSeadragon import and viewer instance https://openseadragon.github.io/
	let OpenSeadragon;
	let viewer;

	// params
	export let pages;
	export let page;
	export let showNavigator = true;
	export let preserveSettings = false;

	let tiles = [];

	$: updateTiles(pages, page);
	$: if (viewer) viewer.open(tiles, page);

	onMount(async () => {
		// Dynamically load openseadragon so it doesn't try to run on the server
		OpenSeadragon = await import('openseadragon');
		setupOpenSeaDragonViewer();
		updateTiles(pages, page);
	});

	function updateTiles(pages, page) {
		tiles = [];
		let imageUrl = pages[page - 1];
		tiles.push(imageUrl);
	}

	function setupOpenSeaDragonViewer() {
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

	function zoomHomeEventHandler(event) {
		// Reset the rotation when zooming to the home position
		viewer.viewport.setRotation(0);
	}

	// Only way to update preserve viewport is to tear down the viewer and
	// initialise a new one
	function updatePreserveViewport() {
		viewer.removeHandler('home', zoomHomeEventHandler);
		viewer.destroy();
		viewer = null;
		setupOpenSeaDragonViewer();
	}
</script>

<div class="bg-black flex relative h-[600px]">
	<div id="seadragon-viewer" class="flex-1"></div>

	<div class="absolute top-0 right-0 m-2">
		<button class="text-white bg-slate-800 px-3 py-1 rounded" id="fullscreen"
			><Icon data={faUpRightAndDownLeftFromCenter} style="color: white" scale="1.0" /></button
		>
	</div>

	<div class="flex gap-x-2 absolute bottom-0 left-0 m-2">
		<button class="text-white bg-slate-800 px-3 py-1 rounded" id="zoomHome"
			><Icon data={faHouse} style="color: white" scale="1.0" /></button
		>
		<button class="text-white bg-slate-800 px-3 py-1 rounded" id="zoomIn"
			><Icon data={faMagnifyingGlassPlus} style="color: white" scale="1.0" /></button
		>
		<button class="text-white bg-slate-800 px-3 py-1 rounded" id="zoomOut"
			><Icon data={faMagnifyingGlassMinus} style="color: white" scale="1.0" /></button
		>
		<button class="text-white bg-slate-800 px-3 py-1 rounded" id="rotateLeft"
			><Icon data={faRotateLeft} style="color: white" scale="1.0" /></button
		>
		<button class="text-white bg-slate-800 px-3 py-1 rounded" id="rotateRight"
			><Icon data={faRotateRight} style="color: white" scale="1.0" /></button
		>

		<div class="flex py-1">
			<input
				class="ml-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				type="checkbox"
				id="preserve-viewport"
				bind:checked={preserveSettings}
				on:change={(e) => updatePreserveViewport()}
			/>
			<label for="preserve-viewport" class="ml-2 text-xs text-shadow-xs font-medium text-white"
				>Preserve state</label
			>
		</div>
	</div>
</div>
