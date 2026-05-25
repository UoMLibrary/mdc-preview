export interface TransformDisplayError {
	name: string;
	message: string;
	code?: string | number;
	stack?: string;
}

export function createDisplayError(error: unknown): TransformDisplayError {
	if (!(error instanceof Error)) return { name: 'Error', message: String(error) };

	return {
		name: error.name,
		message: error.message,
		code: getErrorCode(error),
		stack: error.stack
	};
}

export function createErrorFromDisplayError(
	displayError: TransformDisplayError | string | undefined,
	fallbackMessage: string
) {
	const normalisedError = normaliseDisplayError(displayError, fallbackMessage);
	const error = new Error(normalisedError.message);
	applyDisplayErrorMetadata(error, normalisedError);
	return error;
}

export function getErrorMessage(errorValue: unknown) {
	const objectMessage = getObjectMessage(errorValue);
	if (objectMessage) return objectMessage;

	return errorValue instanceof Error ? errorValue.message : String(errorValue);
}

function normaliseDisplayError(
	displayError: TransformDisplayError | string | undefined,
	fallbackMessage: string
): TransformDisplayError {
	if (!displayError) return { name: 'Error', message: fallbackMessage };
	if (typeof displayError === 'string')
		return createStringDisplayError(displayError, fallbackMessage);

	return createObjectDisplayError(displayError, fallbackMessage);
}

function createObjectDisplayError(
	displayError: TransformDisplayError,
	fallbackMessage: string
): TransformDisplayError {
	return {
		name: getDisplayErrorName(displayError),
		message: getDisplayErrorMessage(displayError, fallbackMessage),
		code: displayError.code,
		stack: displayError.stack
	};
}

function createStringDisplayError(message: string, fallbackMessage: string): TransformDisplayError {
	return { name: 'Error', message: message || fallbackMessage };
}

function getDisplayErrorName(displayError: TransformDisplayError) {
	return displayError.name || 'Error';
}

function getDisplayErrorMessage(displayError: TransformDisplayError, fallbackMessage: string) {
	return displayError.message || fallbackMessage;
}

function getErrorCode(error: Error) {
	return (error as Error & { code?: string | number }).code;
}

function applyDisplayErrorMetadata(error: Error, displayError: TransformDisplayError) {
	error.name = displayError.name;
	if (displayError.stack) error.stack = displayError.stack;
	if (displayError.code !== undefined) setErrorCode(error, displayError.code);
}

function setErrorCode(error: Error, code: string | number) {
	(error as Error & { code?: string | number }).code = code;
}

function getObjectMessage(errorValue: unknown) {
	if (!isMessageRecord(errorValue)) return null;

	return errorValue.message;
}

function isMessageRecord(errorValue: unknown): errorValue is { message: string } {
	if (typeof errorValue !== 'object' || errorValue === null) return false;
	if (!('message' in errorValue)) return false;

	return typeof errorValue.message === 'string';
}
