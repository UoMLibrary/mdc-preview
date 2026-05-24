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
		class="print-modal-dialog"
		bind:this={dialog}
		onclose={() => (showModal = false)}
		onclick={closeOnBackdrop}
	>
		<div>
			<div class="print-modal-header">
				<h2 class="print-modal-title">{title}</h2>
				<button type="button" class="print-modal-close" onclick={closeDialog}>Close</button>
			</div>
			<hr />
			<!-- Print Modal Body -->
			<div class="print-modal-body">
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
