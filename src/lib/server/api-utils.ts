export async function runUnlessAborted<T>(
	operation: () => Promise<T>,
	signal: AbortSignal | undefined,
	abortMessage: string
) {
	throwIfRequestAborted(signal, abortMessage);
	const result = await operation();
	throwIfRequestAborted(signal, abortMessage);
	return result;
}

export function throwIfRequestAborted(signal: AbortSignal | undefined, abortMessage: string) {
	if (signal?.aborted) throw new Error(abortMessage);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
