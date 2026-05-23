<script>
	import { browser } from '$app/environment';

	// Markdown popover help
	import previewToolOverviewDoc from '$lib/markdown/previewToolOverviewDoc.js';
	import SourceTeiDoc from '$lib/markdown/SourceTeiDoc.js';
	import preFilterXSLTDoc from '$lib/markdown/preFilterXSLTDoc.js';
	import preFilterOutputDoc from '$lib/markdown/preFilterOutputDoc.js';
	import jsonTransformXSLTDoc from '$lib/markdown/jsonTransformXSLTDoc.js';
	import CudlJSONDoc from '$lib/markdown/CudlJSONDoc.js';
	import ConfigDoc from '$lib/markdown/ConfigDoc.js';
	import ViewModelDoc from '$lib/markdown/ViewModelDoc.js';
	import PrintPanelDoc from '$lib/markdown/PrintPanelDoc.js';
	import previewPanelDoc from '$lib/markdown/previewPanelDoc.js';

	// Stores
	import TeiStore from '$lib/stores/tei-store.js';
	import SefStore from '$lib/stores/sef-store.js';
	import ConfigStore from '$lib/stores/config-store.js';

	// ViewModel processing
	import { createViewModel } from '$lib/Tei/createViewModel.js';

	// Tool Panels and Preview
	import SourceTEI from '$lib/Tei/Panels/SourceTEI.svelte';
	import XSLTViewer from '$lib/Tei/Panels/XSLTViewer.svelte';
	import XMLViewerPanel from '$lib/Tei/Panels/XMLViewerPanel.svelte';
	import JSONViewer from '$lib/Tei/Panels/JSONViewer.svelte';
	import Config from '$lib/Tei/Panels/Config.svelte';
	import PreviewPanel from '$lib/Tei/Panels/PreviewPanel.svelte';

	// UI
	import Modal from '$lib/UI/MarkdownModal.svelte';
	import SvgIcon from '$lib/UI/SvgIcon.svelte';
	import PrintPanel from '$lib/Tei/Panels/PrintPanel.svelte';

	let showModal = false;
	let page;
	let preTransformXmlDocOutput; // the output of the preTransform (transient)
	let JSONTransformObjOutput; // the output of the JSON transform (transient)
	let ViewModelOutput; // output of the View model transform (transient)

	let PreTransformError;
	let JSONtransformError;

	// Reactive statements. Any change to a var/store in the line starting with $:
	// causes the whole statement to execute
	$: runPreTransform($TeiStore.xmlDoc, $SefStore?.preTransform);
	$: runJSONTransform(preTransformXmlDocOutput, $SefStore?.jsonTransform);
	$: runViewModelTransform(JSONTransformObjOutput, $ConfigStore);

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

	async function runPreTransform(xmlDoc, sefObj) {
		PreTransformError = null;
		// browser check to prevent new XMLSerializer being called during a SSR attempt
		if (!browser || !xmlDoc || !$SefStore?.preTransform?.sef)
			return (preTransformXmlDocOutput = null);

		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);

		// BUGFIX: If there is no graphic data the JSON transformation will fail, we can fix this
		// by clearing out the <facsimile></facsimile><text></text> elements so they are empty
		// See Toms script - https://bitbucket.org/unimanlibrarydevs/mdc-metadata-api/src/master/clean.py
		xmlString = bugFix_cleanOutFacsimileElement(xmlString);

		let sefObjCopy = SefStore.getKeyCopy('preTransform'); // get a copy (see sef store for details)

		let transformConfig = {
			sourceText: xmlString,
			destination: 'serialized',
			stylesheetInternal: sefObjCopy
		};

		try {
			let transform = await SaxonJS.transform(transformConfig, 'async');
			let parser = new DOMParser();
			preTransformXmlDocOutput = parser.parseFromString(transform.principalResult, 'text/xml');

			// if (isParseError(preTransformXmlDocOutput)) {
			// 	console.log(transform.principalResult);
			// 	console.log(preTransformXmlDocOutput);
			// 	const serializer = new XMLSerializer();
			// 	const xmlStr = serializer.serializeToString(preTransformXmlDocOutput);
			// 	// preTransformXmlDocOutput = null;
			// 	throw new Error(xmlStr);
			// }
		} catch (error) {
			PreTransformError = error;
		}
	}

	async function runJSONTransform(xmlDoc, sefObj) {
		JSONtransformError = null;
		// browser check to prevent new XMLSerializer being called during a SSR attempt
		if (!browser || !xmlDoc || !$SefStore?.JSONTransform?.sef)
			return (JSONTransformObjOutput = null);

		let xmlString = new XMLSerializer().serializeToString(xmlDoc.documentElement);
		let sefObjCopy = SefStore.getKeyCopy('JSONTransform'); // get a copy (see sef store for details)

		let transformConfig = {
			sourceText: xmlString,
			destination: 'serialized',
			stylesheetInternal: sefObjCopy
		};

		try {
			let transform = await SaxonJS.transform(transformConfig, 'async');
			JSONTransformObjOutput = JSON.parse(transform.principalResult);
		} catch (error) {
			JSONtransformError = error;
		}
	}

	async function runViewModelTransform(cudlJson, configObj) {
		if (!cudlJson || !validateConfig(configObj)) {
			return (ViewModelOutput = null);
		}
		// Quick hack for new Object, transformation will make a copy
		let cudlJsonCopy = JSON.parse(JSON.stringify(cudlJson));
		ViewModelOutput = createViewModel(cudlJsonCopy, configObj);
	}

	function validateConfig(config) {
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

	// trying this as DomParser always seems to return valid XML
	// https://stackoverflow.com/questions/11563554/how-do-i-detect-xml-parsing-errors-when-using-javascripts-domparser-in-a-cross
	function isParseError(parsedDocument) {
		// parser and parsererrorNS could be cached on startup for efficiency
		var parser = new DOMParser(),
			errorneousParse = parser.parseFromString('<', 'text/xml'),
			parsererrorNS = errorneousParse.getElementsByTagName('parsererror')[0].namespaceURI;

		if (parsererrorNS === 'http://www.w3.org/1999/xhtml') {
			// In PhantomJS the parseerror element doesn't seem to have a special namespace, so we are just guessing here :(
			return parsedDocument.getElementsByTagName('parsererror').length > 0;
		}

		return parsedDocument.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0;
	}

	// Handle page navigation from Preview internal components.
	function changePage(event) {
		page = event.detail.page;
	}
</script>

<div class="p-4 bg-slate-300 pb-32">
	<!-- Preview tool Help Overview button -->
	<div class="flex justify-end mb-2">
		<button
			class="w-4 h-4 mr-2 bg-gray-400 rounded-full text-white text-center text-xs"
			on:click={(e) => (showModal = true)}>?</button
		>
	</div>

	<!-- UI to load TEI XML file -->
	<SourceTEI title="Source TEI Document" markdownHelp={SourceTeiDoc} />

	<!-- + symbol (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- UI to load preFilter XSLT doc and formats it to a form used by SaxtonJS -->
	<XSLTViewer title="Pre filter XSLT" markdownHelp={preFilterXSLTDoc} sefId="preTransform" />

	<!-- down arrow (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	{#if PreTransformError}
		<div class="rounded-md bg-red-50 mb-4 text-xs p-2 border-red-400 border-2">
			<p class="pb-2">
				<strong>{PreTransformError.name}</strong>
				<span class="text-sm">({PreTransformError.code})</span>
			</p>
			<p class="pb-2">{PreTransformError.message}</p>
			<pre class="text-sm">{PreTransformError.stack}</pre>
		</div>
	{/if}

	<!-- XML Viewer that contains preFilter transform XSLT output -->
	<XMLViewerPanel
		title="XML output from Pre filter transformation"
		xmlDoc={preTransformXmlDocOutput}
		markdownHelp={preFilterOutputDoc}
		saveFile="preFilterOutput.xml"
		message="XML content generation requires TEI XML and preFiler XSLT to be configured"
	/>

	<!-- + symbol (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- UI to load JSONTransform XSLT doc and formats it to a form used by SaxtonJS -->
	<XSLTViewer
		title="JSON formatter XSLT"
		markdownHelp={jsonTransformXSLTDoc}
		sefId="JSONTransform"
	/>

	<!-- down arrow (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	{#if JSONtransformError}
		<div class="rounded-md bg-red-50 mb-4 text-xs p-2 border-red-400 border-2">
			<p class="pb-2">
				<strong>{JSONtransformError.name}</strong>
				{#if JSONtransformError.code}<span class="text-sm">({JSONtransformError.code})</span>{/if}
			</p>
			<p class="pb-2">{JSONtransformError.message}</p>
			<pre class="text-sm">{JSONtransformError.stack}</pre>
		</div>
	{/if}

	<!-- JSON Viewer that contains JSONtransform XSLT output -->
	<JSONViewer
		jsonData={JSONTransformObjOutput}
		title="Cudl JSON output"
		savefile="jsonTransformOutput.json"
		markdownHelp={CudlJSONDoc}
		message="JSON content generation requires Prefilter Output and JSON transform XSLT to be configured"
	/>

	<!-- + symbol (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="plus" color="#666666" scale="1.0" />
	</div>

	<!-- UI to specify url paths etc for transform into final JSON ViewModel -->
	<Config title="Configuration" markdownHelp={ConfigDoc} />

	<!-- down arrow (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	<!-- JSON Viewer that contains ViewModel output (not part of existing process) -->
	<JSONViewer
		jsonData={ViewModelOutput}
		title="View Model"
		savefile="viewmodel.json"
		markdownHelp={ViewModelDoc}
		message="View Model generation requires Cudl Output and Configuration be configured"
	/>

	<!-- down arrow (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	<!-- Print panel to give option of downloading a pdf of available images -->
	<PrintPanel title="Print pdf" markdownHelp={PrintPanelDoc} data={ViewModelOutput?.pdfObj} />

	<!-- down arrow (decorative) -->
	<div class="flex justify-center mb-4">
		<SvgIcon name="arrow-down" color="#666666" scale="1.2" />
	</div>

	<!-- Preview panel showing an example of the final viewer output, contains an embedded
		 Preview component. TODO: specify 'Preview' here to swap between a pure data view 
		 and a styled view for a particular organisation.  -->
	<PreviewPanel
		title="Preview"
		markdownHelp={previewPanelDoc}
		message="Preview generation requires a ViewModel to be set"
		viewModel={ViewModelOutput}
		{page}
		on:updatepage={changePage}
	/>

	<!-- Transcriptions/translations XSLT -->
</div>

<Modal bind:showModal title="Preview Tool" markdown={previewToolOverviewDoc} />
