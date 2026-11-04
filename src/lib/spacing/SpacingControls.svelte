<script lang="ts">
	import {
		FIELDS,
		resolveSpacing,
		type SpacingTheme,
		type SpacingField,
		type Viewport
	} from './index';
	let {
		theme,
		disabled = false,
		change
	}: {
		theme: SpacingTheme;
		disabled?: boolean;
		change: (viewport: Viewport, key: SpacingField, value: number | undefined) => void;
	} = $props();
	let viewport = $state<Viewport>('desktop');
	const values = $derived(resolveSpacing(theme, viewport));
	function update(key: SpacingField, value: number) {
		if (Number.isFinite(value)) change(viewport, key, Math.min(160, Math.max(0, value)));
	}
</script>

<div class="spacing-controls">
	<label
		>Screen size
		<select bind:value={viewport}
			><option value="desktop">Desktop (900px and above)</option><option value="mobile"
				>Mobile (below 900px)</option
			></select
		>
	</label>
	<p>
		Values are in pixels. Outer margins frame the home gallery. Reset restores the original 2px
		spacing.
	</p>
	{#each FIELDS as field (field.id)}
		<div class="field">
			<label
				>{field.label}<input
					type="range"
					min="0"
					max="160"
					step="1"
					{disabled}
					value={values[field.id]}
					oninput={(event) => update(field.id, event.currentTarget.valueAsNumber)}
				/></label
			>
			<input
				aria-label={`${field.label} in pixels`}
				type="number"
				min="0"
				max="160"
				step="1"
				{disabled}
				value={values[field.id]}
				onchange={(event) => update(field.id, event.currentTarget.valueAsNumber)}
			/>
			<button
				{disabled}
				onclick={() => change(viewport, field.id, undefined)}
				aria-label={`Reset ${field.label.toLowerCase()}`}>Reset</button
			>
		</div>
	{/each}
</div>

<style>
	.spacing-controls {
		display: grid;
		gap: 16px;
		color: #334155;
		font:
			13px/1.5 Arial,
			sans-serif;
	}
	label {
		display: grid;
		gap: 8px;
	}
	select,
	input[type='number'] {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 8px;
		background: white;
		width: 100%;
	}
	.field {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 70px auto;
		gap: 10px;
		align-items: end;
	}
	input[type='range'] {
		width: 100%;
		accent-color: #0f172a;
	}
	p {
		font-size: 12px;
		color: #64748b;
	}
	button {
		padding: 8px;
		cursor: pointer;
	}
	:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
