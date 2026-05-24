import { parseFirstXMLComment } from '$lib/Utils/xmlutils.js';
import { tick } from 'svelte';

export interface FileData {
	basename: string;
	name: string;
	size: number;
	lastModified: Date;
	type: string;
}

export type XmlMetaData = ReturnType<typeof parseFirstXMLComment>;

export interface TextFileResult {
	fileData: FileData;
	contents: string;
}

export interface FileButtonProps<TLoaded> {
	label?: string;
	started?: () => Promise<void> | void;
	loaded?: (payload: TLoaded) => void;
}

export interface FileButtonWithErrorProps<TLoaded, TError> extends FileButtonProps<TLoaded> {
	error?: (payload: TError) => void;
}

export interface SaveFileButtonProps {
	fileName?: string;
	label?: string;
}

interface ParsedXmlText {
	xmlDoc: XMLDocument;
	metaData: XmlMetaData;
	errors: string[];
}

export interface XmlFilePayloadBase {
	fileData: FileData;
	metaData: XmlMetaData;
	errors: string[];
}

export interface ParsedXmlFileResult extends TextFileResult, XmlFilePayloadBase {
	xmlDoc: XMLDocument;
}

export interface SelectTextFileOptions {
	accept: string;
	started?: () => Promise<void> | void;
}

export function selectTextFile({
	accept,
	started
}: SelectTextFileOptions): Promise<TextFileResult | null> {
	return new Promise((resolve, reject) => {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = accept;

		fileInput.addEventListener(
			'change',
			async (event: Event) => {
				const file = (event.currentTarget as HTMLInputElement).files?.[0];

				if (!file) {
					fileInput.remove();
					resolve(null);
					return;
				}

				await started?.();
				await waitForUiUpdate();

				const reader = new FileReader();
				reader.onerror = () => {
					fileInput.remove();
					reject(reader.error);
				};
				reader.onload = () => {
					fileInput.remove();
					resolve({
						fileData: getFileData(file),
						contents: String(reader.result ?? '')
					});
				};
				reader.readAsText(file);
			},
			{ once: true }
		);

		fileInput.click();
	});
}

async function waitForUiUpdate() {
	await tick();
	await nextAnimationFrame();
}

function nextAnimationFrame() {
	return new Promise<void>((resolve) => {
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => resolve());
			return;
		}

		setTimeout(resolve, 0);
	});
}

export function downloadTextFile(contents: string, fileName: string, type: string) {
	const blob = new Blob([contents], { type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = fileName;
	link.click();

	URL.revokeObjectURL(url);
	link.remove();
}

export async function selectParsedXmlFile(
	options: SelectTextFileOptions
): Promise<ParsedXmlFileResult | null> {
	const fileResult = await selectTextFile(options);
	if (!fileResult) return null;

	const { xmlDoc, metaData, errors } = parseXmlText(fileResult.contents);

	return {
		...fileResult,
		xmlDoc,
		metaData,
		errors
	};
}

function parseXmlText(xmlString: string): ParsedXmlText {
	const parser = new DOMParser();
	const parserErrorNamespace =
		parser.parseFromString('INVALID', 'application/xml').getElementsByTagName('parsererror')[0]
			?.namespaceURI ?? '';
	const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

	return {
		xmlDoc,
		metaData: parseFirstXMLComment(xmlString),
		errors: getParserErrors(xmlDoc, parserErrorNamespace)
	};
}

function getFileData(file: File): FileData {
	return {
		basename: file.name.replace(/\.[^/.]+$/, ''),
		name: file.name,
		size: file.size,
		lastModified: new Date(file.lastModified),
		type: file.type
	};
}

function getParserErrors(xmlDoc: XMLDocument, parserErrorNamespace: string): string[] {
	const parserErrors = parserErrorNamespace
		? Array.from(xmlDoc.getElementsByTagNameNS(parserErrorNamespace, 'parsererror'))
		: Array.from(xmlDoc.getElementsByTagName('parsererror'));

	return parserErrors
		.map((errDoc) => errDoc.querySelector('div')?.textContent)
		.filter((error): error is string => !!error);
}
