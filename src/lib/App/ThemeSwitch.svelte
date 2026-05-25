<script lang="ts">
	import ThemeStore from '$lib/stores/theme-store.js';

	function toggleTheme() {
		ThemeStore.setTheme($ThemeStore === 'dark' ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	class="theme-switch"
	aria-label={$ThemeStore === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	aria-pressed={$ThemeStore === 'dark'}
	title={$ThemeStore === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={toggleTheme}
>
	<span class="theme-switch__track">
		<span class="theme-switch__thumb"></span>
	</span>
</button>
