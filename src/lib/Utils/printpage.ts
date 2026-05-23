import { jsPDF } from 'jspdf';
import ProcessQueue from './ProcessQueue.js';
import { get, set, clear } from 'idb-keyval';

const MAX_COLUMNS = 4;

type PdfDocument = InstanceType<typeof jsPDF>;
type ProgressCallback = (label: string, progress: number) => void;
type CompletedCallback = (missingImages: string[]) => void | Promise<void>;

interface PrintPageItem {
	image_url: string;
	image_text: string;
	width: number;
	height: number;
}

export interface PrintPageData {
	filename: string;
	cols: number | string;
	header_text: string;
	footer_text: string;
	items: PrintPageItem[];
}

interface PageItem extends PrintPageItem {
	is_portrait: boolean;
}

interface PdfPage {
	page: number;
	header_text: string;
	footer_text: string;
	items: PageItem[];
}

interface PdfLayout {
	top_offset: number;
	border: number;
	gap: number;
	info_height: number;
	header_font_size: number;
	footer_font_size: number;
	page_font_size: number;
	item_font_size: number;
	number_of_cols: number;
	items_per_page: number;
}

let loading_errors: string[] = [];
let progressCallback: ProgressCallback | undefined;
let completedCallback: CompletedCallback | undefined;
let progress = 0;
let pdf_data: PrintPageData;
let layout: PdfLayout = {
	top_offset: 25, // gap from top of page to first box
	border: 15, // border at side of each page
	gap: 5, // gap between image items
	info_height: 15, // size of area under image to show text metadata
	header_font_size: 12,
	footer_font_size: 7,
	page_font_size: 10, // page number font size
	item_font_size: 7,
	number_of_cols: MAX_COLUMNS,
	items_per_page: 16
};

/* DATA STRUCTURE 
    let pdf_data = {
      filename: "output.pdf",
      cols: 4,
      header_text: "The header\nText",
      footer_text: "The footer\nText",
      items: [
        {
          image_url:
            "https://image.digitalcollections.manchester.ac.uk/iiif/PR-INCU-18313-000-00001.jp2/full/,150/0/default.jpg",
          image_text: "Line 1\nLine 2\nLine 3",
          width: 6000,
          height: 4500,
        },
        {
          image_url:
            "https://image.digitalcollections.manchester.ac.uk/iiif/PR-INCU-18313-000-00002.jp2/full/,150/0/default.jpg",
          image_text: "Line 1\nLine 2\nLine 3",
          width: 6000,
          height: 4500,
        },
        {
          image_url:
            "https://image.digitalcollections.manchester.ac.uk/iiif/PR-INCU-18313-000-00003.jp2/full/,150/0/default.jpg",
          image_text: "Line 1\nLine 2\nLine 3",
          width: 4500,
          height: 5000,
        },
      ],
    };
*/
export async function printpage(
	_pdf_data: PrintPageData,
	_progressCallback?: ProgressCallback,
	_completedCallback?: CompletedCallback
): Promise<void> {
	progressCallback = _progressCallback;
	completedCallback = _completedCallback;
	pdf_data = _pdf_data;
	setupLayout(pdf_data.cols);
	// preload the images (when finished calls buildPdf)
	await preloadImages(_pdf_data);
}

// TODO: set font sizes here
function setupLayout(cols: number | string) {
	cols = Number(cols);
	// Check it is a valid number of columns (1,2,3 or 4)
	if (!Number.isInteger(cols) || cols <= 0 || cols > MAX_COLUMNS) {
		layout.number_of_cols = 4;
	} else {
		layout.number_of_cols = cols;
	}
	// set the number of items per page based on the number of columns
	const pageitems = [0, 1, 4, 9, 16];
	const item_font_sizes = [0, 10, 10, 8, 7];
	layout.item_font_size = item_font_sizes[layout.number_of_cols];
	layout.items_per_page = pageitems[layout.number_of_cols];
}

function preloadImages(pdf_data: PrintPageData): Promise<void> {
	return new Promise(async (resolve) => {
		// To determine if the queue has finished we need to know how many items are in the queue
		let imageQueue = new ProcessQueue({
			jobLimit: 5,
			totalCount: pdf_data.items.length,
			label: 'preloading',
			progressCallback: imagesProgressCallback,
			completeCallback: imagesLoadedCallback
		});
		// Loop through the images
		pdf_data.items.forEach(async (item) => {
			let image_url = item.image_url;
			imageQueue.addJob(() => preloadImage(image_url));
		});
		resolve();
	});
}

function preloadImage(image_url: string): Promise<void> {
	return new Promise((resolve) => {
		return fetchAsBlob(image_url)
			.then(convertBlobToBase64)
			.then((image_data) => {
				set(image_url, image_data);
				resolve();
			})
			.catch((err) => {
				//console.log(err);
				let missing_img_data = '';
				loading_errors.push(image_url);
				set(image_url, missing_img_data);
				resolve();
			});
	});
}

const fetchAsBlob = (url: string): Promise<Blob> => fetch(url).then((response) => response.blob());

const convertBlobToBase64 = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = reject;
		reader.onload = () => {
			resolve(reader.result as string);
		};
		reader.readAsDataURL(blob);
	});

async function imagesLoadedCallback() {
	await buildPdf(pdf_data);
}

// One of two stages so we'll cheat a bit and divide each by 2
function imagesProgressCallback(label: string, _progress: number) {
	progress = Math.round(_progress / 2);
	if (progressCallback) progressCallback(label, progress);
}

