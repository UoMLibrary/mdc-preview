<script>
	import { browser } from '$app/environment';

	// Tool Panels and Preview
	import SourceTEI from '$lib/Tei/Panels/SourceTEI.svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';

	// Stores
	import TeiStore from '$lib/stores/tei-store.js';

	const configData = {
		cambridge: {
			viewerTemplate: 'https://images.lib.cam.ac.uk/iiif/{imagerefwithpage}.jp2/info.json',
			thumbnailTemplate:
				'https://images.lib.cam.ac.uk/content/images/{imagerefwithpage}_files/8/0_0.jpg',
			printTemplate:
				'https://images.lib.cam.ac.uk/iiif/{imagerefwithpage}.jp2/full/!400,400/0/default.jpg'
		},
		lancaster: {
			viewerTemplate:
				'https://iiif.digitalcollections.lancaster.ac.uk/iiif/2/{imagerefwithpage}.jp2/info.json',
			thumbnailTemplate:
				'https://iiif.digitalcollections.lancaster.ac.uk/iiif/2/{imagerefwithpage}.jp2/full/,150/0/default.jpg',
			printTemplate:
				'https://iiif.digitalcollections.lancaster.ac.uk/iiif/2/{imagerefwithpage}.jp2/full/,600/0/default.jpg'
		},
		manchester: {
			viewerTemplate:
				'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/info.json',
			thumbnailTemplate:
				'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/full/,150/0/default.jpg',
			printTemplate:
				'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/full/,600/0/default.jpg'
		}
	};

	// We load the sef when the page is loaded, this preview page doen't need to react to
	// live updates in the sef files
	import { sef as preTransformSef } from './preTransform.sef.json';
	import { sef as jsonTransformSef } from './JSONTransform.sef.json';

	// ViewModel processing
	import { createViewModel } from '$lib/Tei/createViewModel.js';

	let page = $state(0);
	let selectedOrg = $state('manchester');
	let selectedConfig = $derived(configData[selectedOrg]);

	let preTransformXmlDocOutput = $state(); // the output of the preTransform (transient)
	let JSONTransformObjOutput = $state(); // the output of the JSON transform (transient)
	let ViewModelOutput = $state(); // output of the View model transform (transient)

	$effect(() => {
		runPreTransform($TeiStore.xmlDoc);
	});

	$effect(() => {
		runJSONTransform(preTransformXmlDocOutput);
	});

	$effect(() => {
		runViewModelTransform(JSONTransformObjOutput, selectedConfig);
	});

	function bugFix_cleanOutFacsimileElement(xmlString) {
		let start = xmlString.indexOf('<facsimile>');
		let end = xmlString.indexOf('</text>') + 7;

		if (start > 0 && end > 0) {
			let facsTextElems = xmlString.substring(start, end);
			if (!facsTextElems.includes('<graphic')) {
				xmlString = `${xmlString.substring(
					0,
					start
				)}<facsimile></facsimile><text></text>${xmlString.substring(end)}`;
			}
		}
		return xmlString;
	}

	async function runPreTransform(xmlDoc) {
		// browser check to prevent new XMLSerializer being called during a SSR attempt
		if (!browser || !xmlDoc || !preTransformSef) return (preTransformXmlDocOutput = null);

		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);

		// BUGFIX: If there is no graphic data the JSON transformation will fail, we can fix this
		// by clearing out the <facsimile></facsimile><text></text> elements so they are empty
		// See Toms script - https://bitbucket.org/unimanlibrarydevs/mdc-metadata-api/src/master/clean.py
		xmlString = bugFix_cleanOutFacsimileElement(xmlString);

		let sefObjCopy = preTransformSef; // TODO: Check if we need to reload each time (see sef store for details)

		let transformConfig = {
			sourceText: xmlString,
			destination: 'serialized',
			stylesheetInternal: sefObjCopy
		};
		let transform = await SaxonJS.transform(transformConfig, 'async');

		// TODO: Handle errors
		let parser = new DOMParser();
		preTransformXmlDocOutput = parser.parseFromString(transform.principalResult, 'text/xml');
	}

	async function runJSONTransform(xmlDoc) {
		// browser check to prevent new XMLSerializer being called during a SSR attempt
		if (!browser || !xmlDoc || !jsonTransformSef) return (JSONTransformObjOutput = null);

		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);
		let sefObjCopy = jsonTransformSef; // TODO: Check if we need to reload each time (see sef store for details)

		let transformConfig = {
			sourceText: xmlString,
			destination: 'serialized',
			stylesheetInternal: sefObjCopy
		};
		let transform = await SaxonJS.transform(transformConfig, 'async');

		// TODO: Handle errors
		JSONTransformObjOutput = JSON.parse(transform.principalResult);
	}

	async function runViewModelTransform(cudlJson, config) {
		if (!cudlJson || !validateConfig(config)) {
			return (ViewModelOutput = null);
		}
		// Quick hack for new Object, transformation will make a copy
		let cudlJsonCopy = JSON.parse(JSON.stringify(cudlJson));
		ViewModelOutput = createViewModel(cudlJsonCopy, config);
	}

	function validateConfig(config) {
		if (!config) return false;
		// Check the required template strings are there and that the contain
		// the substitution strings
		if (
			config.printTemplate == '' ||
			config.thumbnailTemplate == '' ||
			config.viewerTemplate == '' ||
			!config.printTemplate.includes('{imagerefwithpage}') ||
			!config.thumbnailTemplate.includes('{imagerefwithpage}') ||
			!config.viewerTemplate.includes('{imagerefwithpage}')
		)
			return false;
		else return true;
	}

	function selectConfig(org) {
		selectedOrg = org;
	}

	// Handle page navigation from Preview internal components.
	function changePage(nextPage) {
		page = nextPage;
	}
</script>

<div class="p-4 bg-slate-300 pb-32 min-h-screen">
	<!-- UI to load TEI XML file -->
	<SourceTEI title="Source TEI Document" />
	<div class="flex text-xs">
		<button
			class="m-2 mr-2 mb-4 p-2 bg-blue-500 rounded text-white {selectedOrg == 'cambridge'
				? 'bg-red-500'
				: ''}"
			onclick={() => selectConfig('cambridge')}>Cambridge</button
		>
		<button
			class="m-2 mr-2 mb-4 p-2 bg-blue-500 rounded text-white {selectedOrg == 'lancaster'
				? 'bg-red-500'
				: ''}"
			onclick={() => selectConfig('lancaster')}>Lancaster</button
		>
		<button
			class="m-2 mr-2 mb-4 p-2 bg-blue-500 rounded text-white {selectedOrg == 'manchester'
				? 'bg-red-500'
				: ''}"
			onclick={() => selectConfig('manchester')}>Manchester</button
		>
	</div>

	<!-- Preview panel showing an example of the final viewer output, contains an embedded
		 Preview component. TODO: specify 'Preview' here to swap between a pure data view 
		 and a styled view for a particular organisation.  -->
	<PreviewPanel
		title="Preview"
		message="Preview generation requires a TEI to be loaded"
		viewModel={ViewModelOutput}
		{page}
		updatepage={changePage}
	/>

	<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
	<JSONViewer
		jsonData={ViewModelOutput}
		title="View Model"
		savefile="viewmodel.json"
		message="View Model generation requires a TEI to be loaded"
	/>
</div>
