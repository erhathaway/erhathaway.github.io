<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { beforeNavigate, goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useClerkContext } from 'svelte-clerk';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import { DEFAULT_THEME, type EmptyCardTheme } from '$lib/empty-card';
	import EmptyCardControls from '$lib/empty-card/EmptyCardControls.svelte';
	import EmptyCardFillView from '$lib/empty-card/EmptyCardFill.svelte';
	import { clearReviewDraft, getEmptyCardPreview, readReviewDraft } from '$lib/empty-card/preview';

	let { data } = $props();
	const ctx = useClerkContext();
	const preview = getEmptyCardPreview();
	const getToken = async () => (await ctx.clerk?.session?.getToken()) ?? null;
	let launchingPreview = false;

	let themes = $state<EmptyCardTheme[]>(untrack(() => data.emptyCard.themes));
	let activeId = $state(untrack(() => data.emptyCard.activeId));
	let draft = $state<EmptyCardTheme>(
		untrack(() =>
			structuredClone(
				$state.snapshot(preview.draft) ??
					data.emptyCard.themes.find((theme) => theme.id === data.emptyCard.activeId) ??
					DEFAULT_THEME
			)
		)
	);
	let baseline = $state(untrack(() => (preview.draft ? preview.baseline : JSON.stringify(draft))));
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	const dirty = $derived(JSON.stringify(draft) !== baseline);
	const locked = $derived(draft.id === DEFAULT_THEME.id);
	const missingImage = $derived(draft.fill.type === 'image' && !draft.fill.imageUrl);
	const previewSizes = '320px';

	async function request(path: string, method = 'GET', body?: unknown) {
		const response = await fetchNamecardAdmin(getToken, path, {
			method,
			headers: { 'Content-Type': 'application/json' },
			...(body ? { body: JSON.stringify(body) } : {})
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.message ?? 'Could not update the empty card.');
		return result;
	}
	function clearHandoff() {
		preview.review = null;
		clearReviewDraft();
	}
	function select(theme: EmptyCardTheme) {
		if (dirty && !window.confirm('Discard unsaved empty card changes?')) return;
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
			const saved: EmptyCardTheme = await request(
				draft.id ? `/api/admin/empty-card/${draft.id}` : '/api/admin/empty-card',
				draft.id ? 'PATCH' : 'POST',
				draft
			);
			themes = [...themes.filter((theme) => theme.id !== saved.id), saved];
			draft = saved;
			baseline = JSON.stringify(saved);
			clearHandoff();
			await invalidate('app:empty-card');
			message =
				activeId === saved.id
					? 'Saved. The active empty card is updated.'
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
			const result = await request(`/api/admin/empty-card/${draft.id}/activate`, 'POST');
			activeId = result.activeId;
			await invalidate('app:empty-card');
			message = `“${draft.name}” is now the active empty card theme.`;
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
			if (draft.id === DEFAULT_THEME.id) {
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
		if (preview.draft.id === DEFAULT_THEME.id) {
			preview.draft.id = '';
			preview.draft.name = `${DEFAULT_THEME.name} copy`;
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
		if (dirty && !window.confirm('Discard unsaved empty card changes?')) {
			cancel();
			return;
		}
		clearHandoff();
	});
</script>

<header class="mb-6">
	<h1 class="text-xl font-semibold text-slate-900">Empty card themes</h1>
	<p class="mt-2 text-sm text-slate-500">
		What fills the leftover space on the home page when projects don't complete the last row of the
		grid.
	</p>
</header>
<div class="mb-6 flex flex-wrap gap-2" aria-label="Saved empty card themes">
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
	<button
		class="primary"
		disabled={locked || busy || !dirty || !draft.name.trim() || missingImage}
		onclick={save}>Save changes</button
	>
	<button
		class="secondary"
		disabled={busy || dirty || !draft.id || activeId === draft.id}
		onclick={activate}>{activeId === draft.id ? 'Active theme' : 'Activate theme'}</button
	>
</div>
{#if locked}<p class="mb-5 text-xs text-slate-500">
		The default theme is locked. Create a copy to customize it.
	</p>{/if}
{#if message}<p
		role={failed ? 'alert' : 'status'}
		class="mb-5 rounded-lg p-3 text-sm {failed
			? 'bg-red-50 text-red-700'
			: 'bg-emerald-50 text-emerald-700'}"
	>
		{message}
	</p>{/if}

<div class="grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
	<section aria-label="Fill settings">
		<EmptyCardControls
			theme={draft}
			disabled={locked || busy}
			{getToken}
			change={(patch) => {
				draft = { ...draft, ...patch };
			}}
		/>
	</section>

	<section aria-label="Preview" class="space-y-3">
		<p class="text-xs text-slate-500">
			The space is one or two cards wide on desktop, depending on how many projects are showing, and
			one card wide on mobile.
		</p>
		<div class="flex flex-wrap items-start gap-4">
			<figure>
				<div class="preview relative aspect-square w-40 overflow-hidden">
					<EmptyCardFillView fill={draft.fill} effects={draft.effects} sizes={previewSizes} />
				</div>
				<figcaption>One card wide</figcaption>
			</figure>
			<figure>
				<div class="preview relative aspect-[2/1] w-80 max-w-full overflow-hidden">
					<EmptyCardFillView fill={draft.fill} effects={draft.effects} sizes={previewSizes} />
				</div>
				<figcaption>Two cards wide</figcaption>
			</figure>
		</div>
	</section>
</div>

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
	.preview {
		outline: 1px dashed #cbd5e1;
	}
	figcaption {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #64748b;
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