// One of two stage so we'll cheat a bit and divide each by 2
// As this is the second and final stage we need to start adding onto 50%
function pdfBuildCallback(label: string, _progress: number) {
	progress = 50 + Math.round(_progress / 2);
	if (progressCallback) progressCallback(label, progress);
}

// After the images have preloaded into indexedDb, build the pdf
async function buildPdf(pdf_data: PrintPageData) {
	// Take the list of image items and group them into pages based
	// on the number of columns
	let page_array = buildPageArray(pdf_data);
	// Create a jsPDF document
	const pdf = new jsPDF(); // using defaults: orientation=portrait, unit=mm, size=A4
	// Loop through the page array and create an array of promises
	let completedPages = 0;
	for (let i = 0; i < page_array.length; i++) {
		await buildPage(pdf, page_array[i]);
		// progress callback
		completedPages++;
		let _progress = Math.round((completedPages / page_array.length) * 100);
		pdfBuildCallback('buildpage', _progress);
	}
	pdf.save(pdf_data.filename);
	if (completedCallback) completedCallback(loading_errors);
}

function buildPage(pdf: PdfDocument, _page: PdfPage): Promise<void> {
	return new Promise(async (resolve) => {
		// get the dimensions of the pdf
		const pdf_width = pdf.internal.pageSize.getWidth();
		const pdf_height = pdf.internal.pageSize.getHeight();

		// take off the border around the edges
		const inner_width = pdf_width - layout.border * 2;
		// calculate width of display boxes
		const box_width = Math.floor(
			(inner_width - layout.gap * (layout.number_of_cols - 1)) / layout.number_of_cols
		);
		// box_height being the image height part of the box. the full height includes info_height
		const box_height = box_width;

		pdf.setLineHeightFactor(1.25);

		// Add a new page if this is not the first page
		if (_page.page !== 0) pdf.addPage();

		// Add the header text
		pdf.setFontSize(layout.header_font_size);
		//let header_width = pdf.getTextWidth(_page.header_text);
		pdf.text(_page.header_text, pdf_width / 2, 10, { align: 'center' });

		// Add the footer text
		pdf.setFontSize(layout.footer_font_size);
		pdf.text(_page.footer_text, pdf_width / 2, pdf_height - 15, {
			align: 'center'
		});

		// Add the page number
		pdf.setFontSize(layout.page_font_size);
		pdf.text(`Page: ${_page.page + 1}`, pdf_width - 5, pdf_height - 5, {
			align: 'right'
		});

		// Create an array of promises to retrieve the image back for this page from indexeddb
		let promise_images: Array<string | undefined> = [];
		for (let i = 0; i < _page.items.length; i++) {
			promise_images.push(await get<string>(_page.items[i].image_url));
		}

		// Once all the images are loaded lay them out on the page
		Promise.all(promise_images).then((images) => {
			// Loop through the items and display them
			_page.items.forEach(async (item, index) => {
				let current_row = Math.floor(index / layout.number_of_cols);
				let current_col = index % layout.number_of_cols;

				// Draw a border around item
				let box_x = current_col * (box_width + layout.gap) + layout.border;
				let box_y =
					current_row * (box_height + layout.info_height + layout.gap) + layout.top_offset;
				// drawBox(pdf, box_x, box_y, box_width, box_height + layout.info_height);
				// drawBox(pdf, box_x, box_y, box_width, box_height);

				pdf.setFontSize(layout.item_font_size);

				pdf.text(item.image_text, box_x, box_y + box_height + 4);

				// calculate the dimensions of the image that will fit in the border (take account
				// of aspect ratio). This will used to create the appropriate iiif thumbnail request.
				let isPortrait = item.width <= item.height;
				let image_width = box_width;
				let image_height = box_height;
				let image_x_offset = 0;
				let image_y_offset = 0;
				if (isPortrait) {
					// portrait
					image_width = Math.floor((item.width / item.height) * image_height);
					image_x_offset = (box_width - image_width) / 2;
				} else {
					// landscape
					image_height = Math.floor((item.height / item.width) * image_width);
					image_y_offset = (box_height - image_height) / 2;
				}

				const image_data = images[index] ?? '';
				if (image_data === '') {
					pdf.text(
						`Image is missing`,
						box_x + image_x_offset + box_width * 0.5,
						box_y + box_height * 0.5,
						{ align: 'center' }
					);
				} else {
					// draw the image (from indexeddb store) into the border area
					pdf.addImage(
						image_data,
						'JPEG',
						box_x + image_x_offset,
						box_y + image_y_offset,
						image_width,
						image_height
					);
				}
			});
			resolve();
		});
	});
}

// Build an array of pages containing page items, header and footer text
function buildPageArray(pdf_data: PrintPageData): PdfPage[] {
	let pages: PdfPage[] = [];
	let page_items: PageItem[] = [];
	pdf_data.items.forEach((item, index) => {
		let image_url = item.image_url;
		page_items.push({
			...item,
			image_url: image_url,
			is_portrait: item.width <= item.height
		});
		if (
			index % layout.items_per_page === layout.items_per_page - 1 ||
			index === pdf_data.items.length - 1
		) {
			let page_number = Math.floor(index / layout.items_per_page);

			pages.push({
				page: page_number,
				header_text: pdf_data.header_text,
				footer_text: pdf_data.footer_text,
				items: page_items
			});
			page_items = [];
		}
	});
	return pages;
}

// function drawBox(pdf, x1, y1, width, height) {
// 	pdf.line(x1, y1, x1 + width, y1);
// 	pdf.line(x1 + width, y1, x1 + width, y1 + height);
// 	pdf.line(x1 + width, y1 + height, x1, y1 + height);
// 	pdf.line(x1, y1 + height, x1, y1);
// }
