type MarkdownInline =
	| { type: 'text'; text: string }
	| { type: 'code'; text: string }
	| { type: 'link'; text: string; href: string };

type MarkdownBlock =
	| { type: 'heading'; level: number; content: MarkdownInline[] }
	| { type: 'paragraph'; content: MarkdownInline[] }
	| { type: 'list'; ordered: boolean; items: MarkdownInline[][] }
	| { type: 'code'; language: string; text: string };

interface PendingList {
	ordered: boolean;
	items: string[];
}

interface MarkdownParseState {
	blocks: MarkdownBlock[];
	paragraphLines: string[];
	currentList: PendingList | null;
	inCodeBlock: boolean;
	codeLanguage: string;
	codeLines: string[];
}

type MarkdownLineHandler = (
	state: MarkdownParseState,
	line: string,
	trimmedLine: string
) => boolean;

const markdownLineHandlers: MarkdownLineHandler[] = [
	handleCodeFence,
	handleCodeLine,
	handleBlankLine,
	handleHeading,
	handleUnorderedItem,
	handleOrderedItem,
	handleListContinuation,
	handleParagraph
];

export function parseMarkdown(markdown: string) {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const state = createMarkdownParseState();

	for (const line of lines) {
		parseMarkdownLine(state, line);
	}

	finishMarkdownParse(state);

	return state.blocks;
}

function createMarkdownParseState(): MarkdownParseState {
	return {
		blocks: [],
		paragraphLines: [],
		currentList: null,
		inCodeBlock: false,
		codeLanguage: '',
		codeLines: []
	};
}

function parseMarkdownLine(state: MarkdownParseState, line: string) {
	const trimmedLine = line.trim();

	for (const handler of markdownLineHandlers) {
		if (handler(state, line, trimmedLine)) return;
	}
}

