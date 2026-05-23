<script lang="ts">
	import PdfColumnPrintControls from '$lib/UI/PdfColumnPrintControls.svelte';
	import type { PdfObject } from '$lib/Tei/createViewModel.js';

	interface Props {
		title?: string;
		data?: PdfObject | null;
	}

	let { title = '', data }: Props = $props();

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
		<div class="flex py-1"></div>
	</div>
	<!-- Panel Body -->
	<div class="m-4">
		<PdfColumnPrintControls {data} emptyMessage="Print pdf requires a ViewModel" />
	</div>
</div>
