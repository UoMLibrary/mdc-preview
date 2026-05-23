type XMLCommentMetadata = Record<string, string | Date>;
type XMLCommentEntry = [string, string | Date];

const COMMENT_START = '<!--';
const COMMENT_END = '-->';
const DATE_KEY_PARTS = ['created', 'modified', 'date'];

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
	const comment = getFirstXmlComment(xmlString);
	return Object.fromEntries(comment.split('\n').flatMap(parseCommentLine));
}

function getFirstXmlComment(xmlString: string) {
	const startIndex = xmlString.indexOf(COMMENT_START);
	const endIndex = xmlString.indexOf(COMMENT_END, startIndex + COMMENT_START.length);

	return hasXmlComment(startIndex, endIndex)
		? xmlString.substring(startIndex + COMMENT_START.length, endIndex)
		: '';
}

function hasXmlComment(startIndex: number, endIndex: number) {
	return startIndex >= 0 && endIndex > startIndex;
}

function parseCommentLine(line: string): XMLCommentEntry[] {
	const separatorIndex = line.indexOf(':');
	const key = normalizeKey(line.substring(0, separatorIndex));
	const value = line.substring(separatorIndex + 1).trim();

	return isCommentEntry(separatorIndex, key, value) ? [[key, parseCommentValue(key, value)]] : [];
}

function normalizeKey(key: string) {
	return key.replace(/\s/g, '_').toLowerCase();
}

function isCommentEntry(separatorIndex: number, key: string, value: string) {
	return separatorIndex > -1 && key !== '' && value !== '';
}

function parseCommentValue(key: string, value: string) {
	return isDateKey(key) ? new Date(Date.parse(value)) : value;
}

function isDateKey(key: string) {
	return DATE_KEY_PARTS.some((part) => key.includes(part));
}
