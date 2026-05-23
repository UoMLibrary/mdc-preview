declare module 'saxon-js' {
	interface SaxonDocument {
		_saxonBaseUri?: string;
		[key: string]: unknown;
	}

	interface SaxonPlatform {
		parseXmlFromString(xml: string): SaxonDocument;
	}

	interface SaxonModule {
		getPlatform(): SaxonPlatform;
		compile(document: SaxonDocument): unknown;
	}

	const saxon: SaxonModule;
	export default saxon;
}
