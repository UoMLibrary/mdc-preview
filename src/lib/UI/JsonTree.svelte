<script lang="ts">
	interface Props {
		value: unknown;
		depth?: number;
	}

	type JsonContainer = Record<string, unknown> | unknown[];
	type JsonPrimitiveType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'unknown';
	type JsonRowKind = 'open' | 'close' | 'collapsed' | 'primitive';

	interface JsonRow {
		id: string;
		path: string;
		indent: number;
		kind: JsonRowKind;
		key?: string;
		isLast: boolean;
		text?: string;
		valueType?: JsonPrimitiveType;
		open?: string;
		close?: string;
	}

	let { value, depth = 0 }: Props = $props();

	let collapsedPaths = $state<string[]>([]);
	let expandedPaths = $state<string[]>([]);

	const rows = $derived(formatJsonRows(value, depth));

	export function resetManualExpansion() {
		collapsedPaths = [];
		expandedPaths = [];
	}

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
		if (!isJsonContainer(jsonValue))
			return [createPrimitiveRow(jsonValue, indent, path, key, isLast)];
		if (isContainerCollapsed(path, indent, maxDepth)) {
			return [createCollapsedRow(jsonValue, indent, path, key, isLast)];
		}

		return formatContainerRows(jsonValue, maxDepth, indent, path, key, isLast);
	}

	function formatContainerRows(
		jsonValue: JsonContainer,
		maxDepth: number,
		indent: number,
		path: string,
		key: string | undefined,
		isLast: boolean
	): JsonRow[] {
		const rows: JsonRow[] = [createOpenRow(jsonValue, indent, path, key)];
		const entries = getEntries(jsonValue);

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

		rows.push(createCloseRow(jsonValue, indent, path, isLast));
		return rows;
	}

	function createPrimitiveRow(
		jsonValue: unknown,
		indent: number,
		path: string,
		key: string | undefined,
		isLast: boolean
	): JsonRow {
		return {
			id: path,
			path,
			indent,
			kind: 'primitive',
			key,
			isLast,
			text: formatPrimitive(jsonValue),
			valueType: getPrimitiveType(jsonValue)
		};
	}

	function createOpenRow(
		jsonValue: JsonContainer,
		indent: number,
		path: string,
		key: string | undefined
	): JsonRow {
		return {
			id: `${path}:open`,
			path,
			indent,
			kind: 'open',
			key,
			isLast: true,
			open: Array.isArray(jsonValue) ? '[' : '{'
		};
	}

	function createCloseRow(
		jsonValue: JsonContainer,
		indent: number,
		path: string,
		isLast: boolean
	): JsonRow {
		return {
			id: `${path}:close`,
			path,
			indent,
			kind: 'close',
			isLast,
			close: Array.isArray(jsonValue) ? ']' : '}'
		};
	}

	function createCollapsedRow(
		jsonValue: JsonContainer,
		indent: number,
		path: string,
		key: string | undefined,
		isLast: boolean
	): JsonRow {
		return {
			id: `${path}:collapsed`,
			path,
			indent,
			kind: 'collapsed',
			key,
			isLast,
			text: Array.isArray(jsonValue) ? '[...]' : '{...}'
		};
	}

	function getEntries(jsonValue: JsonContainer) {
		return Array.isArray(jsonValue)
			? jsonValue.map((item, index) => [String(index), item] as const)
			: Object.entries(jsonValue);
	}

	function isJsonContainer(jsonValue: unknown): jsonValue is JsonContainer {
		return typeof jsonValue === 'object' && jsonValue !== null;
	}

	function isContainerCollapsed(path: string, indent: number, maxDepth: number) {
		if (collapsedPaths.includes(path)) return true;
		if (expandedPaths.includes(path)) return false;
		return indent > maxDepth;
	}

	function togglePath(path: string, isCollapsed: boolean) {
		if (isCollapsed) {
			collapsedPaths = collapsedPaths.filter((item) => item !== path);
			expandedPaths = addUnique(expandedPaths, path);
			return;
		}

		expandedPaths = expandedPaths.filter((item) => item !== path);
		collapsedPaths = addUnique(collapsedPaths, path);
	}

	function addUnique(items: string[], item: string) {
		return items.includes(item) ? items : [...items, item];
	}

	function formatPrimitive(jsonValue: unknown) {
		if (jsonValue === undefined) return 'undefined';
		return JSON.stringify(jsonValue);
	}

	function getPrimitiveType(jsonValue: unknown): JsonPrimitiveType {
		if (jsonValue === null) return 'null';
		if (jsonValue === undefined) return 'undefined';
		if (['string', 'number', 'boolean'].includes(typeof jsonValue)) {
			return typeof jsonValue as JsonPrimitiveType;
		}

		return 'unknown';
	}
</script>

<div class="json-tree" role="tree" aria-label="JSON output">
	{#each rows as row (row.id)}
		<div class="json-tree__line" style={`--json-indent: ${row.indent * 1.25}rem`}>
			{#if row.key !== undefined}
				<span class="json-tree__key">{JSON.stringify(row.key)}: </span>
			{/if}

			{#if row.kind === 'primitive'}
				<span class="json-tree__value json-tree__value--{row.valueType}">{row.text}</span><span
					class="json-tree__syntax">{row.isLast ? '' : ','}</span
				>
			{:else if row.kind === 'open'}
				<button
					type="button"
					class="json-tree__delimiter"
					aria-label="Collapse JSON node"
					onclick={() => togglePath(row.path, false)}
				>
					<span class="json-tree__delimiter-text">{row.open}</span>
				</button>
			{:else if row.kind === 'close'}
				<button
					type="button"
					class="json-tree__delimiter"
					aria-label="Collapse JSON node"
					onclick={() => togglePath(row.path, false)}
				>
					<span class="json-tree__delimiter-text">{row.close}</span></button
				><span class="json-tree__syntax">{row.isLast ? '' : ','}</span>
			{:else}
				<button
					type="button"
					class="json-tree__delimiter json-tree__delimiter--collapsed"
					aria-label="Expand JSON node"
					onclick={() => togglePath(row.path, true)}
				>
					<span class="json-tree__delimiter-text">{row.text}</span></button
				><span class="json-tree__syntax">{row.isLast ? '' : ','}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.json-tree {
		overflow: auto;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.75rem;
		line-height: 1.25;
	}

	.json-tree__line {
		min-height: 0.9375rem;
		padding-left: var(--json-indent);
		font-size: 0;
		white-space: normal;
	}

	.json-tree__delimiter {
		padding: 0;
		font-family: inherit;
		font-size: 0;
		line-height: 1.25;
		color: #111827;
	}

	.json-tree__delimiter-text {
		font-size: 0.75rem;
	}

	.json-tree__delimiter:hover,
	.json-tree__delimiter:focus-visible {
		color: #632390;
		text-decoration: underline;
		text-underline-offset: 0.125rem;
	}

	.json-tree__delimiter--collapsed {
		color: #111827;
	}

	.json-tree__key,
	.json-tree__value,
	.json-tree__syntax {
		font-size: 0.75rem;
		line-height: 1.25;
	}

	.json-tree__key,
	.json-tree__syntax {
		color: #111827;
	}

	.json-tree__key,
	.json-tree__value {
		white-space: pre-wrap;
	}

	.json-tree__value--string {
		color: #008000;
	}

	.json-tree__value--number {
		color: #c41a16;
	}

	.json-tree__value--boolean {
		color: #1f4ec9;
	}

	.json-tree__value--null,
	.json-tree__value--undefined {
		color: #6b7280;
	}
</style>
