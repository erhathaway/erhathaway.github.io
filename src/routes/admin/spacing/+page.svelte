<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { invalidate, beforeNavigate, goto } from '$app/navigation';
	import { useClerkContext } from 'svelte-clerk';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import { DEFAULT_THEME, type SpacingTheme } from '$lib/spacing';
	import { resolve } from '$app/paths';
	import SpacingControls from '$lib/spacing/SpacingControls.svelte';
	import { getSpacingPreview, readReviewDraft, clearReviewDraft } from '$lib/spacing/preview';
	const preview = getSpacingPreview();
	let launchingPreview = false;
	let { data } = $props();
	const ctx = useClerkContext();
	let themes = $state<SpacingTheme[]>(untrack(() => data.spacing.themes));
	let activeId = $state(untrack(() => data.spacing.activeId));
	let draft = $state<SpacingTheme>(
		untrack(() =>
			structuredClone(
				$state.snapshot(preview.draft) ??
					data.spacing.themes.find((theme) => theme.id === data.spacing.activeId) ??
					DEFAULT_THEME
			)
		)
	);
	let baseline = $state(untrack(() => (preview.draft ? preview.baseline : JSON.stringify(draft))));
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	const dirty = $derived(JSON.stringify(draft) !== baseline);
	const locked = $derived(draft.id === 'default');

	async function request(path: string, method = 'GET', body?: unknown) {
		const response = await fetchNamecardAdmin(
			async () => (await ctx.clerk?.session?.getToken()) ?? null,
			path,
			{
				method,
				headers: { 'Content-Type': 'application/json' },
				...(body ? { body: JSON.stringify(body) } : {})
			}
		);
		const result = await response.json();
		if (!response.ok) throw new Error(result.message ?? 'Could not update spacing.');
		return result;
	}
	function clearHandoff() {
		preview.review = null;
		clearReviewDraft();
	}
	function select(theme: SpacingTheme) {
		if (dirty && !window.confirm('Discard unsaved spacing changes?')) return;
		clearHandoff();
		draft = structuredClone($state.snapshot(theme));
		baseline = JSON.stringify(draft);
		message = '';
	}
	function copy() {
		draft = {
			...structuredClone($state.snapshot(draft)),
			id: '',
			name: `${draft.name} copy`.slice(0, 100)
		};
		message = '';
	}
	async function save() {
		if (busy || locked) return;
		busy = true;
		failed = false;
		message = '';
		try {
			const saved: SpacingTheme = await request(
				draft.id ? `/api/admin/spacing/${draft.id}` : '/api/admin/spacing',
				draft.id ? 'PATCH' : 'POST',
				draft
			);
			themes = [...themes.filter((theme) => theme.id !== saved.id), saved];
			draft = saved;
			baseline = JSON.stringify(saved);
			clearHandoff();
			await invalidate('app:spacing');
			message =
				activeId === saved.id
					? 'Saved. The active site spacing is updated.'
					: 'Saved. Activate this theme when you are ready.';
		} catch (err) {
			failed = true;
			message = err instanceof Error ? err.message : 'Could not save theme.';
		} finally {
			busy = false;
		}
	}
	async function activate() {
		if (busy || dirty || !draft.id) return;
		busy = true;
		failed = false;
		try {
			const result = await request(`/api/admin/spacing/${draft.id}/activate`, 'POST');
			activeId = result.activeId;
			await invalidate('app:spacing');
			message = `“${draft.name}” is now the active spacing theme.`;
		} catch (err) {
			failed = true;
			message = err instanceof Error ? err.message : 'Could not activate theme.';
		} finally {
			busy = false;
		}
	}
	onMount(() => {
		const restored = preview.review ?? readReviewDraft();
		if (restored) {
			draft = structuredClone($state.snapshot(restored.draft));
			if (draft.id === 'default') {
				draft.id = '';
				draft.name = `${draft.name} copy`;
			}
			baseline = restored.baseline;
			message = 'Preview changes restored. Save changes to keep this draft.';
		}
		preview.draft = null;
	});

	async function previewSite() {
		preview.draft = structuredClone($state.snapshot(draft));
		if (preview.draft.id === 'default') {
			preview.draft.id = '';
			preview.draft.name = 'Original spacing copy';
		}
		preview.baseline = baseline;
		clearHandoff();
		preview.enabled = true;
		launchingPreview = true;
		try {
			await goto(resolve('/'));
		} finally {
			launchingPreview = false;
		}
	}
	beforeNavigate(({ cancel }) => {
		if (launchingPreview) return;
		if (dirty && !window.confirm('Discard unsaved spacing changes?')) {
			cancel();
			return;
		}
		clearHandoff();
	});
</script>

<header class="mb-6">
	<h1 class="text-xl font-semibold text-slate-900">Spacing themes</h1>
	<p class="mt-2 text-sm text-slate-500">
		Card gaps and outer margins for the home page, with separate desktop and mobile settings.
	</p>
</header>
<div class="mb-6 flex flex-wrap gap-2" aria-label="Saved spacing themes">
	{#each themes as theme (theme.id)}<button
			type="button"
			disabled={busy}
			onclick={() => select(theme)}
			class="rounded-xl border px-4 py-3 text-left text-sm {theme.id === draft.id
				? 'border-slate-900 bg-slate-900 text-white'
				: 'border-slate-200 bg-white text-slate-700'}"
			>{theme.name}{#if theme.id === activeId}<span class="ml-2 text-xs">● Active</span
				>{/if}</button
		>{/each}
</div>
<div class="mb-6 flex flex-wrap items-center gap-3">
	<label class="text-xs font-medium text-slate-600"
		>Theme name <input
			aria-label="Theme name"
			disabled={locked || busy}
			bind:value={draft.name}
			maxlength="100"
			class="ml-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
		/></label
	>
	<button class="secondary" disabled={busy} onclick={previewSite}>Preview on site</button>
	<button class="secondary" disabled={busy} onclick={copy}>Create copy</button>
	<button class="primary" disabled={locked || busy || !dirty || !draft.name.trim()} onclick={save}
		>Save changes</button
	>
	<button
		class="secondary"
		disabled={busy || dirty || !draft.id || activeId === draft.id}
		onclick={activate}>{activeId === draft.id ? 'Active theme' : 'Activate theme'}</button
	>
</div>
{#if locked}<p class="mb-5 text-xs text-slate-500">
		The original theme is locked. Create a copy to customize it.
	</p>{/if}
{#if message}<p
		role={failed ? 'alert' : 'status'}
		class="mb-5 rounded-lg p-3 text-sm {failed
			? 'bg-red-50 text-red-700'
			: 'bg-emerald-50 text-emerald-700'}"
	>
		{message}
	</p>{/if}
<SpacingControls
	theme={draft}
	disabled={locked || busy}
	change={(viewport, key, value) => {
		if (value === undefined) delete draft.values[viewport][key];
		else draft.values[viewport][key] = value;
	}}
/>
<svelte:window
	onbeforeunload={(event) => {
		if (dirty) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>

<style>
	.primary,
	.secondary {
		border-radius: 0.5rem;
		padding: 0.625rem 0.875rem;
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.primary {
		background: #0f172a;
		color: white;
	}
	.secondary {
		border: 1px solid #cbd5e1;
		background: white;
		color: #334155;
	}
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	button:focus-visible {
		outline: 2px solid #64748b;
		outline-offset: 3px;
	}
</style>
