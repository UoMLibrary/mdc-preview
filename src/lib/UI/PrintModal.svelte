<script>
	import { printpage } from '$lib/Utils/printpage.js';
	import LoadingSpinner from '$lib/UI/LoadingSpinner.svelte';

	export let showModal; // boolean

	let dialog; // HTMLDialogElement
	export let title = '';
	export let pdfData;

	let progressText = '';
	let isBuildingPdf = false;

	$: if (dialog && showModal) dialog.showModal();

	// PRINT FUNCTIONS AND CALLBACKS
	async function printItem(cols) {
		if (!pdfData || pdfData.items.length === 0) return;

		try {
			isBuildingPdf = true;
			pdfData.cols = cols;
			await printpage(pdfData, progressCallback, completedCallback);
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
		dialog.close();
	}
</script>

<div>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<dialog
		class="max-w-full w-full sm:w-3/4 lg:w-[800px] p-0 md:rounded-md"
		bind:this={dialog}
		on:close={() => (showModal = false)}
		on:click|self={() => dialog.close()}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div on:click|stopPropagation>
			<div class="flex justify-between">
				<h2 class="p-2 px-4 text-base lg:text-lg">{title}</h2>
				<!-- svelte-ignore a11y-autofocus -->
				<button class="px-4 py-2 text-sm" autofocus on:click={() => dialog.close()}>Close</button>
			</div>
			<hr />
			<!-- Print Modal Body -->
			<div class="m-4">
				{#if isBuildingPdf}
					<div class="flex justify-center">
						<div class="flex flex-col items-center">
							<LoadingSpinner size="30" unit="px" duration="2s" color="purple" />
							<p class="p-2 text-xs">{progressText}</p>
						</div>
					</div>
				{:else}
					<div class="flex justify-around space-x-1">
						<button class="p-4 sm:p-8 bg-slate-300 rounded" on:click={(e) => printItem(1)}
							><div>1 Column</div></button
						>
						<button class="p-4 sm:p-8 bg-slate-300 rounded" on:click={(e) => printItem(2)}
							><div>2 Columns</div></button
						>
						<button class="p-4 sm:p-8 bg-slate-300 rounded" on:click={(e) => printItem(3)}
							><div>3 Columns</div></button
						>
						<button class="p-4 sm:p-8 bg-slate-300 rounded" on:click={(e) => printItem(4)}
							><div>4 Columns</div></button
						>
					</div>
				{/if}
			</div>
		</div>
	</dialog>
</div>

<style>
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(1px);
	}

	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
