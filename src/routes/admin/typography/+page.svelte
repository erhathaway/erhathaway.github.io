<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { invalidate, beforeNavigate, goto } from '$app/navigation';
	import { useClerkContext } from 'svelte-clerk';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import {
		ROLES,
		DEFAULT_THEME,
		resolveRole,
		textStyleCss,
		type TextStyle,
		type TypographyTheme
	} from '$lib/typography';
	import { resolve } from '$app/paths';
	import StyleControls from '$lib/typography/StyleControls.svelte';
	import {
		getTypographyPreview,
		readReviewDraft,
		clearReviewDraft
	} from '$lib/typography/preview';
	const preview = getTypographyPreview();
	let launchingPreview = false;
	let { data } = $props();
	const ctx = useClerkContext();
	let themes = $state<TypographyTheme[]>(untrack(() => data.typography.themes));
	let activeId = $state(untrack(() => data.typography.activeId));
	let draft = $state<TypographyTheme>(
		untrack(() =>
			structuredClone(
				$state.snapshot(preview.draft) ??
					data.typography.themes.find((theme) => theme.id === data.typography.activeId) ??
					DEFAULT_THEME
			)
		)
	);
	let baseline = $state(untrack(() => (preview.draft ? preview.baseline : JSON.stringify(draft))));
	let roleId = $state('project-title');
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	const dirty = $derived(JSON.stringify(draft) !== baseline);
	const locked = $derived(draft.id === 'default');
	const role = $derived(ROLES.find((item) => item.id === roleId)!);
	const resolved = $derived(resolveRole(draft, roleId));
	const groups = [...new Set(ROLES.map((role) => role.group))];

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
		if (!response.ok) throw new Error(result.message ?? 'Could not update typography.');
		return result;
	}
	function clearHandoff() {
		preview.review = null;
		clearReviewDraft();
	}
	function select(theme: TypographyTheme) {
		if (dirty && !window.confirm('Discard unsaved typography changes?')) return;
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
	function change<K extends keyof TextStyle>(key: K, value: TextStyle[K]) {
		draft.roles[roleId] = { ...draft.roles[roleId], [key]: value };
	}
	function reset(key?: keyof TextStyle) {
		if (!key) {
			delete draft.roles[roleId];
			return;
		}
		if (draft.roles[roleId]) delete draft.roles[roleId][key];
	}
	async function save() {
		if (busy || locked) return;
		busy = true;
		failed = false;
		message = '';
		try {
			const saved: TypographyTheme = await request(
				draft.id ? `/api/admin/typography/${draft.id}` : '/api/admin/typography',
				draft.id ? 'PATCH' : 'POST',
				draft
			);
			themes = [...themes.filter((theme) => theme.id !== saved.id), saved];
			draft = saved;
			baseline = JSON.stringify(saved);
			clearHandoff();
			await invalidate('app:typography');
			message =
				activeId === saved.id
					? 'Saved. The active site typography is updated.'
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
			const result = await request(`/api/admin/typography/${draft.id}/activate`, 'POST');
			activeId = result.activeId;
			await invalidate('app:typography');
			message = `“${draft.name}” is now the active typography theme.`;
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
			if (ROLES.some((role) => role.id === restored.roleId)) roleId = restored.roleId!;
			message = 'Preview changes restored. Save changes to keep this draft.';
		}
		preview.draft = null;
		preview.hoverItemId = null;
	});

	async function previewSite() {
		preview.draft = structuredClone($state.snapshot(draft));
		if (preview.draft.id === 'default') {
			preview.draft.id = '';
			preview.draft.name = 'Original typography copy';
		}
		preview.baseline = baseline;
		clearHandoff();
		preview.enabled = true;
		preview.keepHoverOpen = true;
		launchingPreview = true;
		try {
			await goto(resolve('/'));
		} finally {
			launchingPreview = false;
		}
	}
	beforeNavigate(({ cancel }) => {
		if (launchingPreview) return;
		if (dirty && !window.confirm('Discard unsaved typography changes?')) {
			cancel();
			return;
		}
		clearHandoff();
	});
</script>

<header class="mb-6">
	<h1 class="text-xl font-semibold text-slate-900">Typography themes</h1>
	<p class="mt-2 text-sm text-slate-500">
		One active theme for the public site and newly generated images.
	</p>
</header>
<div class="mb-6 flex flex-wrap gap-2" aria-label="Saved typography themes">
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
<div class="grid gap-6 lg:grid-cols-[230px_1fr]">
	<nav
		aria-label="Typography sections"
		class="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 p-3"
	>
		{#each groups as group (group)}<h2
				class="mt-3 mb-2 text-xs font-semibold text-slate-400 uppercase"
			>
				{group}
			</h2>
			{#each ROLES.filter((item) => item.group === group) as item (item.id)}<button
					class="block w-full rounded-lg px-3 py-2 text-left text-xs {item.id === roleId
						? 'bg-slate-100 font-semibold text-slate-900'
						: 'text-slate-600'}"
					onclick={() => (roleId = item.id)}
					>{item.label}{draft.roles[item.id] && Object.keys(draft.roles[item.id]).length
						? ' •'
						: ''}</button
				>{/each}{/each}
	</nav>
	<section class="min-w-0 rounded-xl border border-slate-200 p-5">
		<h2 class="text-base font-semibold text-slate-900">{role.label}</h2>
		<p class="mt-1 mb-5 text-xs text-slate-500">
			{role.parent
				? `Inherits from ${ROLES.find((item) => item.id === role.parent)?.label}. Reset a field to restore its inherited/default value.`
				: 'Shared foundation for all typography.'}
		</p>
		<StyleControls {resolved} disabled={locked || busy} {change} {reset} />
		<div class="mt-6 space-y-5 border-t border-slate-200 pt-5">
			<div>
				<p class="mb-2 text-xs text-slate-400">Desktop preview</p>
				<p class="break-words text-slate-800" style={textStyleCss(resolved)}>
					Things I Make — the details matter.
				</p>
			</div>
			<div>
				<p class="mb-2 text-xs text-slate-400">Mobile preview</p>
				<p class="max-w-sm break-words text-slate-800" style={textStyleCss(resolved, true)}>
					Things I Make — the details matter.
				</p>
			</div>
		</div>
	</section>
</div>
<p class="mt-5 text-xs text-slate-500">
	Name card size and spacing controls remain image-specific overrides. Generated images keep their
	original typography until regenerated.
</p>

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