function handleCodeFence(state: MarkdownParseState, _line: string, trimmedLine: string) {
	const codeFence = trimmedLine.match(/^```([A-Za-z0-9_-]*)$/);
	if (!codeFence) return false;

	toggleCodeBlock(state, codeFence[1] ?? '');
	return true;
}

function toggleCodeBlock(state: MarkdownParseState, language: string) {
	if (state.inCodeBlock) {
		flushCodeBlock(state);
		state.inCodeBlock = false;
		return;
	}

	flushParagraph(state);
	closeList(state);
	state.inCodeBlock = true;
	state.codeLanguage = language;
}

function handleCodeLine(state: MarkdownParseState, line: string) {
	if (!state.inCodeBlock) return false;

	state.codeLines.push(line);
	return true;
}

function handleBlankLine(state: MarkdownParseState, _line: string, trimmedLine: string) {
	if (trimmedLine) return false;

	flushParagraph(state);
	closeList(state);
	return true;
}

function handleHeading(state: MarkdownParseState, _line: string, trimmedLine: string) {
	const heading = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
	if (!heading) return false;

	flushParagraph(state);
	closeList(state);
	state.blocks.push({
		type: 'heading',
		level: heading[1].length,
		content: parseInline(heading[2])
	});
	return true;
}

function handleUnorderedItem(state: MarkdownParseState, _line: string, trimmedLine: string) {
	return handleListItem(state, trimmedLine.match(/^-\s+(.+)$/), false);
}

function handleOrderedItem(state: MarkdownParseState, _line: string, trimmedLine: string) {
	return handleListItem(state, trimmedLine.match(/^\d+\.\s+(.+)$/), true);
}

function handleListItem(
	state: MarkdownParseState,
	itemMatch: RegExpMatchArray | null,
	ordered: boolean
) {
	if (!itemMatch) return false;

	flushParagraph(state);
	ensureCurrentList(state, ordered);
	state.currentList?.items.push(itemMatch[1]);
	return true;
}

function ensureCurrentList(state: MarkdownParseState, ordered: boolean) {
	if (state.currentList?.ordered === ordered) return;

	closeList(state);
	state.currentList = { ordered, items: [] };
}

function handleListContinuation(state: MarkdownParseState, line: string) {
	const listContinuation = line.match(/^\s{2,}(.+)$/);
	if (!listContinuation) return false;
	if (!state.currentList?.items.length) return false;

	appendToCurrentListItem(state.currentList, listContinuation[1]);
	return true;
}

function appendToCurrentListItem(currentList: PendingList, text: string) {
	const lastItemIndex = currentList.items.length - 1;
	currentList.items[lastItemIndex] += ` ${text.trim()}`;
}

function handleParagraph(state: MarkdownParseState, _line: string, trimmedLine: string) {
	closeList(state);
	state.paragraphLines.push(trimmedLine);
	return true;
}

function finishMarkdownParse(state: MarkdownParseState) {
	if (state.inCodeBlock) flushCodeBlock(state);
	flushParagraph(state);
	closeList(state);
}

function flushParagraph(state: MarkdownParseState) {
	if (state.paragraphLines.length === 0) return;

	state.blocks.push({ type: 'paragraph', content: parseInline(state.paragraphLines.join(' ')) });
	state.paragraphLines = [];
}

function closeList(state: MarkdownParseState) {
	if (!state.currentList) return;

	state.blocks.push({
		type: 'list',
		ordered: state.currentList.ordered,
		items: state.currentList.items.map(parseInline)
	});
	state.currentList = null;
}

function flushCodeBlock(state: MarkdownParseState) {
	state.blocks.push({
		type: 'code',
		language: state.codeLanguage,
		text: state.codeLines.join('\n')
	});
	state.codeLanguage = '';
	state.codeLines = [];
}

function parseInline(value: string) {
	const tokens: MarkdownInline[] = [];
	let index = 0;

	while (index < value.length) {
		index = parseNextInlineToken(value, index, tokens);
	}

	return tokens;
}

function parseNextInlineToken(value: string, index: number, tokens: MarkdownInline[]) {
	const nextSpecial = getNextInlineSpecialIndex(value, index);
	if (nextSpecial === -1) {
		pushText(tokens, value.slice(index));
		return value.length;
	}

	pushText(tokens, value.slice(index, nextSpecial));
	return value[nextSpecial] === '`'
		? parseInlineCode(value, nextSpecial, tokens)
		: parseInlineLink(value, nextSpecial, tokens);
}

function parseInlineCode(value: string, startIndex: number, tokens: MarkdownInline[]) {
	const codeEnd = value.indexOf('`', startIndex + 1);
	if (codeEnd === -1) return pushPlainSpecial(value, startIndex, tokens);

	tokens.push({ type: 'code', text: value.slice(startIndex + 1, codeEnd) });
	return codeEnd + 1;
}

function parseInlineLink(value: string, startIndex: number, tokens: MarkdownInline[]) {
	const linkRange = getLinkRange(value, startIndex);
	if (!linkRange) return pushPlainSpecial(value, startIndex, tokens);

	tokens.push({
		type: 'link',
		text: value.slice(startIndex + 1, linkRange.textEnd),
		href: value.slice(linkRange.hrefStart, linkRange.hrefEnd)
	});
	return linkRange.hrefEnd + 1;
}

function getLinkRange(value: string, startIndex: number) {
	const textEnd = value.indexOf('](', startIndex);
	if (textEnd === -1) return null;

	const hrefStart = textEnd + 2;
	const hrefEnd = value.indexOf(')', hrefStart);
	return hrefEnd === -1 ? null : { textEnd, hrefStart, hrefEnd };
}

function pushPlainSpecial(value: string, index: number, tokens: MarkdownInline[]) {
	pushText(tokens, value.slice(index, index + 1));
	return index + 1;
}

function pushText(tokens: MarkdownInline[], text: string) {
	if (!text) return;

	const previousToken = tokens.at(-1);
	if (previousToken?.type === 'text') {
		previousToken.text += text;
		return;
	}

	tokens.push({ type: 'text', text });
}

function getNextInlineSpecialIndex(value: string, index: number) {
	return getNextSpecialIndex(value.indexOf('`', index), value.indexOf('[', index));
}

function getNextSpecialIndex(...indices: number[]) {
	const foundIndices = indices.filter((index) => index !== -1);
	return foundIndices.length ? Math.min(...foundIndices) : -1;
}
