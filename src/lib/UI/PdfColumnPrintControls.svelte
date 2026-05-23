<script lang="ts">
	import type { PdfObject } from '$lib/Tei/createViewModel.js';
	import { printPdfColumns } from '$lib/Utils/printPdf.js';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	interface Props {
		data?: PdfObject | null;
		emptyMessage?: string;
		completed?: () => void;
	}

	let { data, emptyMessage = '', completed }: Props = $props();

	let progressText = $state('');
	let isBuildingPdf = $state(false);

	async function printItem(cols: number) {
		if (!data) return;

		try {
			isBuildingPdf = true;
			const didStart = await printPdfColumns(data, cols, progressCallback, completedCallback);
			if (!didStart) isBuildingPdf = false;
		} catch (error) {
			console.error(error);
			isBuildingPdf = false;
		}
	}

	function progressCallback(label: string, progress: number) {
		progressText = `${label} ${progress}%`;
	}

	function completedCallback(missingImages: string[]) {
		isBuildingPdf = false;
		if (missingImages.length > 0) console.log(missingImages);
		completed?.();
	}
</script>

{#if isBuildingPdf}
	<div class="pdf-print-controls__loading">
		<div class="pdf-print-controls__loading-content">
			<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
			<p class="pdf-print-controls__progress">{progressText}</p>
		</div>
	</div>
{:else if data}
	<div class="pdf-print-controls__buttons">
		<button type="button" class="pdf-print-controls__button" onclick={() => printItem(1)}
			><div>1 Column</div></button
		>
		<button type="button" class="pdf-print-controls__button" onclick={() => printItem(2)}
			><div>2 Columns</div></button
		>
		<button type="button" class="pdf-print-controls__button" onclick={() => printItem(3)}
			><div>3 Columns</div></button
		>
		<button type="button" class="pdf-print-controls__button" onclick={() => printItem(4)}
			><div>4 Columns</div></button
		>
	</div>
{:else if emptyMessage}
	<div class="pdf-print-controls__empty">{emptyMessage}</div>
{/if}
