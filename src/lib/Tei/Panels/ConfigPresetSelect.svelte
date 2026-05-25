<script lang="ts">
	import { previewConfigData } from '$lib/Tei/preview-utils.js';

	interface Props {
		selectedPreset?: string;
		placeholder?: string;
		selectPreset?: (key: string) => void;
	}

	let {
		selectedPreset = '',
		placeholder = 'Config preset',
		selectPreset = () => {}
	}: Props = $props();

	const configPresets = Object.keys(previewConfigData).map((key) => ({
		key,
		label: toPresetLabel(key)
	}));

	function toPresetLabel(key: string) {
		return key.replace(/(^|-)([a-z])/g, (_match, separator: string, letter: string) => {
			return `${separator ? ' ' : ''}${letter.toUpperCase()}`;
		});
	}
</script>

<select
	class="tool-panel__select"
	aria-label="Configuration preset"
	value={selectedPreset}
	onchange={(event) => selectPreset(event.currentTarget.value)}
>
	{#if placeholder}
		<option value="" disabled>{placeholder}</option>
	{/if}
	{#each configPresets as preset (preset.key)}
		<option value={preset.key}>{preset.label}</option>
	{/each}
</select>
