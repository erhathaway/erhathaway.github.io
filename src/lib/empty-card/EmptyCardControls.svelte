<script lang="ts">
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import {
		EFFECTS,
		FILL_TYPES,
		type EmptyCardEffect,
		type EmptyCardEffects,
		type EmptyCardFill,
		type EmptyCardFillType,
		type EmptyCardTheme
	} from './index';
	const DEFAULT_ANGLE = 135;
	const DEFAULT_POSITION = 50;
	let {
		theme,
		disabled = false,
		getToken = async () => null,
		change
	}: {
		theme: EmptyCardTheme;
		disabled?: boolean;
		// Without a token, the server verifies the session cookie.
		getToken?: () => Promise<string | null>;
		change: (patch: { fill?: EmptyCardFill; effects?: EmptyCardEffects | undefined }) => void;
	} = $props();
	const fill = $derived(theme.fill);
	// Keeps an uploaded image while switching between fill types before saving.
	let lastImage = $state<Extract<EmptyCardFill, { type: 'image' }> | null>(null);
	let uploading = $state(false);
	let uploadError = $state('');
	const locked = $derived(disabled || uploading);

	function setType(type: EmptyCardFillType) {
		if (type === fill.type) return;
		if (fill.type === 'image') lastImage = $state.snapshot(fill);
		if (type === 'blank') change({ fill: { type: 'blank' } });
		else if (type === 'color') change({ fill: { type: 'color', color: '#f5f1eb' } });
		else if (type === 'gradient')
			change({ fill: { type: 'gradient', from: '#f5f1eb', to: '#b87333', angle: DEFAULT_ANGLE } });
		else
			change({
				fill: lastImage ?? {
					type: 'image',
					imageUrl: '',
					positionX: DEFAULT_POSITION,
					positionY: DEFAULT_POSITION
				}
			});
	}
	function patchFill(patch: Record<string, number | string>) {
		change({ fill: { ...fill, ...patch } as EmptyCardFill });
	}
	function setEffect(effect: EmptyCardEffect, value: number) {
		const effects = { ...theme.effects, [effect]: value };
		if (value === 0) delete effects[effect];
		change({ effects: Object.keys(effects).length ? effects : undefined });
	}
	async function upload(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;
		uploadError = '';
		try {
			const form = new FormData();
			form.append('file', file);
			const response = await fetchNamecardAdmin(getToken, '/api/admin/uploads/artifacts', {
				method: 'POST',
				body: form
			});
			if (!response.ok) throw new Error('Upload failed.');
			const { url, formats } = (await response.json()) as { url?: string; formats?: string[] };
			if (!url) throw new Error('No URL returned from upload.');
			change({
				fill: {
					type: 'image',
					imageUrl: url,
					...(formats?.length ? { imageFormats: formats } : {}),
					positionX: DEFAULT_POSITION,
					positionY: DEFAULT_POSITION
				}
			});
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}
</script>

{#snippet slider(
	label: string,
	unit: string,
	max: number,
	value: number,
	resetTo: number,
	update: (value: number) => void
)}
	{@const set = (next: number) => {
		if (Number.isFinite(next)) update(Math.min(max, Math.max(0, next)));
	}}
	<div class="slider">
		<label
			>{label}<input
				type="range"
				min="0"
				{max}
				disabled={locked}
				{value}
				oninput={(event) => set(event.currentTarget.valueAsNumber)}
			/></label
		>
		<input
			aria-label={`${label} in ${unit === '%' ? 'percent' : unit === 'px' ? 'pixels' : 'degrees'}`}
			type="number"
			min="0"
			{max}
			disabled={locked}
			{value}
			onchange={(event) => set(event.currentTarget.valueAsNumber)}
		/>
		<button
			type="button"
			disabled={locked}
			onclick={() => update(resetTo)}
			aria-label={`Reset ${label.toLowerCase()}`}>Reset</button
		>
	</div>
{/snippet}

<div class="controls">
	<div class="types" role="group" aria-label="Fill type">
		{#each FILL_TYPES as type (type.id)}
			<button
				type="button"
				class={['type', { selected: fill.type === type.id }]}
				aria-pressed={fill.type === type.id}
				disabled={locked}
				onclick={() => setType(type.id)}>{type.label}</button
			>
		{/each}
	</div>

	{#if fill.type === 'blank'}
		<p class="hint">Leaves the space empty, showing the page background.</p>
	{:else if fill.type === 'color'}
		<label class="field"
			>Color <input
				type="color"
				disabled={locked}
				value={fill.color}
				oninput={(event) => patchFill({ color: event.currentTarget.value })}
			/></label
		>
	{:else if fill.type === 'gradient'}
		<label class="field"
			>Start color <input
				type="color"
				disabled={locked}
				value={fill.from}
				oninput={(event) => patchFill({ from: event.currentTarget.value })}
			/></label
		>
		<label class="field"
			>End color <input
				type="color"
				disabled={locked}
				value={fill.to}
				oninput={(event) => patchFill({ to: event.currentTarget.value })}
			/></label
		>
		{@render slider('Angle', '°', 360, fill.angle, DEFAULT_ANGLE, (angle) => patchFill({ angle }))}
	{:else}
		<label class="field"
			>{uploading ? 'Uploading…' : fill.imageUrl ? 'Replace image' : 'Upload image'}
			<input type="file" accept="image/*" disabled={locked} onchange={upload} /></label
		>
		{#if uploadError}<p role="alert" class="error">{uploadError}</p>{/if}
		{#if fill.imageUrl}
			{@render slider('Focus left to right', '%', 100, fill.positionX, DEFAULT_POSITION, (positionX) =>
				patchFill({ positionX })
			)}
			{@render slider('Focus top to bottom', '%', 100, fill.positionY, DEFAULT_POSITION, (positionY) =>
				patchFill({ positionY })
			)}
		{/if}
	{/if}

	{#if fill.type !== 'blank' && (fill.type !== 'image' || fill.imageUrl)}
		<div class="soften">
			<h2>Soften</h2>
			<p class="hint">Make the card less intense. Combine these however you like.</p>
			{#each EFFECTS as effect (effect.id)}
				{@render slider(effect.label, effect.unit, effect.max, theme.effects?.[effect.id] ?? 0, 0, (value) =>
					setEffect(effect.id, value)
				)}
			{/each}
		</div>
	{/if}
</div>

<style>
	.controls,
	.soften {
		display: grid;
		gap: 16px;
		color: #475569;
		font-size: 12px;
	}
	.soften {
		border-top: 1px solid #e2e8f0;
		padding-top: 16px;
	}
	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
		color: #0f172a;
	}
	.types {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.type {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 8px 12px;
		background: white;
		color: #334155;
		font-size: 13px;
	}
	.type.selected {
		border-color: #0f172a;
		background: #0f172a;
		color: white;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-weight: 500;
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
	.error {
		margin: 0;
		color: #b91c1c;
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
