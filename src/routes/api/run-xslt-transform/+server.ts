import saxon from 'saxon-js';
import type { RequestHandler } from './$types';

interface TransformRequest {
	sourceText: string;
	stylesheetInternal: unknown;
}

let transformQueue = Promise.resolve();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const result = await enqueueTransform(() => transformRequest(request));
		return jsonResponse({ status: 'success', result });
	} catch (error) {
		return jsonResponse({ status: 'error', error: createErrorPayload(error) }, 400);
	}
};

async function transformRequest(request: Request) {
	const transformRequest = parseTransformRequest(await request.json());
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

async function enqueueTransform<T>(transform: () => Promise<T>) {
	const queuedTransform = transformQueue.then(
		() => transform(),
		() => transform()
	);
	transformQueue = queuedTransform.then(
		() => undefined,
		() => undefined
	);
	return queuedTransform;
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

function createErrorPayload(error: unknown) {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	const code = (error as Error & { code?: string | number }).code;
	return { name: error.name, message: error.message, stack: error.stack, code };
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
