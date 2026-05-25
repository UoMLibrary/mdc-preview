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

export interface TransformProgressMessage {
	message: string;
	code?: string;
	time: string;
}

interface XmlTransformOptions {
	cleanFacsimile?: boolean;
	progress?: (message: TransformProgressMessage) => void;
	signal?: AbortSignal;
}

export async function transformXmlDocToXml(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<XMLDocument>> {
	if (!xmlDoc?.documentElement) return emptyOutcome();

	return transformXmlStringToXml(serializeXmlDoc(xmlDoc), stylesheetInternal, options);
}

export async function transformXmlDocToSerializedXml(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<string>> {
	if (!xmlDoc?.documentElement) return emptyOutcome();

	const serializedXml = serializeXmlDoc(xmlDoc);
	const sourceText = options.cleanFacsimile
		? cleanOutFacsimileElement(serializedXml)
		: serializedXml;
	return transformXmlStringToSerialized(sourceText, stylesheetInternal, options);
}

async function transformXmlStringToXml(
	xmlString: string,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<XMLDocument>> {
	const sourceText = options.cleanFacsimile ? cleanOutFacsimileElement(xmlString) : xmlString;
	const result = await transformXmlStringToSerialized(sourceText, stylesheetInternal, options);

	return {
		value: result.value ? new DOMParser().parseFromString(result.value, 'text/xml') : null,
		error: result.error
	};
}

export async function transformXmlDocToJson(
	xmlDoc: XMLDocument | null | undefined,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<CudlObject>> {
	if (!xmlDoc?.documentElement) return emptyOutcome();

	return transformXmlStringToJson(serializeXmlDoc(xmlDoc), stylesheetInternal, options);
}

export async function transformXmlStringToJson(
	xmlString: string,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<CudlObject>> {
	if (!xmlString) return emptyOutcome();

	const result = await transformXmlStringToSerialized(xmlString, stylesheetInternal, options);
	if (result.error || !result.value) return { value: null, error: result.error };

	try {
		throwIfAborted(options.signal);
		options.progress?.({
			message: 'Parsing JSON result',
			code: 'json-parse',
			time: new Date().toLocaleTimeString()
		});
		return {
			value: (await parseJsonResult(result.value, options.signal)) as CudlObject,
			error: null
		};
	} catch (error) {
		return { value: null, error: createDisplayError(error) };
	}
}

async function transformXmlStringToSerialized(
	sourceText: string,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
): Promise<TransformOutcome<string>> {
	if (!hasTransformInputs(sourceText, stylesheetInternal)) return emptyOutcome();

	try {
		const value = await runSerializedTransform(sourceText, stylesheetInternal, options);
		return { value, error: null };
	} catch (error) {
		return { value: null, error: createDisplayError(error) };
	}
}

async function runSerializedTransform(
	sourceText: string,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
) {
	if (browser) {
		return transformXmlStringOnServer(sourceText, stylesheetInternal, options);
	}

	const transformConfig: SaxonTransformConfig = {
		sourceText,
		destination: 'serialized',
		stylesheetInternal
	};
	const transform = await SaxonJS.transform(transformConfig, 'async');
	return transform.principalResult;
}

async function transformXmlStringOnServer(
	sourceText: string,
	stylesheetInternal: unknown,
	options: XmlTransformOptions = {}
) {
	const response = await fetch('/api/run-xslt-transform', {
		method: 'POST',
		headers: { Accept: 'application/x-ndjson', 'Content-Type': 'application/json' },
		body: JSON.stringify({ sourceText, stylesheetInternal }),
		signal: options.signal
	});

	const contentType = response.headers.get('content-type') ?? '';
	if (response.body && contentType.includes('application/x-ndjson')) {
		return readStreamingTransformResponse(response, options.progress);
	}

	const payload = await readTransformApiResponse(response);
	if (!response.ok || payload.status === 'error')
		throw createErrorFromTransformApiResponse(payload);

	return payload.result;
}

async function readTransformApiResponse(response: Response): Promise<TransformApiResponse> {
	const responseText = await response.text();
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(responseText) as TransformApiResponse;
		} catch (_error) {
			return {
				status: 'error',
				error: createHttpResponseMessage(response, responseText)
			};
		}
	}

	return {
		status: 'error',
		error: createHttpResponseMessage(response, responseText)
	};
}

async function readStreamingTransformResponse(
	response: Response,
	progress?: (message: TransformProgressMessage) => void
) {
	const reader = response.body?.getReader();
	if (!reader) throw new Error('XSLT transform response did not include a readable body.');

	const decoder = new TextDecoder();
	let bufferedText = '';
	let result: string | null = null;
	let resultChunks: string[] = [];

	while (true) {
		const { value, done } = await reader.read();
		bufferedText += decoder.decode(value, { stream: !done });
		const lines = bufferedText.split('\n');
		bufferedText = lines.pop() ?? '';

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			const event = JSON.parse(trimmedLine) as TransformStreamEvent;
			if (event.type === 'stage' || event.type === 'message') {
				progress?.({
					message: event.message,
					code: event.type === 'message' ? event.code : 'stage',
					time: new Date().toLocaleTimeString()
				});
			} else if (event.type === 'result-start') {
				resultChunks = [];
			} else if (event.type === 'result') {
				resultChunks.push(event.chunk);
			} else if (event.type === 'success') {
				result = event.result ?? resultChunks.join('');
			} else if (event.type === 'error') {
				throw createErrorFromTransformApiError(event.error);
			}
		}

		if (done) break;
	}

	if (result === null) throw new Error('XSLT transform ended without returning a result.');
	return result;
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

function parseJsonResult(jsonText: string, signal?: AbortSignal) {
	if (!browser || typeof Worker === 'undefined' || typeof Blob === 'undefined') {
		return Promise.resolve(JSON.parse(jsonText) as unknown);
	}

	return new Promise<unknown>((resolve, reject) => {
		throwIfAborted(signal);

		const workerUrl = URL.createObjectURL(
			new Blob([jsonParseWorkerSource], { type: 'application/javascript' })
		);
		const worker = new Worker(workerUrl);

		const cleanup = () => {
			signal?.removeEventListener('abort', abortParse);
			worker.terminate();
			URL.revokeObjectURL(workerUrl);
		};

		const abortParse = () => {
			cleanup();
			reject(new Error('JSON parsing cancelled.'));
		};

		signal?.addEventListener('abort', abortParse, { once: true });

		worker.onmessage = (event: MessageEvent<JsonParseWorkerMessage>) => {
			cleanup();
			if (event.data.status === 'success') {
				resolve(event.data.value);
				return;
			}

			reject(createErrorFromTransformApiError(event.data.error, 'JSON parsing failed.'));
		};

		worker.onerror = (event) => {
			cleanup();
			reject(new Error(event.message || 'JSON parsing failed.'));
		};

		worker.postMessage(jsonText);
	});
}

function throwIfAborted(signal?: AbortSignal) {
	if (signal?.aborted) throw new Error('XSLT transformation cancelled.');
}

function createDisplayError(error: unknown): TransformDisplayError {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	const code = (error as Error & { code?: string | number }).code;
	return { name: error.name, message: error.message, stack: error.stack, code };
}

type TransformApiResponse =
	| { status: 'success'; result: string }
	| { status: 'error'; error: TransformDisplayError | string };

type TransformStreamEvent =
	| { type: 'stage'; message: string }
	| { type: 'message'; message: string; code?: string }
	| { type: 'result-start' }
	| { type: 'result'; chunk: string }
	| { type: 'success'; result?: string }
	| { type: 'error'; error: TransformDisplayError | string };

type JsonParseWorkerMessage =
	| { status: 'success'; value: unknown }
	| { status: 'error'; error: TransformDisplayError | string };

function createErrorFromTransformApiResponse(payload: TransformApiResponse) {
	const fallbackMessage = 'SaxonJS transform failed.';
	if (payload.status === 'success') return new Error(fallbackMessage);

	return createErrorFromTransformApiError(payload.error, fallbackMessage);
}

function createErrorFromTransformApiError(
	apiError: TransformDisplayError | string,
	fallbackMessage = 'SaxonJS transform failed.'
) {
	if (typeof apiError === 'string') return new Error(apiError || fallbackMessage);

	const error = new Error(apiError.message || fallbackMessage);
	error.name = apiError.name || 'Error';
	error.stack = apiError.stack;
	(error as Error & { code?: string | number }).code = apiError.code;
	return error;
}

function createHttpResponseMessage(response: Response, responseText: string) {
	const bodyPreview = responseText
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 240);
	const details = bodyPreview || response.statusText;

	return details ? `HTTP ${response.status}: ${details}` : `HTTP ${response.status}`;
}

const jsonParseWorkerSource = `
function createErrorPayload(error) {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	return {
		name: error.name,
		message: error.message,
		code: error.code,
		stack: error.stack
	};
}

self.onmessage = (event) => {
	try {
		self.postMessage({ status: 'success', value: JSON.parse(event.data) });
	} catch (error) {
		self.postMessage({ status: 'error', error: createErrorPayload(error) });
	}
};
`;
