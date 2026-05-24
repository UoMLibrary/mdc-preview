import { browser } from '$app/environment';
import type { FileData, XmlMetaData } from '$lib/UI/FileButtons/file-button-utils.js';
import { createStore, get as idbGet, set as idbSet, type UseStore } from 'idb-keyval';
import { get as getStore, writable } from 'svelte/store';

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
const sefStorageKey = 'sefStore';
const legacyLocalStorageKey = 'stringifiedSefStore';

let indexedDbStore: UseStore | null = null;
let saveQueue = Promise.resolve();

function createSefStore() {
	const sefStore = writable<SefStoreValue>(emptyStore);

	// If this is running in a browser check to see if there was any SEF data
	// left over from last time/page.
	if (browser) {
		void loadLocal().finally(() => {
			sefStore.subscribe((value) => {
				void saveLocal(value);
			});
		});
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
		const store = getStore(sefStore);
		const sefForKey = store[key]?.sef;
		const sefCopy = JSON.stringify(sefForKey);
		return sefCopy === undefined ? undefined : JSON.parse(sefCopy);
	}

	async function saveLocal(value: SefStoreValue) {
		try {
			const valueToSave = cloneStorageValue(value);
			saveQueue = saveQueue
				.catch(() => undefined)
				.then(() => idbSet(sefStorageKey, valueToSave, getIndexedDbStore()));
			await saveQueue;
		} catch (error) {
			console.warn('Unable to save SEF store to IndexedDB', error);
		}
	}

	async function loadLocal() {
		try {
			const storedValue = await idbGet<SefStoreValue>(sefStorageKey, getIndexedDbStore());
			if (storedValue) {
				sefStore.set(storedValue);
				return;
			}

			const legacyValue = getLegacyLocalStorageValue();
			if (legacyValue) {
				sefStore.set(legacyValue);
				await idbSet(sefStorageKey, legacyValue, getIndexedDbStore());
				localStorage.removeItem(legacyLocalStorageKey);
				return;
			}

			sefStore.set({ ...emptyStore });
		} catch (error) {
			console.warn('Unable to load SEF store from IndexedDB', error);
		}
	}

	function getIndexedDbStore() {
		indexedDbStore ??= createStore('mdc-preview', 'sef-store');
		return indexedDbStore;
	}

	function getLegacyLocalStorageValue() {
		const localStoredValue = localStorage.getItem(legacyLocalStorageKey);
		if (!localStoredValue) return null;

		try {
			return JSON.parse(localStoredValue) as SefStoreValue;
		} catch (error) {
			console.warn('Unable to migrate legacy SEF localStorage value', error);
			return null;
		}
	}

	function cloneStorageValue(value: SefStoreValue) {
		if (typeof structuredClone === 'function') return structuredClone(value) as SefStoreValue;
		return JSON.parse(JSON.stringify(value)) as SefStoreValue;
	}
}

export default createSefStore();
