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
	const teiStore = writable<TeiStoreValue>({ ...emptyTei });

	// TEI files can be large and expensive to restore on page load. Keep them
	// only in memory for the current app session.
	if (browser) localStorage.removeItem('stringifiedTeiStore');

	return {
		subscribe: teiStore.subscribe,
		clear,
		set: teiStore.set
	};

	function clear() {
		teiStore.set({ ...emptyTei });
		if (browser) localStorage.removeItem('stringifiedTeiStore');
	}
}

export default createTeiStore();
