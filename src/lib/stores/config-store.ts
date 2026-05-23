import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export interface ConfigStoreValue {
	viewerTemplate: string;
	thumbnailTemplate: string;
	printTemplate: string;
	[key: string]: string;
}

const emptyConfig: ConfigStoreValue = {
	viewerTemplate: '',
	thumbnailTemplate: '',
	printTemplate: ''
};

const defaultConfig: ConfigStoreValue = {
	viewerTemplate:
		'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/info.json',
	thumbnailTemplate:
		'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/full/,150/0/default.jpg',
	printTemplate:
		'https://image.digitalcollections.manchester.ac.uk/iiif/{imagerefwithpage}/full/,600/0/default.jpg'
};

// Used for testing with local IIIF server
const localConfig: ConfigStoreValue = {
	viewerTemplate: 'http://localhost:8008/{imagerefwithpage}/info.json',
	thumbnailTemplate: 'http://localhost:8008/{imagerefwithpage}/full/,150/0/default.jpg',
	printTemplate: 'http://localhost:8008/{imagerefwithpage}/full/,600/0/default.jpg'
};

function createConfigStore() {
	const configStore = writable<ConfigStoreValue>(emptyConfig);

	// If this is running in a browser check to see if there was any config
	// left over from last time/page
	if (browser) {
		loadLocal();
		configStore.subscribe((value) => saveLocal(value));
	}

	return {
		subscribe: configStore.subscribe,
		clear,
		setDefault,
		setLocal,
		setKeyValue,
		loadLocal,
		saveLocal,
		loadJson
	};

	function clear() {
		configStore.set({ ...emptyConfig });
	}

	function setDefault() {
		configStore.set({ ...defaultConfig });
	}

	function setLocal() {
		configStore.set({ ...localConfig });
	}

	function setKeyValue(key: string, value: string) {
		configStore.update((items) => {
			items[key] = value;
			return { ...items };
		});
	}

	function loadJson(jsonObj: ConfigStoreValue) {
		configStore.set(jsonObj);
	}

	function saveLocal(value: ConfigStoreValue) {
		localStorage.setItem('stringifiedConfigStore', JSON.stringify(value));
	}

	function loadLocal() {
		// Check for undefined
		if (!localStorage.getItem('stringifiedConfigStore')) return clear();

		const localStoredValue = localStorage.getItem('stringifiedConfigStore');
		let localStoredObj = { ...emptyConfig };
		if (localStoredValue) localStoredObj = JSON.parse(localStoredValue);
		configStore.set(localStoredObj);
	}
}

export default createConfigStore();
