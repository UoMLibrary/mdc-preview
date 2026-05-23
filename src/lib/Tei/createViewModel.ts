// Convert a Cudl JSON object with a configuration object to a ViewModel
type CudlRecord = Record<string, any>;

interface CudlPage {
	IIIFImageURL: string;
	label?: string;
	imageHeight: number;
	imageWidth: number;
}

interface CudlObject extends CudlRecord {
	pages: CudlPage[];
	descriptiveMetadata?: CudlRecord[];
	logicalStructures?: CudlRecord[];
}

interface ViewModelConfig {
	viewerTemplate: string;
	thumbnailTemplate: string;
	printTemplate: string;
}

interface AboutObject {
	title: string;
	abstractHTML: string;
	shelfLocator: string;
	displayImageRights: string;
}

interface ThumbnailItem {
	url: string;
	label: string;
}

interface PdfItem {
	height: number;
	width: number;
	image_url: string;
	image_text: string;
}

interface PdfObject {
	filename: string;
	header_text: string;
	footer_text: string;
	items: PdfItem[];
}

interface ContentsStructure {
	data: CudlRecord;
	children?: ContentsStructure[];
}

interface ContentsObject {
	structure: ContentsStructure;
}

interface ViewModel {
	aboutObj: AboutObject;
	metadata: Record<string, string>;
	displayMetadata: CudlRecord[];
	pdfObj: PdfObject;
	pages: string[];
	thumbnails: ThumbnailItem[];
	contentsObj: ContentsObject;
}

export function createViewModel(cudlObj: CudlObject, configObj: ViewModelConfig): ViewModel {
	let pdfObj = createPdfObject(cudlObj, configObj);
	let pages = createPagesArray(cudlObj.pages, configObj);
	let thumbnails = createThumbnailsArray(cudlObj.pages, configObj);
	let metadata = createMetadataObj(cudlObj);
	let displayMetadata = createDisplayMetadataArray(cudlObj);
	let contentsObj = createContentsObj(cudlObj);
	let aboutObj = createAboutObj(cudlObj);
	let viewModel = {
		aboutObj,
		metadata,
		displayMetadata,
		pdfObj,
		pages,
		thumbnails,
		contentsObj
	};
	return viewModel;
}

function createAboutObj(cudlObj: CudlObject): AboutObject {
	let aboutObj = {
		title: '',
		abstractHTML: '',
		shelfLocator: '',
		displayImageRights: ''
	};
	aboutObj.title = cudlObj?.descriptiveMetadata?.[0]?.title?.displayForm ?? '';
	aboutObj.abstractHTML = cudlObj?.descriptiveMetadata?.[0]?.abstract?.displayForm ?? '';
	aboutObj.shelfLocator = cudlObj?.descriptiveMetadata?.[0]?.shelfLocator?.displayForm ?? '';
	aboutObj.displayImageRights = cudlObj?.descriptiveMetadata?.[0]?.displayImageRights ?? '';

	return aboutObj;
}

function createPagesArray(pagesArray: CudlPage[], configObj: ViewModelConfig): string[] {
	let items: string[] = [];
	pagesArray.forEach((page) => {
		// console.log(page);
		let item = configObj.viewerTemplate.replace('{imagerefwithpage}', page.IIIFImageURL);
		items.push(item);
	});
	return items;
}

function createThumbnailsArray(
	pagesArray: CudlPage[],
	configObj: ViewModelConfig
): ThumbnailItem[] {
	let items: ThumbnailItem[] = [];
	pagesArray.forEach((page) => {
		// console.log(page);
		let url = configObj.thumbnailTemplate.replace('{imagerefwithpage}', page.IIIFImageURL);
		let label = page.label ?? '';
		items.push({ url, label });
	});
	return items;
}

