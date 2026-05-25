import { browser } from '$app/environment';
import { createHttpResponseMessage } from '$lib/Utils/http-response.js';
import type { CudlObject } from './createViewModel.js';
import { cleanOutFacsimileElement } from './preview-utils.js';
import {
	createDisplayError,
	createErrorFromDisplayError,
	type TransformDisplayError
} from './transform-errors.js';

export type { TransformDisplayError } from './transform-errors.js';

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
	return parseJsonTransformOutcome(result, options);
}

async function parseJsonTransformOutcome(
	result: TransformOutcome<string>,
	options: XmlTransformOptions
): Promise<TransformOutcome<CudlObject>> {
	if (result.error) return { value: null, error: result.error };
	if (!result.value) return emptyOutcome();

	try {
		throwIfAborted(options.signal);
		reportJsonParseProgress(options.progress);
		return {
			value: (await parseJsonResult(result.value, options.signal)) as CudlObject,
			error: null
		};
	} catch (error) {
		return { value: null, error: createDisplayError(error) };
	}
}

function reportJsonParseProgress(progress?: (message: TransformProgressMessage) => void) {
	progress?.({
		message: 'Parsing JSON result',
		code: 'json-parse',
		time: new Date().toLocaleTimeString()
	});
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

	if (isStreamingTransformResponse(response)) {
		return readStreamingTransformResponse(response, options.progress);
	}

	return readTransformApiResult(response);
}

function isStreamingTransformResponse(response: Response) {
	return response.body && getResponseContentType(response).includes('application/x-ndjson');
}

async function readTransformApiResult(response: Response) {
	const payload = await readTransformApiResponse(response);
	if (!response.ok || payload.status === 'error')
		throw createErrorFromTransformApiResponse(payload);

	return payload.result;
}

async function readTransformApiResponse(response: Response): Promise<TransformApiResponse> {
	const responseText = await response.text();
	if (getResponseContentType(response).includes('application/json')) {
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

	const state = createTransformStreamState();

	while (true) {
		const { value, done } = await reader.read();
		appendTransformStreamChunk(state, value, done);
		processTransformStreamLines(readBufferedTransformLines(state), state, progress);

		if (done) break;
	}

	processTransformStreamLines(readFinalBufferedTransformLine(state), state, progress);
	return getTransformStreamResult(state);
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

interface TransformStreamState {
	bufferedText: string;
	decoder: TextDecoder;
	result: string | null;
	resultChunks: string[];
}

function createErrorFromTransformApiResponse(payload: TransformApiResponse) {
	const fallbackMessage = 'SaxonJS transform failed.';
	if (payload.status === 'success') return new Error(fallbackMessage);

	return createErrorFromTransformApiError(payload.error, fallbackMessage);
}

function createErrorFromTransformApiError(
	apiError: TransformDisplayError | string,
	fallbackMessage = 'SaxonJS transform failed.'
) {
	return createErrorFromDisplayError(apiError, fallbackMessage);
}

function getResponseContentType(response: Response) {
	return response.headers.get('content-type') ?? '';
}

function createTransformStreamState(): TransformStreamState {
	return {
		bufferedText: '',
		decoder: new TextDecoder(),
		result: null,
		resultChunks: []
	};
}

function appendTransformStreamChunk(
	state: TransformStreamState,
	value: Uint8Array | undefined,
	done: boolean
) {
	state.bufferedText += state.decoder.decode(value, { stream: !done });
}

function readBufferedTransformLines(state: TransformStreamState) {
	const lines = state.bufferedText.split('\n');
	state.bufferedText = lines.pop() ?? '';
	return lines;
}

function readFinalBufferedTransformLine(state: TransformStreamState) {
	const finalLine = state.bufferedText;
	state.bufferedText = '';
	return finalLine ? [finalLine] : [];
}

function processTransformStreamLines(
	lines: string[],
	state: TransformStreamState,
	progress?: (message: TransformProgressMessage) => void
) {
	for (const line of lines) {
		processTransformStreamLine(line, state, progress);
	}
}

function processTransformStreamLine(
	line: string,
	state: TransformStreamState,
	progress?: (message: TransformProgressMessage) => void
) {
	const trimmedLine = line.trim();
	if (!trimmedLine) return;

	handleTransformStreamEvent(JSON.parse(trimmedLine) as TransformStreamEvent, state, progress);
}

type TransformStreamHandler = (
	event: TransformStreamEvent,
	state: TransformStreamState,
	progress?: (message: TransformProgressMessage) => void
) => void;

const transformStreamHandlers: Record<TransformStreamEvent['type'], TransformStreamHandler> = {
	stage: (event, _state, progress) =>
		reportTransformStreamProgress(
			event as Extract<TransformStreamEvent, { type: 'stage' }>,
			progress
		),
	message: (event, _state, progress) =>
		reportTransformStreamProgress(
			event as Extract<TransformStreamEvent, { type: 'message' }>,
			progress
		),
	'result-start': (_event, state) => {
		state.resultChunks = [];
	},
	result: (event, state) => {
		state.resultChunks.push((event as Extract<TransformStreamEvent, { type: 'result' }>).chunk);
	},
	success: (event, state) => {
		state.result =
			(event as Extract<TransformStreamEvent, { type: 'success' }>).result ??
			state.resultChunks.join('');
	},
	error: (event) => {
		throw createErrorFromTransformApiError(
			(event as Extract<TransformStreamEvent, { type: 'error' }>).error
		);
	}
};

function handleTransformStreamEvent(
	event: TransformStreamEvent,
	state: TransformStreamState,
	progress?: (message: TransformProgressMessage) => void
) {
	transformStreamHandlers[event.type](event, state, progress);
}

function reportTransformStreamProgress(
	event: Extract<TransformStreamEvent, { type: 'stage' | 'message' }>,
	progress?: (message: TransformProgressMessage) => void
) {
	progress?.({
		message: event.message,
		code: getTransformStreamProgressCode(event),
		time: new Date().toLocaleTimeString()
	});
}

function getTransformStreamProgressCode(
	event: Extract<TransformStreamEvent, { type: 'stage' | 'message' }>
) {
	return event.type === 'message' ? event.code : 'stage';
}

function getTransformStreamResult(state: TransformStreamState) {
	if (state.result === null) throw new Error('XSLT transform ended without returning a result.');

	return state.result;
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
