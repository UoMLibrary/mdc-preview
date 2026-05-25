import saxon from 'saxon-js';
import {
	createDisplayError,
	createErrorFromDisplayError,
	type TransformDisplayError
} from '$lib/Tei/transform-errors.js';
import {
	isRecord,
	jsonResponse,
	runUnlessAborted,
	throwIfRequestAborted
} from '$lib/server/api-utils.js';
import type { RequestHandler } from './$types';

interface TransformRequest {
	sourceText: string;
	stylesheetInternal: unknown;
}

interface WorkerMessage {
	type: 'message' | 'success' | 'error';
	message?: string;
	code?: string;
	result?: string;
	error?: TransformErrorPayload;
}

type TransformErrorPayload = TransformDisplayError;

interface WorkerLike {
	on(event: 'message', listener: (message: WorkerMessage) => void): WorkerLike;
	on(event: 'error', listener: (error: Error) => void): WorkerLike;
	on(event: 'exit', listener: (code: number) => void): WorkerLike;
	terminate(): Promise<number>;
}

interface WorkerConstructor {
	new (source: string, options: { eval: true; workerData: TransformRequest }): WorkerLike;
}

interface WorkerMessageContext {
	isSettled: () => boolean;
	settle: (callback: () => void) => void;
	resolveResult: (result: string) => void;
	rejectResult: (error: unknown) => void;
	progress: (event: unknown) => void;
}

let transformQueue = Promise.resolve();
const transformAbortMessage = 'XSLT transformation cancelled.';
const importWorkerThreads = Function('return import("node:worker_threads")') as () => Promise<{
	Worker: WorkerConstructor;
}>;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const transformRequest = parseTransformRequest(await request.json());
		if (acceptsStreamingProgress(request))
			return streamTransformRequest(transformRequest, request.signal);

		const result = await enqueueTransform(
			() => transformRequestInProcess(transformRequest),
			request.signal
		);
		return jsonResponse({ status: 'success', result });
	} catch (error) {
		return jsonResponse({ status: 'error', error: createErrorPayload(error) }, 400);
	}
};

async function transformRequestInProcess(transformRequest: TransformRequest) {
	const transform = await saxon.transform(
		{
			sourceText: transformRequest.sourceText,
			destination: 'serialized',
			stylesheetInternal: transformRequest.stylesheetInternal
		},
		'async'
	);

	return transform.principalResult ?? '';
}

function streamTransformRequest(transformRequest: TransformRequest, signal: AbortSignal) {
	const encoder = new TextEncoder();
	const transformController = new AbortController();
	const abortTransform = () => {
		if (!transformController.signal.aborted) transformController.abort();
	};
	signal.addEventListener('abort', abortTransform, { once: true });
	if (signal.aborted) abortTransform();
	let streamClosed = false;

	return new Response(
		new ReadableStream({
			async start(controller) {
				const writeEvent = (event: unknown) => {
					if (streamClosed || transformController.signal.aborted) return;

					try {
						controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
					} catch (_error) {
						streamClosed = true;
						abortTransform();
					}
				};

				try {
					writeEvent({ type: 'stage', message: 'Queued for transform' });
					const result = await enqueueTransform(
						() =>
							transformRequestInWorker(transformRequest, writeEvent, transformController.signal),
						transformController.signal
					);
					writeResultEvents(result, writeEvent);
				} catch (error) {
					writeEvent({ type: 'error', error: createErrorPayload(error) });
				} finally {
					streamClosed = true;
					signal.removeEventListener('abort', abortTransform);

					try {
						controller.close();
					} catch (_error) {
						// The client can close the response while the worker is still winding down.
					}
				}
			},
			cancel() {
				streamClosed = true;
				signal.removeEventListener('abort', abortTransform);
				abortTransform();
			}
		}),
		{
			headers: {
				'Content-Type': 'application/x-ndjson; charset=UTF-8',
				'Cache-Control': 'no-cache'
			}
		}
	);
}

