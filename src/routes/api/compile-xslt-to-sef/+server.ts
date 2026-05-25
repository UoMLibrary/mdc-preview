import saxon from 'saxon-js';
import type { SaxonDocument, SaxonPlatform, SaxonSefNode } from 'saxon-js';
import type { RequestHandler } from './$types';

interface CompileProjectFile {
	path: string;
	contents: string;
}

interface CompileProjectRequest {
	entryPath: string;
	files: CompileProjectFile[];
}

const virtualProjectRootUri = 'file:///mdc-preview-xslt-project/';
const xsltReferencePattern =
	/<\s*(?:[\w.-]+:)?(?:include|import)\b[^>]*\bhref\s*=\s*(['"])(.*?)\1/gi;
let compileQueue = Promise.resolve();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const sef = await enqueueCompile(() => compileRequest(request), request.signal);
		return jsonResponse({ status: 'success', sef });
	} catch (error) {
		return jsonResponse({ status: 'error', error: getErrorMessage(error) }, 400);
	}
};

async function compileRequest(request: Request) {
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		const project = parseProjectRequest(await request.json());
		return compileXsltProjectToSef(project);
	}

	return compileXsltToSef(await request.text());
}

async function compileXsltProjectToSef(project: CompileProjectRequest) {
	const platform = saxon.getPlatform();
	const projectFiles = new Map(project.files.map((file) => [file.path, file]));
	const entryFile = projectFiles.get(project.entryPath);

	if (!entryFile) {
		throw new Error(
			`Entry stylesheet "${project.entryPath}" was not included in the project upload.`
		);
	}

	const resources = createProjectResources(platform, project.files);
	const entryUri = getVirtualProjectUri(platform, project.entryPath);
	const documentPool = createDocumentPool(platform, project.files);

	return withProjectResourceGuard(platform, resources, () =>
		compileXsltToSef(entryFile.contents, { baseUri: entryUri, documentPool })
	);
}

