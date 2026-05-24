import { browser } from '$app/environment';
import type { FileData, XmlMetaData } from '$lib/UI/FileButtons/file-button-utils.js';
import { get, writable } from 'svelte/store';

export interface SefItem {
	metadata?: unknown;
	metaData?: XmlMetaData;
	sef?: unknown;
	filename?: string | null;
	fileData?: FileData;
	errors?: string[] | null;
	[key: string]: unknown;
}

type SefStoreValue = Record<string, SefItem | null | undefined>;

const emptyStore: SefStoreValue = {};
// Structure. Key is the sefId, typically from previewSefIds.

const emptyItem: SefItem = { metadata: null, sef: null, filename: null, errors: null };

function createSefStore() {
	const sefStore = writable<SefStoreValue>(emptyStore);

	// If this is running in a browser check to see if there was any config
	// left over from last time/page
	if (browser) {
		loadLocal();
		sefStore.subscribe((value) => saveLocal(value));
	}

	return {
		subscribe: sefStore.subscribe,
		clear,
		setKeyValue,
		clearKeyValue,
		loadLocal,
		saveLocal,
		getKeyCopy
	};

	function clear() {
		sefStore.set({ ...emptyStore });
	}

	function clearKeyValue(key: string) {
		setKeyValue(key, { ...emptyItem });
	}

	function setKeyValue(key: string, value: SefItem) {
		sefStore.update((items) => {
			if (items[key]) items[key] = null;
			items[key] = value;
			return { ...items };
		});
	}

	// Hack to get around circular issue from sef file being updated
	// during its use which triggers the store update which triggers etc...
	// Makes a copy of the object
	function getKeyCopy(key: string) {
		const store = get(sefStore);
		const sefForKey = store[key]?.sef;
		const sefCopy = JSON.stringify(sefForKey);
		return sefCopy === undefined ? undefined : JSON.parse(sefCopy);
	}

	function saveLocal(value: SefStoreValue) {
		localStorage.setItem('stringifiedSefStore', JSON.stringify(value));
	}

	function loadLocal() {
		const localStoredValue = localStorage.getItem('stringifiedSefStore');
		let localStoredObj = { ...emptyStore };
		if (localStoredValue) localStoredObj = JSON.parse(localStoredValue);
		sefStore.set(localStoredObj);
	}
}

export default createSefStore();
