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
	<div class="flex justify-center">
		<div class="flex flex-col items-center">
			<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
			<p class="p-2 text-xs">{progressText}</p>
		</div>
	</div>
{:else if data}
	<div class="flex justify-around space-x-1">
		<button type="button" class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(1)}
			><div>1 Column</div></button
		>
		<button type="button" class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(2)}
			><div>2 Columns</div></button
		>
		<button type="button" class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(3)}
			><div>3 Columns</div></button
		>
		<button type="button" class="p-4 sm:p-8 bg-slate-300 rounded" onclick={() => printItem(4)}
			><div>4 Columns</div></button
		>
	</div>
{:else if emptyMessage}
	<div class="h-4">{emptyMessage}</div>
{/if}
