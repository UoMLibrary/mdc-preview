import { browser } from '$app/environment';
import type { CudlObject } from './createViewModel.js';
import { cleanOutFacsimileElement } from './preview-utils.js';

export interface TransformDisplayError {
	name: string;
	message: string;
	code?: string | number;
	stack?: string;
}

export interface TransformOutcome<T> {
	value: T | null;
	error: TransformDisplayError | null;
}

interface XmlTransformOptions {
	cleanFacsimile?: boolean;
}

export async function transformXmlDocToXml(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<XMLDocument>> {
	if (!xmlDoc?.documentElement) return emptyOutcome();

	return transformXmlStringToXml(serializeXmlDoc(xmlDoc), stylesheetInternal, options);
}

async function transformXmlStringToXml(
	xmlString: string,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<XMLDocument>> {
	const sourceText = options.cleanFacsimile ? cleanOutFacsimileElement(xmlString) : xmlString;
	const result = await transformXmlStringToSerialized(sourceText, stylesheetInternal);

	return {
		value: result.value ? new DOMParser().parseFromString(result.value, 'text/xml') : null,
		error: result.error
	};
}

export async function transformXmlDocToJson(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown
): Promise<TransformOutcome<CudlObject>> {
	if (!xmlDoc?.documentElement) return emptyOutcome();

	return transformXmlStringToJson(serializeXmlDoc(xmlDoc), stylesheetInternal);
}

async function transformXmlStringToJson(
	xmlString: string,
	stylesheetInternal: unknown
): Promise<TransformOutcome<CudlObject>> {
	const result = await transformXmlStringToSerialized(xmlString, stylesheetInternal);
	if (result.error || !result.value) return { value: null, error: result.error };

	try {
		return { value: JSON.parse(result.value) as CudlObject, error: null };
	} catch (error) {
		return { value: null, error: createDisplayError(error) };
	}
}

async function transformXmlStringToSerialized(
	sourceText: string,
	stylesheetInternal: unknown
): Promise<TransformOutcome<string>> {
	if (!hasTransformInputs(sourceText, stylesheetInternal)) return emptyOutcome();

	try {
		const value = await runSerializedTransform(sourceText, stylesheetInternal);
		return { value, error: null };
	} catch (error) {
		return { value: null, error: createDisplayError(error) };
	}
}

async function runSerializedTransform(sourceText: string, stylesheetInternal: unknown) {
	if (browser) {
		return transformXmlStringOnServer(sourceText, stylesheetInternal);
	}

	const transformConfig: SaxonTransformConfig = {
		sourceText,
		destination: 'serialized',
		stylesheetInternal
	};
	const transform = await SaxonJS.transform(transformConfig, 'async');
	return transform.principalResult;
}

async function transformXmlStringOnServer(sourceText: string, stylesheetInternal: unknown) {
	const response = await fetch('/api/run-xslt-transform', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sourceText, stylesheetInternal })
	});

	const payload = (await response.json()) as TransformApiResponse;
	if (!response.ok || payload.status === 'error') throw createErrorFromTransformApiResponse(payload);

	return payload.result;
}

function serializeXmlDoc(xmlDoc: XMLDocument) {
	return new XMLSerializer().serializeToString(xmlDoc.documentElement);
}

function emptyOutcome<T>(): TransformOutcome<T> {
	return { value: null, error: null };
}

function hasTransformInputs(sourceText: string, stylesheetInternal: unknown) {
	return browser && Boolean(sourceText) && Boolean(stylesheetInternal);
}

function createDisplayError(error: unknown): TransformDisplayError {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	const code = (error as Error & { code?: string | number }).code;
	return { name: error.name, message: error.message, stack: error.stack, code };
}

type TransformApiResponse =
	| { status: 'success'; result: string }
	| { status: 'error'; error: TransformDisplayError | string };

function createErrorFromTransformApiResponse(payload: TransformApiResponse) {
	const fallbackMessage = 'SaxonJS transform failed.';
	if (payload.status === 'success') return new Error(fallbackMessage);

	const { error: apiError } = payload;
	if (typeof apiError === 'string') return new Error(apiError || fallbackMessage);

	const error = new Error(apiError.message || fallbackMessage);
	error.name = apiError.name || 'Error';
	error.stack = apiError.stack;
	(error as Error & { code?: string | number }).code = apiError.code;
	return error;
}
