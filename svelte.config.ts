import adapter from '@sveltejs/adapter-node';
import type { Config } from '@sveltejs/kit';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config: Config = {
	kit: {
		adapter: adapter(),
		// SvelteKit's default CSRF origin check is widened because hooks.server.ts
		// performs the route-specific check for external preview POST requests.
		csrf: {
			trustedOrigins: ['*']
		}
	},

	preprocess: [vitePreprocess({})]
};

export default config;
