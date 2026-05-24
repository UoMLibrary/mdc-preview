declare module 'saxon-js' {
	export interface SaxonDocument {
		_saxonBaseUri?: string;
		_saxonDocUri?: string;
		firstChild: SaxonDocument;
		[key: string]: unknown;
	}

	export interface SaxonPlatform {
		parseXmlFromString(xml: string): SaxonDocument;
		readFile(location: string | URL, ...args: unknown[]): string;
		resolveUri(href: string, base?: string): string;
		resource(name: 'compiler'): SaxonSefNode;
	}

	export interface SaxonSefNode {
		N: string;
		C?: SaxonSefNode[];
		parentNode?: SaxonSefNode;
		[key: string]: unknown;
	}

	export interface SaxonTransformResult {
		principalResult: SaxonDocument | SaxonDocument[];
	}

	export interface SaxonCheckedCompileOptions {
		resultPromise: Promise<SaxonTransformResult>;
	}

	export interface SaxonCompileOptions {
		destination: 'application';
		initialMode: 'compile-complete';
		templateParams: Record<string, unknown>;
		stylesheetParams: SaxonXdmMap;
		stylesheetInternal: SaxonSefNode;
		sourceNode: SaxonDocument;
		documentPool?: Record<string, SaxonDocument>;
		async: true;
	}

	export interface SaxonXdmMap {
		inSituPut(key: unknown, value: unknown): void;
	}

	export interface SaxonXsNamespace {
		QName: {
			fromParts(prefix: string, namespace: string, local: string): unknown;
		};
	}

	export interface SaxonXPathNamespace {
		sefToJSON(node: SaxonDocument, includeStatic?: boolean): SaxonSefNode;
	}

	export interface SaxonModule {
		getPlatform(): SaxonPlatform;
		checkOptions(options: SaxonCompileOptions): SaxonCheckedCompileOptions;
		internalTransform(
			stylesheet: SaxonSefNode,
			sourceNode: SaxonDocument,
			options: SaxonCheckedCompileOptions
		): void;
		XdmMap: new () => SaxonXdmMap;
		XS: SaxonXsNamespace;
		XPath: SaxonXPathNamespace;
	}

	const saxon: SaxonModule;
	export default saxon;
}
