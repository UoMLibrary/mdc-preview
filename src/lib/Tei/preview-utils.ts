export interface PreviewConfig {
	viewerTemplate: string;
	thumbnailTemplate: string;
	printTemplate: string;
}

const IMAGE_REF_PLACEHOLDER = '{imagerefwithpage}';
const TEMPLATE_KEYS = ['printTemplate', 'thumbnailTemplate', 'viewerTemplate'] as const;

export const previewConfigData: Record<string, PreviewConfig> = {
	cambridge: {
		viewerTemplate: 'https://images.lib.cam.ac.uk/iiif/{imagerefwithpage}.jp2/info.json',
		thumbnailTemplate:
			'https://images.lib.cam.ac.uk/content/images/{imagerefwithpage}_files/8/0_0.jpg',
		printTemplate:
			'https://images.lib.cam.ac.uk/iiif/{imagerefwithpage}.jp2/full/!400,400/0/default.jpg'
	},
	lancaster: {
		viewerTemplate:
			'https://iiif.digitalcollections.lancaster.ac.uk/iiif/2/{imagerefwithpage}.jp2/info.json',
		thumbnailTemplate:
			'https://iiif.digitalcollections.lancaster.ac.uk/iiif/2/{imagerefwithpage}.jp2/full/,150/0/default.jpg',
		printTemplate:
			'https://iiif.digitalcollections.lancaster.ac.uk/iiif/2/{imagerefwithpage}.jp2/full/,600/0/default.jpg'
	},
	manchester: {
		viewerTemplate:
			'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/info.json',
		thumbnailTemplate:
			'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/full/,150/0/default.jpg',
		printTemplate:
			'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/full/,600/0/default.jpg'
	}
};

export function cleanOutFacsimileElement(xmlString: string) {
	const start = xmlString.indexOf('<facsimile>');
	const end = xmlString.indexOf('</text>') + 7;

	if (start > 0 && end > 0) {
		const facsTextElems = xmlString.substring(start, end);
		if (!facsTextElems.includes('<graphic')) {
			return `${xmlString.substring(
				0,
				start
			)}<facsimile></facsimile><text></text>${xmlString.substring(end)}`;
		}
	}

	return xmlString;
}

export function isValidPreviewConfig(config?: PreviewConfig): config is PreviewConfig {
	if (!config) return false;

	return TEMPLATE_KEYS.every(
		(key) => config[key] !== '' && config[key].includes(IMAGE_REF_PLACEHOLDER)
	);
}
