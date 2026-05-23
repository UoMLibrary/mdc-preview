<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import { createViewModel } from '$lib/Tei/createViewModel.js';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	// We load the sef when the page is loaded, this preview page doen't need to react to
	// live updates in the sef files
	import { sef as preTransformSef } from '../preTransform.sef.json';
	import { sef as jsonTransformSef } from '../JSONTransform.sef.json';

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

	// Variables
	export let form;
	let xmlString;
	let ViewModelOutput;
	let page = 0;
	let loading = true;

	onMount(async () => {
		loading = true;

		// Bugfix: Clean up supplied XmlString
		xmlString = bugFix_cleanOutFacsimileElement(form?.teistring);

		// Pre transform
		let transformConfig = {
			sourceText: xmlString,
			destination: 'serialized',
			stylesheetInternal: preTransformSef
		};
		let preTransformObj = await SaxonJS.transform(transformConfig, 'async');
		let preTransformXmlString = preTransformObj.principalResult;

		// JsonTransform
		transformConfig = {
			sourceText: preTransformXmlString,
			destination: 'serialized',
			stylesheetInternal: jsonTransformSef
		};
		let JsonTransformObj = await SaxonJS.transform(transformConfig, 'async');
		let JSONTransformObjOutput = JSON.parse(JsonTransformObj.principalResult);

		// Viewmodel creation
		ViewModelOutput = createViewModel(JSONTransformObjOutput, configData.manchester);

		loading = false;
	});

	// Handle page navigation from Preview internal components.
	function changePage(event) {
		page = event.detail.page;
	}

	// BUGFIX: If there is no graphic data the JSON transformation will fail, we can fix this
	// by clearing out the <facsimile></facsimile><text></text> elements so they are empty
	// See Toms script - https://bitbucket.org/unimanlibrarydevs/mdc-metadata-api/src/master/clean.py
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
</script>

<div class="p-4 bg-slate-300 pb-32 min-h-screen">
	{#if !loading}
		<PreviewPanel
			title="Preview"
			message="Preview generation requires a TEI to be loaded"
			viewModel={ViewModelOutput}
			{page}
			on:updatepage={changePage}
		/>

		<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
		<JSONViewer
			jsonData={ViewModelOutput}
			title="View Model"
			savefile="viewmodel.json"
			message="View Model generation requires a TEI to be loaded"
		/>
	{:else}
		<div class="flex justify-center">
			<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
		</div>
	{/if}
</div>