function transformRequestInWorker(
	transformRequest: TransformRequest,
	progress: (event: unknown) => void,
	signal: AbortSignal
) {
	return new Promise<string>((resolve, reject) => {
		void startTransformWorker(resolve, reject);

		async function startTransformWorker(
			resolveResult: (result: string) => void,
			rejectResult: (error: unknown) => void
		) {
			try {
				throwIfRequestAborted(signal, transformAbortMessage);
				const { Worker } = await importWorkerThreads();
				progress({ type: 'stage', message: 'Starting transform worker' });
				const worker = new Worker(transformWorkerSource, {
					eval: true,
					workerData: transformRequest
				});
				let settled = false;

				const settle = (callback: () => void) => {
					if (settled) return;

					settled = true;
					signal.removeEventListener('abort', abortTransform);
					void worker.terminate();
					callback();
				};

				const abortTransform = () => {
					settle(() => rejectResult(new Error('XSLT transformation cancelled.')));
				};

				signal.addEventListener('abort', abortTransform, { once: true });

				const messageContext: WorkerMessageContext = {
					isSettled: () => settled,
					settle,
					resolveResult,
					rejectResult,
					progress
				};

				worker.on('message', (message: WorkerMessage) =>
					handleWorkerMessage(message, messageContext)
				);

				worker.on('error', (error: Error) => {
					settle(() => rejectResult(error));
				});

				worker.on('exit', (code: number) => {
					if (settled || code === 0) return;
					settle(() =>
						rejectResult(new Error(`XSLT transform worker stopped with exit code ${code}.`))
					);
				});
			} catch (error) {
				rejectResult(error);
			}
		}
	});
}

type WorkerMessageHandler = (message: WorkerMessage, context: WorkerMessageContext) => void;

const workerMessageHandlers: Record<WorkerMessage['type'], WorkerMessageHandler> = {
	message: (message, context) => {
		context.progress({ type: 'message', message: message.message ?? '', code: message.code });
	},
	success: (message, context) => {
		context.settle(() => context.resolveResult(message.result ?? ''));
	},
	error: (message, context) => {
		context.settle(() => context.rejectResult(createErrorFromPayload(message.error)));
	}
};

function handleWorkerMessage(message: WorkerMessage, context: WorkerMessageContext) {
	if (context.isSettled()) return;

	workerMessageHandlers[message.type](message, context);
}

function writeResultEvents(result: string, writeEvent: (event: unknown) => void) {
	const chunkSize = 16_384;
	writeEvent({ type: 'result-start' });

	for (let start = 0; start < result.length; start += chunkSize) {
		writeEvent({ type: 'result', chunk: result.slice(start, start + chunkSize) });
	}

	writeEvent({ type: 'success' });
}

async function enqueueTransform<T>(transform: () => Promise<T>, signal?: AbortSignal) {
	const queuedTransform = transformQueue.then(
		() => runUnlessAborted(transform, signal, transformAbortMessage),
		() => runUnlessAborted(transform, signal, transformAbortMessage)
	);
	transformQueue = queuedTransform.then(
		() => undefined,
		() => undefined
	);
	return queuedTransform;
}

function acceptsStreamingProgress(request: Request) {
	return request.headers.get('accept')?.includes('application/x-ndjson') ?? false;
}

function parseTransformRequest(value: unknown): TransformRequest {
	if (!isRecord(value) || typeof value.sourceText !== 'string' || !value.stylesheetInternal) {
		throw new Error('Expected an XSLT transform payload with sourceText and stylesheetInternal.');
	}

	return {
		sourceText: value.sourceText,
		stylesheetInternal: value.stylesheetInternal
	};
}

function createErrorPayload(error: unknown): TransformErrorPayload {
	return createDisplayError(error);
}

function createErrorFromPayload(errorPayload: TransformErrorPayload | undefined) {
	return createErrorFromDisplayError(errorPayload, 'XSLT transformation failed.');
}

const transformWorkerSource = `
const { parentPort, workerData } = require('node:worker_threads');
const saxon = require('saxon-js');

function stringifyMessage(message) {
	try {
		return saxon.serialize(message, { method: 'text' });
	} catch (_error) {
		return String(message ?? '');
	}
}

function createErrorPayload(error) {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	return {
		name: error.name,
		message: error.message,
		code: error.code,
		stack: error.stack
	};
}

(async () => {
	try {
		const transform = await saxon.transform(
			{
				sourceText: workerData.sourceText,
				destination: 'serialized',
				stylesheetInternal: workerData.stylesheetInternal,
				deliverMessage(message, code) {
					parentPort.postMessage({
						type: 'message',
						message: stringifyMessage(message),
						code: String(code ?? '')
					});
				}
			},
			'async'
		);

		parentPort.postMessage({ type: 'success', result: transform.principalResult ?? '' });
	} catch (error) {
		parentPort.postMessage({ type: 'error', error: createErrorPayload(error) });
	}
})();
`;
