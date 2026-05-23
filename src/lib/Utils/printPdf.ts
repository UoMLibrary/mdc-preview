import type { PdfObject } from '$lib/Tei/createViewModel.js';
import { printpage, type PrintPageData } from './printpage.js';

type ProgressCallback = (label: string, progress: number) => void;
type CompletedCallback = (missingImages: string[]) => void | Promise<void>;

export async function printPdfColumns(
	pdfData: PdfObject | null | undefined,
	cols: number,
	progressCallback?: ProgressCallback,
	completedCallback?: CompletedCallback
) {
	if (!pdfData || pdfData.items.length === 0) return false;

	const printData: PrintPageData = { ...pdfData, cols };
	await printpage(printData, progressCallback, completedCallback);
	return true;
}
