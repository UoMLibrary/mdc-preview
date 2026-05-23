// src/routes/api/sef/+server.ts
import saxon from 'saxon-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const xslString = await request.text();
	// Compile the supplied XSL String into a .sef file
	const env = saxon.getPlatform();
	const doc = env.parseXmlFromString(xslString);
	// hack: avoid error "Required cardinality of value of parameter $static-base-uri is exactly one; supplied value is empty"
	doc._saxonBaseUri = 'file:///';
	const sef = saxon.compile(doc);
	return new Response(JSON.stringify({ status: 'success', sef }));
};
