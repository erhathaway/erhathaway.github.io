<script lang="ts">
	import { validateImageV1 } from './validator';
	import type { ImageV1Data } from './validator';

	type Props = {
		value?: ImageV1Data;
		onChange?: (value: ImageV1Data) => void;
	};

	let { value, onChange }: Props = $props();

	const current = $derived(value ?? { imageUrl: '', description: '' });
	const validation = $derived.by(() => validateImageV1(current));
	const errors = $derived(validation.ok ? [] : validation.errors);

	const updateImageUrl = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement | null;
		const next = {
			imageUrl: (target?.value ?? '').trim(),
			description: current.description?.trim() || undefined
		};
		onChange?.(next);
	};

	const updateDescription = (event: Event) => {
		const target = event.currentTarget as HTMLTextAreaElement | null;
		const next = {
			imageUrl: current.imageUrl?.trim() || '',
			description: (target?.value ?? '').trim() || undefined
		};
		onChange?.(next);
	};
</script>

<div class="grid gap-4">
	<label class="text-sm">
		<span class="text-ash">Image URL</span>
		<input
			type="url"
			value={current.imageUrl ?? ''}
			oninput={updateImageUrl}
			placeholder="https://..."
			class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
		/>
	</label>
	<label class="text-sm">
		<span class="text-ash">Description (optional)</span>
		<textarea
			rows="3"
			value={current.description ?? ''}
			oninput={updateDescription}
			class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
		></textarea>
	</label>

	{#if errors.length > 0}
		<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
			{errors.join('; ')}
		</div>
	{/if}
</div>
