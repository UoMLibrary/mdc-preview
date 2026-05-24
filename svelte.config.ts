import adapter from '@sveltejs/adapter-node';
import type { Config } from '@sveltejs/kit';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config: Config = {
	kit: {
		adapter: adapter()
	},

	preprocess: [vitePreprocess({})]
};

export default config;