async function compileXsltToSef(
	xslString: string,
	compileOptions: { baseUri?: string; documentPool?: Record<string, SaxonDocument> } = {}
) {
	const platform = saxon.getPlatform();
	const doc = platform.parseXmlFromString(xslString);
	// Avoid "Required cardinality of value of parameter $static-base-uri is exactly one".
	doc._saxonBaseUri = compileOptions.baseUri ?? 'file:///';
	doc._saxonDocUri = compileOptions.baseUri ?? 'file:///';

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
		documentPool: compileOptions.documentPool,
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

async function enqueueCompile<T>(compile: () => Promise<T>, signal?: AbortSignal) {
	const queuedCompile = compileQueue.then(
		() => runUnlessAborted(compile, signal),
		() => runUnlessAborted(compile, signal)
	);
	compileQueue = queuedCompile.then(
		() => undefined,
		() => undefined
	);
	return queuedCompile;
}

async function runUnlessAborted<T>(operation: () => Promise<T>, signal?: AbortSignal) {
	throwIfAborted(signal);
	const result = await operation();
	throwIfAborted(signal);
	return result;
}

function throwIfAborted(signal?: AbortSignal) {
	if (signal?.aborted) throw new Error('XSLT compilation cancelled.');
}

function parseProjectRequest(value: unknown): CompileProjectRequest {
	assertProjectRequestShape(value);
	const files = value.files.map(parseProjectFile);
	const entryPath = normaliseProjectPath(value.entryPath);

	assertProjectHasFiles(files);
	assertProjectReferencesAreRelative(files);

	return { entryPath, files };
}

function parseProjectFile(value: unknown): CompileProjectFile {
	if (!isRecord(value) || typeof value.path !== 'string' || typeof value.contents !== 'string') {
		throw new Error('Each XSLT project file must include path and contents strings.');
	}

	return {
		path: normaliseProjectPath(value.path),
		contents: value.contents
	};
}

function normaliseProjectPath(path: string) {
	const slashPath = path.replaceAll('\\', '/').replace(/^\/+/, '');
	assertValidProjectPath(path, slashPath);

	const parts = slashPath
		.split('/')
		.filter(isPathPart)
		.map((part) => assertSafePathPart(path, part));
	assertProjectPathHasParts(path, parts);

	return parts.join('/');
}

function assertProjectReferencesAreRelative(files: CompileProjectFile[]) {
	for (const file of files) {
		for (const href of getStylesheetReferenceHrefs(file.contents)) {
			assertProjectReferenceIsRelative(file.path, href);
		}
	}
}

function getStylesheetReferenceHrefs(contents: string) {
	return Array.from(contents.matchAll(xsltReferencePattern), (match) => match[2]);
}

function assertProjectReferenceIsRelative(filePath: string, href: string) {
	const hrefWithoutFragment = href.split('#')[0];
	if (!hrefWithoutFragment || isRelativeProjectReference(hrefWithoutFragment)) return;

	throw new Error(
		`XSLT project uploads can only resolve relative xsl:include and xsl:import hrefs inside the uploaded folder. ${filePath} references "${href}".`
	);
}

function isRelativeProjectReference(href: string) {
	return !href.startsWith('/') && !hasUriScheme(href);
}

function assertProjectRequestShape(
	value: unknown
): asserts value is { entryPath: string; files: unknown[] } {
	const validShape =
		isRecord(value) && Array.isArray(value.files) && typeof value.entryPath === 'string';
	if (!validShape) throw new Error('Expected an XSLT project payload with entryPath and files.');
}

function assertProjectHasFiles(files: CompileProjectFile[]) {
	if (files.length === 0) throw new Error('The XSLT project payload did not contain any files.');
}

function assertValidProjectPath(originalPath: string, slashPath: string) {
	const invalidPath = [!slashPath, slashPath.includes('\0'), hasUriScheme(slashPath)].some(Boolean);
	if (invalidPath) throw new Error(`Invalid project file path "${originalPath}".`);
}

function assertProjectPathHasParts(originalPath: string, parts: string[]) {
	if (parts.length === 0) throw new Error(`Invalid project file path "${originalPath}".`);
}

function assertSafePathPart(originalPath: string, part: string) {
	if (part === '..') throw new Error(`Project file paths cannot contain "..": "${originalPath}".`);
	return part;
}

function isPathPart(part: string) {
	return !!part && part !== '.';
}

function hasUriScheme(path: string) {
	return /^[a-z][a-z0-9+.-]*:/i.test(path);
}

function createProjectResources(platform: SaxonPlatform, files: CompileProjectFile[]) {
	const resources = new Map<string, string>();

	for (const file of files) {
		resources.set(getVirtualProjectUri(platform, file.path), file.contents);
	}

	return resources;
}

function createDocumentPool(platform: SaxonPlatform, files: CompileProjectFile[]) {
	const documentPool: Record<string, SaxonDocument> = {};

	for (const file of files) {
		const uri = getVirtualProjectUri(platform, file.path);
		const doc = platform.parseXmlFromString(file.contents);
		doc._saxonBaseUri = uri;
		doc._saxonDocUri = uri;
		documentPool[uri] = doc;
	}

	return documentPool;
}

async function withProjectResourceGuard<T>(
	platform: SaxonPlatform,
	resources: Map<string, string>,
	compile: () => Promise<T>
) {
	const originalReadFile = platform.readFile.bind(platform);

	platform.readFile = (location: string | URL) => {
		const uri = String(location);
		const resource = resources.get(uri);
		if (resource !== undefined) return resource;
		throw new Error(
			`External stylesheet resource is not part of the uploaded XSLT project: ${uri}`
		);
	};

	try {
		return await compile();
	} finally {
		platform.readFile = originalReadFile;
	}
}

function getVirtualProjectUri(platform: SaxonPlatform, path: string) {
	const encodedPath = path.split('/').map(encodeURIComponent).join('/');
	return platform.resolveUri(encodedPath, virtualProjectRootUri);
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}
