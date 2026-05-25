import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type AppTheme = 'light' | 'dark';

const storageKey = 'mdc-preview-theme';
const fallbackTheme: AppTheme = 'dark';

function createThemeStore() {
	const themeStore = writable<AppTheme>(browser ? readStoredTheme() : fallbackTheme);

	if (browser) {
		themeStore.subscribe((theme) => {
			document.documentElement.dataset.theme = theme;
			try {
				localStorage.setItem(storageKey, theme);
			} catch {
				// The visual theme can still apply even if storage is unavailable.
			}
		});
	}

	return {
		subscribe: themeStore.subscribe,
		setTheme: themeStore.set
	};
}

function readStoredTheme(): AppTheme {
	try {
		const theme = localStorage.getItem(storageKey);
		return theme === 'light' || theme === 'dark' ? theme : fallbackTheme;
	} catch {
		return fallbackTheme;
	}
}

export default createThemeStore();
