<script>
	import { printpage } from '$lib/Utils/printpage.js';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	let { title = '', data } = $props();

	let progressText = $state('');
	let isBuildingPdf = $state(false);

	// PRINT FUNCTIONS AND CALLBACKS
	async function printItem(cols) {
		if (!data || data.items.length === 0) return;

		try {
			isBuildingPdf = true;
			data.cols = cols;
			await printpage(data, progressCallback, completedCallback);
		} catch (error) {
			console.error(error);
		}
	}

	// declare callbacks for build progress and completion
	function progressCallback(label, progress) {
		// console.log(label, progress);
		progressText = `${label} ${progress}%`;
	}

	function completedCallback(missing_images) {
		isBuildingPdf = false;
		// console.log('pdf build complete');
		if (missing_images.length > 0) console.log(missing_images);
		// TODO: REPORT THESE BACK FOR TOOL
	}

	/*EXAMPLE DATA STRUCTURE

let pdf_data = {
    filename: 'output.pdf',
    cols: 4,
    header_text: 'The header\nText',
    footer_text: 'The footer\nText',
    items: [
        {
            image_url:
                'https://image.digitalcollections.manchester.ac.uk/iiif/PR-INCU-18313-000-00001.jp2/full/,150/0/default.jpg',
            image_text: 'Line 1\nLine 2\nLine 3',
            width: 6000,
            height: 4500
        },
        {
            image_url:
                'https://image.digitalcollections.manchester.ac.uk/iiif/PR-INCU-18313-000-00002.jp2/full/,150/0/default.jpg',
            image_text: 'Line 1\nLine 2\nLine 3',
            width: 6000,
            height: 4500
        },
        {
            image_url:
                'https://image.digitalcollections.manchester.ac.uk/iiif/PR-INCU-18313-000-00003.jp2/full/,150/0/default.jpg',
            image_text: 'Line 1\nLine 2\nLine 3',
            width: 4500,
            height: 5000
        }
    ]
};*/
</script>

<div class="rounded-md bg-white mb-4 text-xs pb-1">
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<div>
			{#if title}<p class="p-1 px-2 font-bold text-sm">{title}</p>{/if}
		</div>
		<div class="flex py-1">
			<!-- <div class="">
				{#if !isBuildingPdf}
					<button class="mr-2" on:click={(e) => printItem()}>Print</button>
				{/if}
			</div> -->
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4">
		{#if isBuildingPdf}
			<div class="flex justify-center">
				<div class="flex flex-col items-center">
					<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
					<p class="p-2 text-xs">{progressText}</p>
				</div>
			</div>
		{:else if data}
			<div class="flex justify-between space-x-1">
				<button class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(1)}
					><div>1 Column</div></button
				>
				<button class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(2)}
					><div>2 Columns</div></button
				>
				<button class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(3)}
					><div>3 Columns</div></button
				>
				<button class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(4)}
					><div>4 Columns</div></button
				>
			</div>
		{:else}
			<div class="h-4">Print pdf requires a ViewModel</div>
		{/if}
	</div>
</div>