function createPdfObject(cudlObj: CudlObject, configObj: ViewModelConfig): PdfObject {
	let pagesArray = cudlObj.pages;
	// TODO: PASS IN ITEM REFERENCE FROM CONFIG OR CUDL JSON?
	// TODO: PASS IN ITEM REF FROM CUDL BUT OFFER OVERRIDE ON CONFIG OBJECT
	//let downloadImageRights = tei?.raw?.descriptiveMetadata?.[0]?.downloadImageRights;
	let itemid = 'TESTID';
	let downloadImageRights =
		cudlObj?.descriptiveMetadata?.[0]?.displayImageRights ?? 'Missing copyright message';

	// TODO: This should live elsewhere or in the tei JSON data structure
	// update print data structure
	let pdfObj: PdfObject = {
		filename: `${itemid}.pdf`,
		header_text: `${itemid}`,
		footer_text: downloadImageRights,
		items: []
	};
	let items: PdfItem[] = [];
	pagesArray.forEach((page, index) => {
		// console.log(page);
		let item = {
			height: page.imageHeight,
			width: page.imageWidth,
			image_url: configObj.printTemplate.replace('{imagerefwithpage}', page.IIIFImageURL),
			image_text: `${index + 1}: ${page.label || ''}\n${page.IIIFImageURL || ''}\n${
				page.imageWidth
			} x ${page.imageHeight}`
		};
		items.push(item);
	});
	pdfObj.items = items;
	return pdfObj;
}

// TODO: thumbnailUrl needs string replacement from ConfigUrl
function createMetadataObj(cudlObj: CudlObject): Record<string, string> {
	let descriptiveMetadata = cudlObj.descriptiveMetadata?.[0] ?? {};
	let metadata: Record<string, string> = {};
	for (const [key, value] of Object.entries(descriptiveMetadata)) {
		if (typeof key == 'string' && typeof value == 'string') {
			metadata[key] = value;
			//delete descriptiveMetadata[key]; // Remove items during development so we can see what we're missing}
		}
	}
	return metadata;
}

// Returns an array of display metadata in the form of key pair values.
function createDisplayMetadataArray(cudlObj: CudlObject): CudlRecord[] {
	let descriptiveMetadata = cudlObj.descriptiveMetadata?.[0] ?? {};
	let displayMetadataArray: CudlRecord[] = [];

	// process the descriptive Metadata recursively
	processDescriptiveMetadataRecursively(descriptiveMetadata, displayMetadataArray);

	// Sort the results based on seq
	displayMetadataArray = displayMetadataArray.sort((a, b) => a.seq - b.seq);

	// Create final output format, a sorted array of Objects with {label, value} where
	// any links have been created etc
	let formattedDisplayMetadataArray = formatDisplayMetadataArray(displayMetadataArray);

	// Remove any empty values
	let filteredDisplayMetadataArray = formattedDisplayMetadataArray.filter(
		(item): item is CudlRecord => {
			return !!item && item.value?.[0]?.text != '';
		}
	);
	return filteredDisplayMetadataArray;
}

function processDescriptiveMetadataRecursively(obj: CudlRecord, metadataArray: CudlRecord[]) {
	for (const [key, value] of Object.entries(obj)) {
		// console.log(typeof value, key, value);
		if (value?.label && value?.displayForm && value?.seq) {
			metadataArray.push(value);
			//delete obj[key]; // Remove items during development so we can see what we're missing
		} else if (value?.label && value?.value && value?.seq) {
			metadataArray.push(value);
			//delete obj[key]; // Remove items during development so we can see what we're missing
		} else if (value?.value && value?.seq) {
			// loop through the value Array and pass each value back into the recursive function
			value.value.forEach((itemInArray: CudlRecord) => {
				processDescriptiveMetadataRecursively(itemInArray, metadataArray);
			});
			//delete obj[key]; // Remove items during development so we can see what we're missing
		}
	}
}

function formatDisplayMetadataArray(
	displayMetadataArray: CudlRecord[]
): Array<CudlRecord | undefined> {
	return displayMetadataArray.map((item) => {
		if (item.label && item.displayForm) {
			if (item.linktype) {
				let link = createSearchLink(item.displayForm);
				return { label: item.label, value: [{ text: item.displayForm, link }] };
			} else {
				return { label: item.label, value: [{ text: item.displayForm }] };
			}
		} else if (item.label && item.value) {
			if (item.value.length > 1) {
				let list = item.value.map((listItem: CudlRecord) => {
					if (listItem.linktype) {
						let link = createSearchLink(listItem.displayForm);
						return { text: listItem.displayForm, link };
					} else {
						return { text: listItem.displayForm };
					}
				});
				return { label: item.label, value: list };
			} else if (item.value.length > 0) {
				return { label: item.label, value: [{ text: item.value[0].displayForm }] };
			}
		}
	});
}

function createSearchLink(text: string) {
	return `/search?keyword=${encodeURIComponent(text)}`;
}

