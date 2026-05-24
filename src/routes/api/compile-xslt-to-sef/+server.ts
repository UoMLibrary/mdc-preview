import saxon from 'saxon-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const xslString = await request.text();
	const env = saxon.getPlatform();
	const doc = env.parseXmlFromString(xslString);
	// Avoid "Required cardinality of value of parameter $static-base-uri is exactly one".
	doc._saxonBaseUri = 'file:///';
	const sef = saxon.compile(doc);
	return new Response(JSON.stringify({ status: 'success', sef }));
};
