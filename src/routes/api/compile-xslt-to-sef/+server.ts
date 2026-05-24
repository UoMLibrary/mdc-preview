import saxon from 'saxon-js';
import type { SaxonSefNode } from 'saxon-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const xslString = await request.text();
	const sef = await compileXsltToSef(xslString);

	return new Response(JSON.stringify({ status: 'success', sef }));
};

async function compileXsltToSef(xslString: string) {
	const platform = saxon.getPlatform();
	const doc = platform.parseXmlFromString(xslString);
	// Avoid "Required cardinality of value of parameter $static-base-uri is exactly one".
	doc._saxonBaseUri = 'file:///';
	doc._saxonDocUri = 'file:///';

	// SaxonJS 2.7 no longer exposes the older compile() wrapper, so this follows
	// the same compiler-resource path used by the official xslt3 CLI.
	const compiler = platform.resource('compiler');
	addParentPointers(compiler);

	const stylesheetParams = new saxon.XdmMap();
	stylesheetParams.inSituPut(saxon.XS.QName.fromParts('', '', 'staticParameters'), [
		new saxon.XdmMap()
	]);

	const options = saxon.checkOptions({
		destination: 'application',
		initialMode: 'compile-complete',
		templateParams: { 'Q{}options': { noXPath: false } },
		stylesheetParams,
		stylesheetInternal: compiler,
		sourceNode: doc,
		async: true
	});

	saxon.internalTransform(compiler, doc, options);
	const result = await options.resultPromise;
	const principalResult = Array.isArray(result.principalResult)
		? result.principalResult[0]
		: result.principalResult;
	const sef = saxon.XPath.sefToJSON(principalResult.firstChild, false);

	addChecksum(sef);
	return sef;
}

function addParentPointers(node: SaxonSefNode) {
	node.C?.forEach((child) => {
		child.parentNode = node;
		addParentPointers(child);
	});
}

function addChecksum(sef: SaxonSefNode) {
	function hashString(value: string, seed: number) {
		let hash = seed << 8;
		for (let index = 0; index < value.length; index += 1) {
			hash = (hash << 1) + value.charCodeAt(index);
		}
		return hash;
	}

	function hashPair(key: string, namespace: string, seed: number) {
		return hashString(key, seed) ^ hashString(namespace, seed);
	}

	let hash = 0;
	let seed = 0;

	function walk(node: SaxonSefNode) {
		hash ^= hashPair(node.N, 'http://ns.saxonica.com/xslt/export', seed++);

		for (const key in node) {
			if (isChecksumNodeProperty(node, key)) {
				hash ^= hashPair(key, '', seed);
				hash ^= hashString(String(node[key]), seed);
			}
		}

		node.C?.forEach(walk);
		hash ^= 1;
	}

	walk(sef);
	sef[String.fromCharCode(931)] = (hash < 0 ? 4_294_967_295 + hash + 1 : hash).toString(16);
}

function isChecksumNodeProperty(node: SaxonSefNode, key: string) {
	return (
		Object.prototype.hasOwnProperty.call(node, key) &&
		key !== 'N' &&
		key !== 'C' &&
		key !== String.fromCharCode(931)
	);
}