// Takes the cudl structure and returns cleaned up contents panel data
function createContentsObj(cudlObj: CudlObject): ContentsObject {
	// Shelf locator is used in content section titles
	let shelfLocator = cudlObj.descriptiveMetadata?.[0]?.shelfLocator?.displayForm ?? '';

	let rawStructure = cudlObj.logicalStructures?.[0] ?? {};
	let structure = tidyUpContentsStructure(rawStructure, shelfLocator);

	return { structure };
}

// Cleans up the contents panel data structure and passes the shelflocator down the
// nested children structure to fill in any empty labels (recursive)
function tidyUpContentsStructure(
	rawStructure: CudlRecord,
	shelfLocator: string
): ContentsStructure {
	let structure: ContentsStructure = { data: {} };

	// destructure the loose fields that are not 'children' into a single field 'data'
	let { children, ...data } = rawStructure;
	structure.data = data;
	if (!data.label) data.label = shelfLocator;

	if (children?.length > 0) {
		let tempChildren: ContentsStructure[] = [];
		children.forEach((item: CudlRecord) => {
			// recursion
			let childStruct = tidyUpContentsStructure(item, shelfLocator);
			tempChildren.push(childStruct);
		});
		structure.children = tempChildren;
	}
	return structure;
}

/*
Example structure from Cambridge PH-GEOGRAPHY-70HS-00048
{
  "descriptiveMetadata": [
    {
      "thumbnailUrl": "PH-GEOGRAPHY-70HS-00048-000-00001",
      "thumbnailOrientation": "portrait",
      "displayImageRights": "Zooming image copyright Cambridge University Collection of Aerial Photography",
      "downloadImageRights": "Images made available for download are licensed under a Creative Commons Attribution-NonCommercial 3.0 Unported License (CC BY-NC 3.0)",
      "imageReproPageURL": "https://www.cambridgeairphotos.com/",
      "metadataRights": "This metadata is licensed under a Creative Commons Attribution-NonCommercial-NoDerivs 3.0 Unported License.",
      "docAuthority": "",
      "fundings": {
        "display": true,
        "seq": 262,
        "label": "Funding",
        "value": [
          {
            "display": true,
            "displayForm": "",
            "seq": 263
          }
        ]
      },
      "subjects": {
        "display": true,
        "seq": 24,
        "listDisplay": "inline",
        "label": "Subject(s)",
        "value": [
          {
            "display": true,
            "displayForm": "Aerial photography",
            "seq": 25,
            "linktype": "keyword search",
            "fullForm": "Aerial photography"
          }
        ]
      },
      "ID": "DOCUMENT",
      "creations": {
        "display": true,
        "seq": 103,
        "value": [
          {
            "type": "creation",
            "places": {
              "display": true,
              "seq": 108,
              "label": "Origin Place",
              "value": [
                {
                  "display": true,
                  "displayForm": "52.187344 0.13867",
                  "seq": 109,
                  "linktype": "keyword search",
                  "shortForm": "52.187344 0.13867",
                  "fullForm": "52.187344 0.13867"
                }
              ]
            },
            "dateStart": "1974",
            "dateEnd": "1974",
            "dateDisplay": {
              "display": true,
              "displayForm": "07/05/1974 p.m.",
              "linktype": "keyword search",
              "label": "Date of Creation",
              "seq": 117
            }
          }
        ]
      },
      "physicalLocation": {
        "display": true,
        "displayForm": "Cambridge University Collection of Aerial Photography",
        "label": "Physical Location",
        "seq": 4
      },
      "shelfLocator": {
        "display": true,
        "displayForm": "70H-S48",
        "label": "Classmark",
        "seq": 6
      },
      "extents": {
        "display": true,
        "seq": 226,
        "label": "Extent",
        "value": [
          {
            "display": true,
            "displayForm": "1 photograph",
            "seq": 227
          }
        ]
      },
      "title": {
        "display": true,
        "displayForm": "Cambridge, looking NW",
        "label": "Title",
        "seq": 11
      },
      "notes": {
        "display": true,
        "seq": 217,
        "label": "Note(s)",
        "value": [
          {
            "display": true,
            "displayForm": "For full record see <a target='_blank' class='externalLink' href='https://www.cambridgeairphotos.com/location/70h-s48/'>https://www.cambridgeairphotos.com/location/70h-s48/</a>",
            "seq": 218
          }
        ]
      }
    }
  ]
}
*/
