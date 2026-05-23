<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<article class="home-links">
	<h2>Digital collection preview tool</h2>
	<p>
		<a href={resolve('/preview/tool')}>Preview tool </a><span class="text-xs">
			(There may be a delay if a large TEI is loaded)</span
		>
	</p>
	<p><a href={resolve('/preview')}>Preview</a></p>
</article>

<style>
	.home-links {
		padding: 0.5rem;
		font-size: 1rem;
		line-height: 1.6;
	}

	.home-links h2 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.home-links p {
		margin: 0 0 0.75rem;
	}

	.home-links a {
		color: #632390;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
