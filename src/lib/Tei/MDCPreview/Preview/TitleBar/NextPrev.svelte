<script lang="ts">
	import SvgIcon from '$lib/UI/SvgIcon.svelte';

	type UpdatePage = (page: number) => void;

	interface Props {
		current?: number;
		min?: number;
		max?: number;
		update?: UpdatePage;
	}

	let { current = 0, min = 0, max = 0, update = () => {} }: Props = $props();

	function setCurrent(value: number) {
		current = value;
		update(current);
	}

	function decreaseCounter(amount: number) {
		let newPos = Number(current) - amount;
		if (newPos > min) {
			setCurrent(newPos);
		} else setCurrent(min);
	}

	function increaseCounter(amount: number) {
		let newPos = Number(current) + amount;
		if (newPos < max) {
			setCurrent(newPos);
		} else setCurrent(max);
	}

	function blur(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		let val = parseInt(input.value);
		if (isNaN(val)) {
			input.value = String(Number(current));
			setCurrent(Number(current));
		}
	}

	function changeInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		let newValue = parseInt(input.value);
		if (isNaN(newValue)) {
			setCurrent(Number(current));
		} else if (newValue > max) {
			setCurrent(max);
		} else if (newValue < min) {
			setCurrent(min);
		} else {
			setCurrent(newValue);
		}
	}
</script>

<div class="flex justify-center py-1">
	<button
		class="w-8 disabled:opacity-50 text-white font-bold rounded-l-md text-xs"
		disabled={current == min}
		onclick={() => decreaseCounter(1)}
		><SvgIcon name="angle-left" color="white" scale="1.0" /></button
	>
	<button
		class="w-6 disabled:opacity-50 text-white font-bold text-xs"
		disabled={current == min}
		onclick={() => decreaseCounter(10)}
		><SvgIcon name="angles-left" color="white" scale="1.0" /></button
	>
	<div class="flex items-center">
		<!-- The following hides the up and down arrows which are duplicated here
            by the custom controls
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none -->
		<input
			class="bg-transparent w-10 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			type="number"
			onchange={(e) => changeInput(e)}
			onblur={(e) => blur(e)}
			value={current}
		/>
		<div class="w-4">of</div>
		<div class="w-10 text-center">{max}</div>
	</div>

	<button
		class="w-6 disabled:opacity-50 text-white font-bold text-xs"
		disabled={current == max}
		onclick={() => increaseCounter(10)}
		><SvgIcon name="angles-right" color="white" scale="1.0" /></button
	>

	<button
		class="w-8 disabled:opacity-50 text-white font-bold rounded-r-md text-xs"
		disabled={current == max}
		onclick={() => increaseCounter(1)}
		><SvgIcon name="angle-right" color="white" scale="1.0" /></button
	>
</div>
