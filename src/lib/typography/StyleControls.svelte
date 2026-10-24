<script lang="ts">
	import { FONTS, type TextStyle } from './index';
	let {
		resolved,
		disabled = false,
		change,
		reset
	}: {
		resolved: TextStyle;
		disabled?: boolean;
		change: <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => void;
		reset: (key?: keyof TextStyle) => void;
	} = $props();
	const numericFields = [
		{ key: 'size', label: 'Desktop size (px)', min: 6, max: 160, step: 1 },
		{ key: 'mobileSize', label: 'Mobile size (px)', min: 6, max: 160, step: 1 },
		{ key: 'lineHeight', label: 'Line height', min: 0.8, max: 3, step: 0.05 },
		{ key: 'tracking', label: 'Letter spacing (em)', min: -0.1, max: 1, step: 0.01 }
	] as const;
</script>

<fieldset {disabled} class="grid gap-4 sm:grid-cols-2">
	<legend class="sr-only">Style controls</legend>
	<label class="field"
		>Font family <select
			value={resolved.font}
			onchange={(event) => change('font', event.currentTarget.value as TextStyle['font'])}
			>{#each FONTS as font (font)}<option>{font}</option>{/each}</select
		><button type="button" onclick={() => reset('font')}>Reset font</button></label
	>
	<label class="field"
		>Weight <select
			value={resolved.weight}
			onchange={(event) => change('weight', Number(event.currentTarget.value))}
			>{#each [300, 400, 500, 600, 700] as weight (weight)}<option value={weight}>{weight}</option
				>{/each}</select
		><button type="button" onclick={() => reset('weight')}>Reset weight</button></label
	>
	{#each numericFields as field (field.key)}<label class="field"
			>{field.label}<input
				type="number"
				min={field.min}
				max={field.max}
				step={field.step}
				value={resolved[field.key]}
				oninput={(event) => {
					const value = event.currentTarget.valueAsNumber;
					if (Number.isFinite(value)) change(field.key, value);
				}}
			/><button type="button" onclick={() => reset(field.key)}
				>Reset {field.label.toLowerCase()}</button
			></label
		>{/each}
	<label class="field"
		>Style <select
			value={resolved.italic ? 'italic' : 'normal'}
			onchange={(event) => change('italic', event.currentTarget.value === 'italic')}
			><option value="normal">Normal</option><option value="italic">Italic</option></select
		><button type="button" onclick={() => reset('italic')}>Reset style</button></label
	>
	<label class="field"
		>Capitalization <select
			value={resolved.transform}
			onchange={(event) => change('transform', event.currentTarget.value as TextStyle['transform'])}
			>{#each ['none', 'uppercase', 'lowercase', 'capitalize'] as value (value)}<option
					>{value}</option
				>{/each}</select
		><button type="button" onclick={() => reset('transform')}>Reset capitalization</button></label
	>
	<label class="field"
		>Decoration <select
			value={resolved.decoration}
			onchange={(event) =>
				change('decoration', event.currentTarget.value as TextStyle['decoration'])}
			>{#each ['none', 'underline', 'line-through'] as value (value)}<option>{value}</option
				>{/each}</select
		><button type="button" onclick={() => reset('decoration')}>Reset decoration</button></label
	>
	<button class="secondary self-center" onclick={() => reset()}>Reset this section</button>
</fieldset>

<style>
	.field {
		display: grid;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #475569;
	}
	.field input,
	.field select {
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		padding: 0.5rem;
		background: white;
		font-size: 0.875rem;
	}
	.field button {
		text-align: left;
		font-size: 0.7rem;
		text-decoration: underline;
		color: #64748b;
	}

	.secondary {
		border: 1px solid #cbd5e1;
		padding: 0.6rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
	}
</style>
