<script lang="ts">
	import PdfColumnPrintControls from '$lib/UI/PdfColumnPrintControls.svelte';
	import type { PdfObject } from '$lib/Tei/createViewModel.js';

	interface Props {
		showModal?: boolean;
		title?: string;
		pdfData?: PdfObject;
	}

	let { showModal = $bindable(false), title = '', pdfData }: Props = $props();

	let dialog = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialog) return;

		showModal ? openDialog() : closeDialog();
	});

	function openDialog() {
		if (!dialog?.open) dialog?.showModal();
	}

	function closeDialog() {
		if (dialog?.open) dialog.close();
	}

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === dialog) closeDialog();
	}
</script>

<div>
	<dialog
		class="max-w-full w-full sm:w-3/4 lg:w-[800px] p-0 md:rounded-md"
		bind:this={dialog}
		onclose={() => (showModal = false)}
		onclick={closeOnBackdrop}
	>
		<div>
			<div class="flex justify-between">
				<h2 class="p-2 px-4 text-base lg:text-lg">{title}</h2>
				<button type="button" class="px-4 py-2 text-sm" onclick={closeDialog}>Close</button>
			</div>
			<hr />
			<!-- Print Modal Body -->
			<div class="m-4">
				<PdfColumnPrintControls data={pdfData} completed={closeDialog} />
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
