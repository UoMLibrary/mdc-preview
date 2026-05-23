<script lang="ts">
	interface Props {
		size?: string | number;
		unit?: string;
		duration?: string;
		color?: string;
	}

	let { size = 30, unit = 'px', duration = '2s', color = 'currentColor' }: Props = $props();

	const sizeValue = $derived(getSizeValue(size, unit));

	function getSizeValue(size: string | number, unit: string) {
		return isNumericSize(size) ? `${size}${unit}` : String(size);
	}

	function isNumericSize(size: string | number) {
		return typeof size === 'number' || /^\d+(\.\d+)?$/.test(size);
	}
</script>

<span
	class="spinner"
	style:--spinner-size={sizeValue}
	style:--spinner-duration={duration}
	style:--spinner-color={color}
	aria-label="Loading"
	role="status"
></span>

<style>
	.spinner {
		display: inline-block;
		width: var(--spinner-size);
		height: var(--spinner-size);
		border: calc(var(--spinner-size) / 8) solid transparent;
		border-top-color: var(--spinner-color);
		border-right-color: var(--spinner-color);
		border-radius: 50%;
		animation: spin var(--spinner-duration) linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
