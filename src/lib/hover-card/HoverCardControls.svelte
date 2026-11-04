<script lang="ts">
	import {
		ANGLE_RANGE,
		WIDTH_RANGE,
		type HoverCardShape,
		type HoverCardTheme
	} from './index';
	let {
		theme,
		disabled = false,
		change
	}: {
		theme: HoverCardTheme;
		disabled?: boolean;
		change: (patch: Partial<Pick<HoverCardTheme, 'shape' | 'width' | 'angle'>>) => void;
	} = $props();
	const SHAPES: Array<{ id: HoverCardShape; label: string }> = [
		{ id: 'partial', label: 'Partial' },
		{ id: 'full', label: 'Full card' }
	];
</script>

{#snippet slider(
	label: string,
	unit: string,
	range: { min: number; max: number; default: number },
	value: number,
	update: (value: number) => void
)}
	{@const set = (next: number) => {
		if (Number.isFinite(next)) update(Math.min(range.max, Math.max(range.min, next)));
	}}
	<div class="slider">
		<label
			>{label}<input
				type="range"
				min={range.min}
				max={range.max}
				{disabled}
				{value}
				oninput={(event) => set(event.currentTarget.valueAsNumber)}
			/></label
		>
		<input
			aria-label={`${label} in ${unit}`}
			type="number"
			min={range.min}
			max={range.max}
			{disabled}
			{value}
			onchange={(event) => set(event.currentTarget.valueAsNumber)}
		/>
		<button
			type="button"
			{disabled}
			onclick={() => update(range.default)}
			aria-label={`Reset ${label.toLowerCase()}`}>Reset</button
		>
	</div>
{/snippet}

<div class="controls">
	<div class="shapes" role="group" aria-label="Hover card shape">
		{#each SHAPES as shape (shape.id)}
			<button
				type="button"
				class={['shape', { selected: theme.shape === shape.id }]}
				aria-pressed={theme.shape === shape.id}
				{disabled}
				onclick={() => change({ shape: shape.id })}>{shape.label}</button
			>
		{/each}
	</div>
	{#if theme.shape === 'partial'}
		{@render slider('Width', 'percent', WIDTH_RANGE, theme.width, (width) => change({ width }))}
		{@render slider('Angle', 'degrees', ANGLE_RANGE, theme.angle, (angle) => change({ angle }))}
		<p class="hint">Width is measured at mid-height. A negative angle leans the edge the other way.</p>
	{:else}
		<p class="hint">The glass covers the whole card it appears on.</p>
	{/if}
</div>

<style>
	.controls {
		display: grid;
		gap: 16px;
		color: #475569;
		font-size: 12px;
	}
	.shapes {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.shape {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 8px 12px;
		background: white;
		color: #334155;
		font-size: 13px;
	}
	.shape.selected {
		border-color: #0f172a;
		background: #0f172a;
		color: white;
	}
	.slider {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 64px auto;
		gap: 10px;
		align-items: end;
		font-weight: 500;
	}
	.slider label {
		display: grid;
		gap: 6px;
	}
	input[type='range'] {
		width: 100%;
		accent-color: #0f172a;
	}
	input[type='number'] {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 6px 8px;
		background: white;
	}
	.hint {
		margin: 0;
		color: #64748b;
	}
	button {
		padding: 6px;
		cursor: pointer;
	}
	:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	button:focus-visible {
		outline: 2px solid #64748b;
		outline-offset: 3px;
	}
</style>
