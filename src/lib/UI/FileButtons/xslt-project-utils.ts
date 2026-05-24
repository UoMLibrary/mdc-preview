import {
	getFileData,
	parseXmlText,
	waitForUiUpdate,
	type FileData,
	type SelectTextFileOptions,
	type XmlFilePayloadBase
} from './file-button-utils.js';

const xsltNamespace = 'http://www.w3.org/1999/XSL/Transform';
const stylesheetExtensions = new Set(['.xsl', '.xslt']);

export interface XsltProjectFile {
	path: string;
	contents: string;
}

export interface ParsedXsltProjectResult extends XmlFilePayloadBase {
	contents: string;
	entryPath: string;
	files: XsltProjectFile[];
	fileData: FileData;
	xmlDoc: XMLDocument;
}

export interface SelectXsltProjectOptions extends SelectTextFileOptions {
	preferredEntryNames?: string[];
}

interface ProjectFileWithSource extends XsltProjectFile {
	file: File;
}

export async function selectParsedXsltProject({
	started,
	preferredEntryNames = []
}: SelectXsltProjectOptions): Promise<ParsedXsltProjectResult | null> {
	const selectedFiles = await selectProjectFiles(started);
	if (!selectedFiles) return null;

	const projectFiles = await readStylesheetFiles(selectedFiles);
	if (projectFiles.length === 0) {
		throw new Error('The selected folder does not contain any .xsl or .xslt files.');
	}

	const entryFile = findEntryStylesheet(projectFiles, preferredEntryNames);
	const { xmlDoc, metaData, errors } = parseXmlText(entryFile.contents);

	return {
		fileData: getFileData(entryFile.file, entryFile.path, projectFiles.length),
		contents: entryFile.contents,
		entryPath: entryFile.path,
		files: projectFiles.map(({ path, contents }) => ({ path, contents })),
		xmlDoc,
		metaData,
		errors
	};
}

function selectProjectFiles(started?: () => Promise<void> | void): Promise<File[] | null> {
	return new Promise((resolve) => {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.multiple = true;
		fileInput.accept = '.xsl,.xslt';
		fileInput.setAttribute('directory', '');
		fileInput.setAttribute('webkitdirectory', '');

		fileInput.addEventListener(
			'change',
			async (event: Event) => {
				const files = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
				fileInput.remove();

				if (files.length === 0) {
					resolve(null);
					return;
				}

				await started?.();
				await waitForUiUpdate();
				resolve(files);
			},
			{ once: true }
		);

		fileInput.click();
	});
}

async function readStylesheetFiles(files: File[]) {
	const stylesheetFiles = files
		.map((file) => ({ file, path: getProjectPath(file) }))
		.filter(({ path }) => isStylesheetPath(path))
		.sort((a, b) => a.path.localeCompare(b.path));

	return Promise.all(
		stylesheetFiles.map(async ({ file, path }) => ({
			file,
			path,
			contents: await file.text()
		}))
	);
}

function findEntryStylesheet(
	files: ProjectFileWithSource[],
	preferredEntryNames: string[]
): ProjectFileWithSource {
	const referencedPaths = getReferencedStylesheets(files);
	const rootCandidates = files.filter((file) => !referencedPaths.has(file.path));
	const entryCandidates = getEntryCandidates(rootCandidates, files);
	const preferredMatch = findPreferredEntry(entryCandidates, preferredEntryNames);
	const singleRoot = getSingleRootCandidate(rootCandidates);

	return preferredMatch ?? singleRoot ?? failEntryInference(entryCandidates);
}

function getReferencedStylesheets(files: ProjectFileWithSource[]) {
	return new Set(files.flatMap(getFileReferencedStylesheets));
}

function getFileReferencedStylesheets(file: ProjectFileWithSource) {
	const { xmlDoc, errors } = parseXmlText(file.contents);
	if (errors.length > 0) return [];

	return getXsltReferenceHrefs(xmlDoc)
		.map((href) => resolveProjectHref(href, file.path))
		.filter((path): path is string => !!path);
}

function getXsltReferenceHrefs(xmlDoc: XMLDocument) {
	const references = [
		...Array.from(xmlDoc.getElementsByTagNameNS(xsltNamespace, 'include')),
		...Array.from(xmlDoc.getElementsByTagNameNS(xsltNamespace, 'import'))
	];

	return references
		.map((element) => element.getAttribute('href'))
		.filter((href): href is string => !!href);
}

function findPreferredEntry(files: ProjectFileWithSource[], preferredEntryNames: string[]) {
	const preferredNames = [...preferredEntryNames, 'main', 'index', 'transform', 'stylesheet'].map(
		normaliseEntryName
	);

	return files.find((file) => {
		const basename = normaliseEntryName(file.path.split('/').pop() ?? file.path);
		return preferredNames.some((preferredName) => basename === preferredName);
	});
}

function resolveProjectHref(href: string, basePath: string) {
	const localHref = getLocalHref(href);
	if (!localHref) return null;

	return normaliseProjectParts([...getBasePathParts(basePath), ...localHref.split('/')]);
}

function getEntryCandidates(
	rootCandidates: ProjectFileWithSource[],
	files: ProjectFileWithSource[]
) {
	return rootCandidates.length > 0 ? rootCandidates : files;
}

function getSingleRootCandidate(rootCandidates: ProjectFileWithSource[]) {
	return rootCandidates.length === 1 ? rootCandidates[0] : null;
}

function failEntryInference(files: ProjectFileWithSource[]): never {
	const listedNames = files
		.slice(0, 8)
		.map((file) => file.path)
		.join(', ');
	const suffix = files.length > 8 ? ', ...' : '';

	throw new Error(
		`Could not infer one entry stylesheet. Rename the entry to main.xsl, preFilter.xsl, or jsonTransform.xsl, or keep one root stylesheet in the selected folder. Candidates: ${listedNames}${suffix}`
	);
}

function getLocalHref(href: string) {
	const hrefWithoutFragment = href.split('#')[0];
	if (!hrefWithoutFragment || isExternalHref(hrefWithoutFragment)) return null;

	return decodeUriPath(hrefWithoutFragment);
}

function getBasePathParts(basePath: string) {
	return basePath.split('/').slice(0, -1);
}

function normaliseProjectParts(parts: string[]) {
	return parts.reduce(addProjectPathPart, [] as string[]).join('/');
}

function addProjectPathPart(normalisedParts: string[], part: string) {
	if (isIgnoredProjectPathPart(part)) return normalisedParts;
	if (part === '..') return normalisedParts.slice(0, -1);
	return [...normalisedParts, part];
}

function isIgnoredProjectPathPart(part: string) {
	return !part || part === '.';
}

function getProjectPath(file: File) {
	return (file.webkitRelativePath || file.name).replaceAll('\\', '/').replace(/^\/+/, '');
}

function isStylesheetPath(path: string) {
	const lowerPath = path.toLowerCase();
	return Array.from(stylesheetExtensions).some((extension) => lowerPath.endsWith(extension));
}

function isExternalHref(href: string) {
	return href.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function normaliseEntryName(name: string) {
	return name
		.replace(/\.[^.]+$/, '')
		.replace(/[-_\s]/g, '')
		.toLowerCase();
}

function decodeUriPath(path: string) {
	try {
		return decodeURI(path);
	} catch {
		return path;
	}
}
