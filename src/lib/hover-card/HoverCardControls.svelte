<script lang="ts">
	import {
		ANGLE_RANGE,
		WIDTH_RANGE,
		shapeForScreen,
		type HoverCardScreen,
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
		change: (patch: Partial<Pick<HoverCardTheme, 'shape' | 'mobileShape' | 'width' | 'angle'>>) => void;
	} = $props();
	const SHAPES: Array<{ id: HoverCardShape; label: string }> = [
		{ id: 'partial', label: 'Partial' },
		{ id: 'full', label: 'Full card' }
	];
	const SCREENS: Array<{ id: HoverCardScreen; label: string }> = [
		{ id: 'desktop', label: 'Desktop (900px and above)' },
		{ id: 'mobile', label: 'Mobile (below 900px)' }
	];
	const anyPartial = $derived(
		SCREENS.some((screen) => shapeForScreen(theme, screen.id) === 'partial')
	);
	function setShape(screen: HoverCardScreen, shape: HoverCardShape) {
		// Pin mobile first, so changing desktop can't change a mobile shape already on screen.
		if (screen === 'mobile') change({ mobileShape: shape });
		else change({ shape, mobileShape: shapeForScreen(theme, 'mobile') });
	}
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
	{#each SCREENS as screen (screen.id)}
		<div class="screen">
			<span>{screen.label}</span>
			<div class="shapes" role="group" aria-label={`${screen.label} hover card shape`}>
				{#each SHAPES as shape (shape.id)}
					<button
						type="button"
						class={['shape', { selected: shapeForScreen(theme, screen.id) === shape.id }]}
						aria-pressed={shapeForScreen(theme, screen.id) === shape.id}
						{disabled}
						onclick={() => setShape(screen.id, shape.id)}>{shape.label}</button
					>
				{/each}
			</div>
		</div>
	{/each}
	{#if anyPartial}
		{@render slider('Width', 'percent', WIDTH_RANGE, theme.width, (width) => change({ width }))}
		{@render slider('Angle', 'degrees', ANGLE_RANGE, theme.angle, (angle) => change({ angle }))}
		<p class="hint">
			Width and angle apply to the partial shape on any screen. Width is measured at mid-height, and
			a negative angle leans the edge the other way.
		</p>
	{/if}
</div>

<style>
	.controls {
		display: grid;
		gap: 16px;
		color: #475569;
		font-size: 12px;
	}
	.screen {
		display: grid;
		gap: 6px;
		font-weight: 500;
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
