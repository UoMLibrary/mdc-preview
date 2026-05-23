<script lang="ts">
	interface Props {
		size?: string | number;
		unit?: string;
		duration?: string;
		color?: string;
	}

	let { size = 30, unit = 'px', duration = '2s', color = 'currentColor' }: Props = $props();

	const sizeValue = $derived(typeof size === 'number' ? `${size}${unit}` : size);
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
		border: calc(var(--spinner-size) / 8) solid
			color-mix(in srgb, var(--spinner-color), transparent 75%);
		border-top-color: var(--spinner-color);
		border-radius: 50%;
		animation: spin var(--spinner-duration) linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
