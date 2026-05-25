export type MarkdownInline =
	| { type: 'text'; text: string }
	| { type: 'code'; text: string }
	| { type: 'link'; text: string; href: string };

export type MarkdownBlock =
	| { type: 'heading'; level: number; content: MarkdownInline[] }
	| { type: 'paragraph'; content: MarkdownInline[] }
	| { type: 'list'; ordered: boolean; items: MarkdownInline[][] }
	| { type: 'code'; language: string; text: string };

interface PendingList {
	ordered: boolean;
	items: string[];
}

export function parseMarkdown(markdown: string) {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const blocks: MarkdownBlock[] = [];
	let paragraphLines: string[] = [];
	let currentList: PendingList | null = null;
	let inCodeBlock = false;
	let codeLanguage = '';
	let codeLines: string[] = [];

	const flushParagraph = () => {
		if (paragraphLines.length === 0) return;

		blocks.push({ type: 'paragraph', content: parseInline(paragraphLines.join(' ')) });
		paragraphLines = [];
	};

	const closeList = () => {
		if (!currentList) return;

		blocks.push({
			type: 'list',
			ordered: currentList.ordered,
			items: currentList.items.map(parseInline)
		});
		currentList = null;
	};

	const flushCodeBlock = () => {
		blocks.push({ type: 'code', language: codeLanguage, text: codeLines.join('\n') });
		codeLanguage = '';
		codeLines = [];
	};

	for (const line of lines) {
		const trimmedLine = line.trim();
		const codeFence = trimmedLine.match(/^```([A-Za-z0-9_-]*)$/);

		if (codeFence) {
			if (inCodeBlock) {
				flushCodeBlock();
				inCodeBlock = false;
				continue;
			}

			flushParagraph();
			closeList();
			inCodeBlock = true;
			codeLanguage = codeFence[1] ?? '';
			continue;
		}

		if (inCodeBlock) {
			codeLines.push(line);
			continue;
		}

		if (!trimmedLine) {
			flushParagraph();
			closeList();
			continue;
		}

		const heading = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
		if (heading) {
			flushParagraph();
			closeList();
			blocks.push({
				type: 'heading',
				level: heading[1].length,
				content: parseInline(heading[2])
			});
			continue;
		}

		const unorderedItem = trimmedLine.match(/^-\s+(.+)$/);
		if (unorderedItem) {
			flushParagraph();
			if (!currentList || currentList.ordered) {
				closeList();
				currentList = { ordered: false, items: [] };
			}
			currentList.items.push(unorderedItem[1]);
			continue;
		}

		const orderedItem = trimmedLine.match(/^\d+\.\s+(.+)$/);
		if (orderedItem) {
			flushParagraph();
			if (!currentList || !currentList.ordered) {
				closeList();
				currentList = { ordered: true, items: [] };
			}
			currentList.items.push(orderedItem[1]);
			continue;
		}

		const listContinuation = line.match(/^\s{2,}(.+)$/);
		if (listContinuation && currentList?.items.length) {
			const lastItemIndex = currentList.items.length - 1;
			currentList.items[lastItemIndex] += ` ${listContinuation[1].trim()}`;
			continue;
		}

		closeList();
		paragraphLines.push(trimmedLine);
	}

	if (inCodeBlock) flushCodeBlock();
	flushParagraph();
	closeList();

	return blocks;
}

function parseInline(value: string) {
	const tokens: MarkdownInline[] = [];
	let index = 0;

	const pushText = (text: string) => {
		if (!text) return;

		const previousToken = tokens.at(-1);
		if (previousToken?.type === 'text') {
			previousToken.text += text;
			return;
		}

		tokens.push({ type: 'text', text });
	};

	while (index < value.length) {
		const nextCode = value.indexOf('`', index);
		const nextLink = value.indexOf('[', index);
		const nextSpecial = getNextSpecialIndex(nextCode, nextLink);

		if (nextSpecial === -1) {
			pushText(value.slice(index));
			break;
		}

		pushText(value.slice(index, nextSpecial));

		if (nextSpecial === nextCode) {
			const codeEnd = value.indexOf('`', nextSpecial + 1);
			if (codeEnd === -1) {
				pushText(value.slice(nextSpecial, nextSpecial + 1));
				index = nextSpecial + 1;
				continue;
			}

			tokens.push({ type: 'code', text: value.slice(nextSpecial + 1, codeEnd) });
			index = codeEnd + 1;
			continue;
		}

		const linkTextEnd = value.indexOf('](', nextSpecial);
		const linkHrefEnd = linkTextEnd === -1 ? -1 : value.indexOf(')', linkTextEnd + 2);
		if (linkTextEnd === -1 || linkHrefEnd === -1) {
			pushText(value.slice(nextSpecial, nextSpecial + 1));
			index = nextSpecial + 1;
			continue;
		}

		tokens.push({
			type: 'link',
			text: value.slice(nextSpecial + 1, linkTextEnd),
			href: value.slice(linkTextEnd + 2, linkHrefEnd)
		});
		index = linkHrefEnd + 1;
	}

	return tokens;
}

function getNextSpecialIndex(...indices: number[]) {
	const foundIndices = indices.filter((index) => index !== -1);
	return foundIndices.length ? Math.min(...foundIndices) : -1;
}
