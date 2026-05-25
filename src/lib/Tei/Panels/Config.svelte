<script lang="ts">
	// Visual component to allow loading/saving and editing of the config store
	import ConfigStore from '$lib/stores/config-store.js';
	import { previewConfigData } from '$lib/Tei/preview-utils.js';
	import ConfigPresetSelect from '$lib/Tei/Panels/ConfigPresetSelect.svelte';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';
	import type { ConfigStoreValue } from '$lib/stores/config-store.js';

	interface Props {
		title?: string;
	}

	let { title = '' }: Props = $props();
	let selectedPreset = $state('');

	function loadPreset(key: string) {
		selectedPreset = key;
		ConfigStore.loadJson({ ...previewConfigData[key] });
	}
</script>

<div class="tool-panel">
	<!-- Panel Header -->
	<div class="tool-panel__header">
		<div>
			{#if title}<p class="tool-panel__title">{title}</p>{/if}
		</div>
		<div>
			<ConfigPresetSelect {selectedPreset} selectPreset={loadPreset} />

			<OpenJsonFileButton
				label="Load"
				loaded={(payload) => ConfigStore.loadJson(payload.json as ConfigStoreValue)}
			/>

			<SaveJsonFileButton label="Save" jsonData={$ConfigStore} fileName="config.json" />

			<button class="tool-panel__button" onclick={() => ConfigStore.setDefault()}>Default</button>
			<button class="tool-panel__button" onclick={() => ConfigStore.setLocal()}>Localhost</button>
			<button class="tool-panel__button" onclick={() => ConfigStore.clear()}>Clear</button>
		</div>
	</div>
	<!-- Panel Body -->
	<div class="tool-panel__body">
		{#each Object.entries($ConfigStore) as [key, itemValue] (key)}
			<!-- Show each key value pair -->
			<div class="tool-panel__config-row">
				<div class="tool-panel__config-key">{key}:</div>
				<input
					type="text"
					class="tool-panel__config-input"
					value={itemValue}
					onchange={(e) => ConfigStore.setKeyValue(key, e.currentTarget.value)}
				/>
			</div>
		{/each}
	</div>
</div>
