import { selectParsedXmlFile } from '$lib/UI/FileButtons/file-button-utils.js';
import TeiStore from '$lib/stores/tei-store.js';

export async function openTeiFile() {
	const xmlFile = await selectParsedXmlFile({
		accept: '.xml,.tei',
		started: () => {
			TeiStore.clear();
		}
	});

	if (!xmlFile) return;

	const { fileData, xmlDoc, metaData, errors } = xmlFile;

	if (errors.length > 0) {
		TeiStore.set({ fileData, xmlDoc: null, metaData, errors });
		return;
	}

	TeiStore.set({ fileData, xmlDoc, metaData, errors: [] });
}

export function closeTeiFile() {
	TeiStore.clear();
}
