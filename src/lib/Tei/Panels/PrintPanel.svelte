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

<div class="tool-panel">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
		<div class="tool-panel__header-spacer"></div>
	</div>
	<!-- Panel Body -->
	<div class="tool-panel__body">
		<PdfColumnPrintControls {data} emptyMessage="Print pdf requires a ViewModel" />
	</div>
</div>
