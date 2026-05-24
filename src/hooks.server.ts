import { json, text } from '@sveltejs/kit';
import type { Handle, RequestEvent } from '@sveltejs/kit';

/*
	Code in here will run when the application starts up, making it a useful
	place for initializing database clients and so on.
*/
const allowedPOSTPaths = ['/preview/posted'];
const allowedOrigins = [
	'http://192.168.1.129:5173',
	'http://localhost:5173',
	'https://tools.digitallibrarytools.com'
];

/*
	**handle**
	This function runs every time the SvelteKit server receives a request - whether
	that happens while the app is running, or during prerendering - and determines
	the response.

	To switch off csrf for one route, we need to switch it off for everything and then
	add it back here.
*/
export const handle: Handle = async ({ event, resolve }) => {
	// console.log(`origin '${origin}' !== event.url.origin '${event.url.origin}'`);

	if (isForbiddenCrossSiteFormPost(event)) return forbiddenCrossSiteFormResponse(event.request);

	return resolve(event);
};

function isForbiddenCrossSiteFormPost(event: RequestEvent) {
	if (event.request.method !== 'POST') return false;
	if (!isCrossSiteRequest(event)) return false;
	if (isAllowedCrossSitePost(event)) return false;

	return isFormContentType(event.request);
}

function isCrossSiteRequest(event: RequestEvent) {
	return getOrigin(event.request) !== event.url.origin;
}

function isAllowedCrossSitePost(event: RequestEvent) {
	return (
		allowedOrigins.includes(getOrigin(event.request)) &&
		allowedPOSTPaths.includes(event.url.pathname)
	);
}

function forbiddenCrossSiteFormResponse(request: Request) {
	const message = `Cross-site ${request.method} form submissions are forbidden`;
	return acceptsJson(request) ? json({ message }, { status: 403 }) : text(message, { status: 403 });
}

function acceptsJson(request: Request) {
	return request.headers.get('accept') === 'application/json';
}

function getOrigin(request: Request) {
	return request.headers.get('origin') || '';
}

function isContentType(request: Request, ...types: string[]) {
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
	return types.includes(type);
}

function isFormContentType(request: Request) {
	return isContentType(request, 'application/x-www-form-urlencoded', 'multipart/form-data');
}
