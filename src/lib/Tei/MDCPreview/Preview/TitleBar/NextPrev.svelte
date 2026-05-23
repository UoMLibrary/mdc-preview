<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	export let current = 0;
	export let min = 0;
	export let max = 0;

	// Workaround value not updating in event handling
	// https://svelte.dev/repl/85e2b7097e8f4255b0fc5757988ebdb9?version=3.16.4
	let field;

	//$: console.log(current, min, max);

	let previousN = current;

	function decreaseCounter(amount) {
		let newPos = Number(current) - amount;
		if (newPos > min) {
			current = newPos;
		} else current = min;
	}

	function increaseCounter(amount) {
		let newPos = Number(current) + amount;
		if (newPos < max) {
			current = newPos;
		} else current = max;
	}

	function blur(e) {
		let val = parseInt(e.target.value);
		if (isNaN(val)) {
			current = field.value = Number(previousN);
			current = field.value;
		}
	}

	function changeInput(e) {
		let newValue = parseInt(e.target.value);
		if (isNaN(newValue)) {
			current = Number(previousN);
		} else if (newValue > max) {
			current = max;
			previousN = current;
		} else if (newValue < min) {
			current = min;
			previousN = current;
		} else {
			current = newValue;
			previousN = current;
		}
	}

	$: dispatch('update', current);
</script>

<div class="flex justify-center py-1">
	<button
		class="w-8 disabled:opacity-50 text-white font-bold rounded-l-md text-xs"
		disabled={current == min}
		on:click={(e) => decreaseCounter(1)}
		><SvgIcon name="angle-left" color="white" scale="1.0" /></button
	>
	<button
		class="w-6 disabled:opacity-50 text-white font-bold text-xs"
		disabled={current == min}
		on:click={(e) => decreaseCounter(10)}
		><SvgIcon name="angles-left" color="white" scale="1.0" /></button
	>
	<div class="flex items-center">
		<!-- The following hides the up and down arrows which are duplicated here
            by the custom controls
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none -->
		<input
			class="bg-transparent w-10 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			type="number"
			on:change={(e) => changeInput(e)}
			on:blur={(e) => blur(e)}
			value={current}
			bind:this={field}
		/>
		<div class="w-4">of</div>
		<div class="w-10 text-center">{max}</div>
	</div>

	<button
		class="w-6 disabled:opacity-50 text-white font-bold text-xs"
		disabled={current == max}
		on:click={(e) => increaseCounter(10)}
		><SvgIcon name="angles-right" color="white" scale="1.0" /></button
	>

	<button
		class="w-8 disabled:opacity-50 text-white font-bold rounded-r-md text-xs"
		disabled={current == max}
		on:click={(e) => increaseCounter(1)}
		><SvgIcon name="angle-right" color="white" scale="1.0" /></button
	>
</div>
