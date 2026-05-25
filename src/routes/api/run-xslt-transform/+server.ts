import saxon from 'saxon-js';
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

interface TransformErrorPayload {
	name: string;
	message: string;
	code?: string | number;
	stack?: string;
}

interface WorkerLike {
	on(event: 'message', listener: (message: WorkerMessage) => void): WorkerLike;
	on(event: 'error', listener: (error: Error) => void): WorkerLike;
	on(event: 'exit', listener: (code: number) => void): WorkerLike;
	terminate(): Promise<number>;
}

interface WorkerConstructor {
	new (source: string, options: { eval: true; workerData: TransformRequest }): WorkerLike;
}

let transformQueue = Promise.resolve();
const importWorkerThreads = Function('return import("node:worker_threads")') as () => Promise<{
	Worker: WorkerConstructor;
}>;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const transformRequest = parseTransformRequest(await request.json());
		if (acceptsStreamingProgress(request)) return streamTransformRequest(transformRequest, request.signal);

		const result = await enqueueTransform(() => transformRequestInProcess(transformRequest), request.signal);
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
						() => transformRequestInWorker(transformRequest, writeEvent, transformController.signal),
						transformController.signal
					);
					writeEvent({ type: 'success', result });
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
				throwIfAborted(signal);
				const { Worker } = await importWorkerThreads();
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

				worker.on('message', (message: WorkerMessage) => {
					if (settled) return;

					if (message.type === 'message') {
						progress({ type: 'message', message: message.message ?? '', code: message.code });
						return;
					}

					if (message.type === 'success') {
						settle(() => resolveResult(message.result ?? ''));
						return;
					}

					if (message.type === 'error') {
						settle(() => rejectResult(createErrorFromPayload(message.error)));
					}
				});

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

async function enqueueTransform<T>(transform: () => Promise<T>, signal?: AbortSignal) {
	const queuedTransform = transformQueue.then(
		() => runUnlessAborted(transform, signal),
		() => runUnlessAborted(transform, signal)
	);
	transformQueue = queuedTransform.then(
		() => undefined,
		() => undefined
	);
	return queuedTransform;
}

async function runUnlessAborted<T>(operation: () => Promise<T>, signal?: AbortSignal) {
	throwIfAborted(signal);
	const result = await operation();
	throwIfAborted(signal);
	return result;
}

function throwIfAborted(signal?: AbortSignal) {
	if (signal?.aborted) throw new Error('XSLT transformation cancelled.');
}

function acceptsStreamingProgress(request: Request) {
	return request.headers.get('accept')?.includes('application/x-ndjson') ?? false;
}

function parseTransformRequest(value: unknown): TransformRequest {
	if (
		!isRecord(value) ||
		typeof value.sourceText !== 'string' ||
		!value.stylesheetInternal
	) {
		throw new Error('Expected an XSLT transform payload with sourceText and stylesheetInternal.');
	}

	return {
		sourceText: value.sourceText,
		stylesheetInternal: value.stylesheetInternal
	};
}

function createErrorPayload(error: unknown): TransformErrorPayload {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	const code = (error as Error & { code?: string | number }).code;
	return { name: error.name, message: error.message, stack: error.stack, code };
}

function createErrorFromPayload(errorPayload: TransformErrorPayload | undefined) {
	const error = new Error(errorPayload?.message ?? 'XSLT transformation failed.');
	error.name = errorPayload?.name ?? 'Error';
	error.stack = errorPayload?.stack;
	(error as Error & { code?: string | number }).code = errorPayload?.code;
	return error;
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
