// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	interface SaxonTransformConfig {
		sourceText?: string;
		destination?: 'serialized' | string;
		stylesheetInternal?: unknown;
		[key: string]: unknown;
	}

	interface SaxonTransformResult {
		principalResult: string;
		[key: string]: unknown;
	}

	interface SaxonJSRuntime {
		transform(config: SaxonTransformConfig, executionMode: 'async'): Promise<SaxonTransformResult>;
		transform(config: SaxonTransformConfig, executionMode?: 'sync'): SaxonTransformResult;
	}

	const SaxonJS: SaxonJSRuntime;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
