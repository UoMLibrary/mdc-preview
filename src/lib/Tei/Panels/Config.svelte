<script>
	// Visual component to allow loading/saving and editing of the config store
	import ConfigStore from '$lib/stores/config-store.js';
	import OpenJsonFileButton from '$lib/UI/FileButtons/OpenJsonFileButton.svelte';
	import SaveJsonFileButton from '$lib/UI/FileButtons/SaveJsonFileButton.svelte';

	import Modal from '$lib/UI/MarkdownModal.svelte';
	let showModal = $state(false);

	let { title = '', markdownHelp } = $props();
</script>

<div class="rounded-md bg-white mb-4 text-xs pb-1">
	<!-- Panel Header -->
	<div class="flex border-b justify-between">
		<div>
			{#if title}<p class="p-1 px-2 font-bold text-sm">{title}</p>{/if}
		</div>
		<div>
			<OpenJsonFileButton loaded={(payload) => ConfigStore.loadJson(payload.json)}>
				{#snippet children(openFile)}
					<button type="button" class="p-1 mr-2" onclick={openFile}>Load</button>
				{/snippet}
			</OpenJsonFileButton>

			<SaveJsonFileButton jsonData={$ConfigStore} fileName="config.json">
				{#snippet children(saveFile)}
					<button type="button" class="p-1 mr-2" onclick={saveFile}>Save</button>
				{/snippet}
			</SaveJsonFileButton>

			<button class="p-1 mr-2" onclick={() => ConfigStore.setDefault()}>Default</button>
			<button class="p-1 mr-2" onclick={() => ConfigStore.setLocal()}>Localhost</button>
			<button class="p-1 mr-2" onclick={() => ConfigStore.clear()}>Clear</button>

			<!-- Open help button -->
			{#if markdownHelp}
				<button
					class="w-4 h-4 mr-2 bg-gray-400 rounded-full text-white text-center text-xs"
					onclick={() => (showModal = true)}>?</button
				>
			{/if}
		</div>
	</div>
	<!-- Panel Body -->
	<div class="m-4">
		{#each Object.entries($ConfigStore) as [key, itemValue] (key)}
			<!-- Show each key value pair -->
			<div class="mb-2 flex items-center border rounded-md text-left text-xs">
				<div class="px-4 w-64 font-bold">{key}:</div>
				<input
					type="text"
					class="px-2 bg-zinc-100 text-sm py-1 w-full"
					value={itemValue}
					onchange={(e) => ConfigStore.setKeyValue(key, e.currentTarget.value)}
				/>
			</div>
		{/each}
	</div>
</div>

<Modal bind:showModal {title} markdown={markdownHelp} />
