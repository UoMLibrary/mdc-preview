type XMLCommentMetadata = Record<string, string | Date>;

// Returns an object for key value pairs in an XML comment
// Handles some dates
// Does not handle comments that span lines
/*

<!--
Version: 0.1
Author: Chris Wilson
created: 2023-06-21T09:50
-->

Becomes

{
    "version": "0.1",
    "author": "Chris Wilson",
    "created": "2023-06-21T08:50:00.000Z"
}

*/
export function parseFirstXMLComment(xmlString: string): XMLCommentMetadata {
	// Find the start and end positions of the comment
	const startIndex = xmlString.indexOf('<!--') + 4;
	const endIndex = xmlString.indexOf('-->');
	// Extract the comment from the file content
	const comment = xmlString.substring(startIndex, endIndex);
	// Split on newlines
	const lines = comment.split('\n');
	// Are there any lines to process
	const result: XMLCommentMetadata = {};
	if (lines.length > 0) {
		lines.forEach((line) => {
			let [key, value] = line.split(':');
			// Deal with a date separately
			const isDate = key.includes('created') || key.includes('modified') || key.includes('date');
			// tidy up the key
			key = key.replace(/\s/g, '_').toLowerCase();

			if (isDate) {
				// get everything after the first ':'
				const splitArray = line.split(':');
				const datePart = splitArray?.slice(1).join(':').trim();
				if (datePart) result[key] = new Date(Date.parse(datePart));
			} else if (value) {
				// tidy the value
				value = String(value).trim();
				result[key] = value;
			}
		});
	}
	return result;
}
