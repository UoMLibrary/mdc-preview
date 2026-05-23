import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// The following disabled as the logic for performing the csrf check has been implemented in
		// hooks.server.js to allow a specifiv POST route from a specified origin. This allows us to POST
		// data to the preview tool from a tool with a different origin.
		csrf: {
			trustedOrigins: ['*']
		}
	},

	preprocess: [vitePreprocess({})]
};

export default config;
