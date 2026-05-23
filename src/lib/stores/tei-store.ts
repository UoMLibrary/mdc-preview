import { browser } from '$app/environment';
import type { FileData, XmlMetaData } from '$lib/UI/FileButtons/file-button-utils.js';
import { writable } from 'svelte/store';

interface TeiStoreValue {
	xmlDoc: XMLDocument | null;
	fileData: FileData | null;
	metaData: XmlMetaData | null;
	errors: string[] | null;
	xmlString?: string | null;
}

const emptyTei: TeiStoreValue = {
	xmlDoc: null,
	fileData: null,
	metaData: null,
	errors: null
};

function createTeiStore() {
	// TEI structure
	const teiStore = writable<TeiStoreValue>({ ...emptyTei });

	// If this is running in a browser check to see if there was any TEI data
	// left over from last time/page
	if (browser) {
		loadLocal();
		teiStore.subscribe((value) => saveLocal(value));
	}

	return {
		subscribe: teiStore.subscribe,
		clear,
		set: teiStore.set
	};

	function clear() {
		teiStore.set({ ...emptyTei });
	}

	function saveLocal(value: TeiStoreValue) {
		// Snapshot using get. We have to serialize the XML doc before
		// JSON.stringify() does its work.
		let xmlString = null;
		if (value.xmlDoc?.documentElement) {
			// Save the xml string as a new field so it doesn't overwrite the
			// live xml document in the store with a string
			xmlString = new XMLSerializer().serializeToString(value.xmlDoc.documentElement);
		}
		const saveObj = { ...value, xmlString };
		localStorage.setItem('stringifiedTeiStore', JSON.stringify(saveObj));
	}

	function loadLocal() {
		if (!localStorage.getItem('stringifiedTeiStore')) {
			return clear();
		}
		const localStoredValue = localStorage.getItem('stringifiedTeiStore');
		// We need to parse the XML string back into a document
		let localStoredObj = { ...emptyTei };
		if (localStoredValue) localStoredObj = JSON.parse(localStoredValue);
		if (localStoredObj.xmlString) {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(localStoredObj.xmlString, 'text/xml');
			localStoredObj.xmlDoc = xmlDoc;
		}
		teiStore.set(localStoredObj);
	}
}

export default createTeiStore();
