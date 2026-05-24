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

<div class="pager">
	<button
		class="pager__button pager__button--outer pager__button--left"
		disabled={current == min}
		onclick={() => decreaseCounter(1)}
		><SvgIcon name="angle-left" color="white" scale="1.0" /></button
	>
	<button
		class="pager__button pager__button--inner"
		disabled={current == min}
		onclick={() => decreaseCounter(10)}
		><SvgIcon name="angles-left" color="white" scale="1.0" /></button
	>
	<div class="pager__input-group">
		<!-- The following hides the up and down arrows which are duplicated here
            by the custom controls
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none -->
		<input
			class="pager__input"
			type="number"
			onchange={(e) => changeInput(e)}
			onblur={(e) => blur(e)}
			value={current}
		/>
		<div class="pager__separator">of</div>
		<div class="pager__total">{max}</div>
	</div>

	<button
		class="pager__button pager__button--inner"
		disabled={current == max}
		onclick={() => increaseCounter(10)}
		><SvgIcon name="angles-right" color="white" scale="1.0" /></button
	>

	<button
		class="pager__button pager__button--outer pager__button--right"
		disabled={current == max}
		onclick={() => increaseCounter(1)}
		><SvgIcon name="angle-right" color="white" scale="1.0" /></button
	>
</div>
