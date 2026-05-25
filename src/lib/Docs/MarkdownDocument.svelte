<script lang="ts">
	import { resolve } from '$app/paths';
	import { parseMarkdown } from '$lib/Docs/markdown.js';

	interface Props {
		markdown: string;
	}

	type MarkdownBlock = ReturnType<typeof parseMarkdown>[number];
	type MarkdownContentBlock = Extract<MarkdownBlock, { content: unknown[] }>;
	type MarkdownListBlock = Extract<MarkdownBlock, { items: unknown[][] }>;
	type MarkdownInline =
		| MarkdownContentBlock['content'][number]
		| MarkdownListBlock['items'][number][number];

	let { markdown }: Props = $props();
	const blocks = $derived(parseMarkdown(markdown));

	function openExternalLink(href: string) {
		window.open(href, '_blank', 'noopener,noreferrer');
	}
</script>

{#snippet inlineContent(tokens: MarkdownInline[])}
	{#each tokens as token, index (index)}
		{#if token.type === 'code'}
			<code>{token.text}</code>
		{:else if token.type === 'link'}
			{#if token.href.startsWith('/')}
				<a href={resolve(token.href as '/')}>{token.text}</a>
			{:else}
				<button
					type="button"
					class="markdown-document__link"
					onclick={() => openExternalLink(token.href)}
				>
					{token.text}
				</button>
			{/if}
		{:else}
			{token.text}
		{/if}
	{/each}
{/snippet}

<article class="markdown-document">
	{#each blocks as block, index (index)}
		{#if block.type === 'heading'}
			<svelte:element this={`h${block.level}`}>
				{@render inlineContent(block.content)}
			</svelte:element>
		{:else if block.type === 'paragraph'}
			<p>{@render inlineContent(block.content)}</p>
		{:else if block.type === 'list'}
			{#if block.ordered}
				<ol>
					{#each block.items as item, itemIndex (itemIndex)}
						<li>{@render inlineContent(item)}</li>
					{/each}
				</ol>
			{:else}
				<ul>
					{#each block.items as item, itemIndex (itemIndex)}
						<li>{@render inlineContent(item)}</li>
					{/each}
				</ul>
			{/if}
		{:else if block.type === 'code'}
			<pre><code class={block.language ? `language-${block.language}` : undefined}
					>{block.text}</code
				></pre>
		{/if}
	{/each}
</article>
