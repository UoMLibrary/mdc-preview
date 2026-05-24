<script lang="ts">
	interface Props {
		value: unknown;
		depth?: number;
	}

	interface JsonRow {
		id: string;
		indent: number;
		text: string;
	}

	let { value, depth = 0 }: Props = $props();

	const rows = $derived(formatJsonRows(value, depth));

	function formatJsonRows(jsonValue: unknown, maxDepth: number): JsonRow[] {
		return formatJsonValue(jsonValue, maxDepth, 0, 'root', undefined, true);
	}

	function formatJsonValue(
		jsonValue: unknown,
		maxDepth: number,
		indent: number,
		path: string,
		key: string | undefined,
		isLast: boolean
	): JsonRow[] {
		if (!isJsonContainer(jsonValue)) {
			return [createRow(path, indent, createJsonLine(key, formatPrimitive(jsonValue), isLast))];
		}

		if (indent > maxDepth) {
			return [createRow(path, indent, createJsonLine(key, formatCollapsed(jsonValue), isLast))];
		}

		return formatContainerRows(jsonValue, maxDepth, indent, path, key, isLast);
	}

	function formatContainerRows(
		jsonValue: Record<string, unknown> | unknown[],
		maxDepth: number,
		indent: number,
		path: string,
		key: string | undefined,
		isLast: boolean
	): JsonRow[] {
		const rows: JsonRow[] = [];
		const entries = getEntries(jsonValue);
		const { open, close } = getDelimiters(jsonValue);

		rows.push(createRow(`${path}:open`, indent, createJsonLine(key, open, true)));
		entries.forEach(([entryKey, entryValue], index) => {
			rows.push(
				...formatJsonValue(
					entryValue,
					maxDepth,
					indent + 1,
					`${path}.${entryKey}`,
					Array.isArray(jsonValue) ? undefined : entryKey,
					index === entries.length - 1
				)
			);
		});
		rows.push(createRow(`${path}:close`, indent, `${close}${isLast ? '' : ','}`));

		return rows;
	}

	function createJsonLine(key: string | undefined, valueText: string, isLast: boolean) {
		const prefix = key === undefined ? '' : `${JSON.stringify(key)}: `;
		return `${prefix}${valueText}${isLast ? '' : ','}`;
	}

	function createRow(id: string, indent: number, text: string): JsonRow {
		return { id, indent, text };
	}

	function getEntries(jsonValue: Record<string, unknown> | unknown[]) {
		return Array.isArray(jsonValue)
			? jsonValue.map((item, index) => [String(index), item] as const)
			: Object.entries(jsonValue);
	}

	function getDelimiters(jsonValue: Record<string, unknown> | unknown[]) {
		return Array.isArray(jsonValue) ? { open: '[', close: ']' } : { open: '{', close: '}' };
	}

	function isJsonContainer(jsonValue: unknown): jsonValue is Record<string, unknown> | unknown[] {
		return typeof jsonValue === 'object' && jsonValue !== null;
	}

	function formatCollapsed(jsonValue: Record<string, unknown> | unknown[]) {
		const count = getEntries(jsonValue).length;
		return Array.isArray(jsonValue) ? `[ ... ${count} items ]` : `{ ... ${count} keys }`;
	}

	function formatPrimitive(jsonValue: unknown) {
		if (jsonValue === undefined) return 'undefined';
		return JSON.stringify(jsonValue);
	}
</script>

<pre class="json-tree" aria-label="JSON output"><code
		>{#each rows as row (row.id)}
			<span class="json-tree__line" style={`padding-left: ${row.indent * 1.25}rem`}>{row.text}</span
			>
		{/each}</code
	></pre>

<style>
	.json-tree {
		margin: 0;
		overflow: auto;
		font-size: 0.75rem;
		line-height: 1.5;
		white-space: pre;
	}

	.json-tree__line {
		display: block;
		min-height: 1.125rem;
	}
</style>
