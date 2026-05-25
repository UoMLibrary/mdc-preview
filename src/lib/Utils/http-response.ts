export function createHttpResponseMessage(response: Response, responseText: string) {
	const details = getHttpResponseDetails(response, responseText);
	return details ? `HTTP ${response.status}: ${details}` : `HTTP ${response.status}`;
}

function getHttpResponseDetails(response: Response, responseText: string) {
	return previewResponseBody(responseText) || response.statusText;
}

function previewResponseBody(responseText: string) {
	return responseText
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 240);
}
