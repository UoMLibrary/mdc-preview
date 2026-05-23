<script>
	// Visual component to allow loading/saving and editing of the config store
	import ConfigStore from '$lib/stores/config-store.js';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';

	import Modal from '$lib/UI/MarkdownModal.svelte';
	let showModal = false;

	export let title = '';
	export let markdownHelp;
</script>

<div class="rounded-md bg-white mb-4 text-xs pb-1">
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<div>
			{#if title}<p class="p-1 px-2 font-bold text-sm">{title}</p>{/if}
		</div>
		<div>
			<OpenJsonFileButton let:openFile on:loaded={(e) => ConfigStore.loadJson(e.detail.json)}
				><button type="button" class="p-1 mr-2" on:click={openFile}>Load</button>
			</OpenJsonFileButton>

			<SaveJsonFileButton let:saveFile jsonData={$ConfigStore} fileName="config.json">
				<button type="button" class="p-1 mr-2" on:click={saveFile}>Save</button>
			</SaveJsonFileButton>

			<button class="p-1 mr-2" on:click={(e) => ConfigStore.setDefault()}>Default</button>
			<button class="p-1 mr-2" on:click={(e) => ConfigStore.setLocal()}>Localhost</button>
			<button class="p-1 mr-2" on:click={(e) => ConfigStore.clear()}>Clear</button>

			<!-- Open help button -->
			{#if markdownHelp}
				<button
					class="w-4 h-4 mr-2 bg-gray-400 rounded-full text-white text-center text-xs"
					on:click={(e) => (showModal = true)}>?</button
				>
			{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4">
		{#each Object.entries($ConfigStore) as [key, itemValue]}
			<!-- Show each key value pair -->
			<div class="mb-2 flex items-center border rounded-md text-left text-xs">
				<div class="px-4 w-64 font-bold">{key}:</div>
				<input
					type="text"
					class="px-2 bg-zinc-100 text-sm py-1 w-full"
					value={itemValue}
					on:change={(e) => ConfigStore.setKeyValue(key, e.target.value)}
				/>
			</div>
		{/each}
	</div>
</div>

<Modal bind:showModal {title} markdown={markdownHelp} />
