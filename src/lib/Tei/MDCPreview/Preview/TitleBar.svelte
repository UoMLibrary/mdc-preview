<script lang="ts">
	import PDFButton from './TitleBar/PDFButton.svelte';
	import PrintModal from '$lib/UI/PrintModal.svelte';
	import NextPrev from './TitleBar/NextPrev.svelte';
	import type { PdfObject } from '$lib/Tei/createViewModel.js';

	type UpdatePage = (page: number) => void;

	interface Props {
		title?: string;
		page?: number;
		pdfData?: PdfObject;
		pageTotal?: number;
		updatepage?: UpdatePage;
	}

	let { title = '', page = 1, pdfData, pageTotal = 0, updatepage = () => {} }: Props = $props();
	let showModal = $state(false);
</script>

<div class="text-xs text-white bg-uom-purple px-4 py-1 flex justify-between">
	<p class="py-1">{title} - Page: {page}</p>
	<div class="flex">
		<NextPrev min={1} max={pageTotal} current={page} update={updatepage} />

		{#if pdfData}
			<div class="ml-4 py-1">
				<PDFButton onclick={() => (showModal = true)} />
			</div>
		{/if}
	</div>
</div>

<PrintModal bind:showModal title="Save as PDF" {pdfData} />
