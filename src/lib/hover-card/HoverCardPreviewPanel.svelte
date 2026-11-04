<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { getHoverCardPreview, storeReviewDraft, clearReviewDraft } from './preview';
	import HoverCardControls from './HoverCardControls.svelte';
	const preview = getHoverCardPreview();
	let minimized = $state(false);
	let side = $state<'left' | 'right'>('right');
	const dirty = $derived(!!preview.draft && JSON.stringify(preview.draft) !== preview.baseline);
	const homePage = $derived(page.url.pathname === resolve('/'));

	function showProject(id: number) {
		preview.hoverItemId = id;
		document
			.querySelector(`[data-gallery-project-id="${id}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
	async function reviewInAdmin() {
		if (!preview.draft) return;
		preview.review = {
			draft: structuredClone($state.snapshot(preview.draft)),
			baseline: preview.baseline
		};
		storeReviewDraft(preview.review);
		await goto(resolve('/admin/hover-card'));
	}
	function exit() {
		if (dirty && !window.confirm('Discard this unsaved hover card draft and exit preview?')) return;
		preview.draft = null;
		preview.review = null;
		preview.hoverItemId = null;
		clearReviewDraft();
	}
</script>

<svelte:window
	onbeforeunload={(event) => {
		if (dirty) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>
<aside class="preview-panel {side}" aria-label="Live hover card preview">
	<header>
		<div>
			<strong>Hover card preview</strong>
			<p>Private draft · {preview.draft?.name}</p>
		</div>
		<button onclick={() => (minimized = !minimized)}>{minimized ? 'Expand' : 'Minimize'}</button>
	</header>
	{#if !minimized}
		<div class="toolbar">
			<label><input type="checkbox" bind:checked={preview.enabled} /> Apply draft</label><button
				onclick={() => (side = side === 'right' ? 'left' : 'right')}
				>Move {side === 'right' ? 'left' : 'right'}</button
			>
		</div>
		<div class="body">
			<p class="hint">Changes appear immediately and are not saved.</p>
			{#if !homePage}<p class="hint">
					Hover cards appear on the home page. <a href={resolve('/')}>Return home</a>
				</p>{/if}
			<label class="row"
				><input
					type="checkbox"
					checked={preview.keepHoverOpen !== false}
					onchange={(event) => (preview.keepHoverOpen = event.currentTarget.checked)}
				/> Keep hover card open</label
			>
			{#if preview.keepHoverOpen !== false}
				<label class="row"
					>Project
					<select
						value={portfolio.filteredItems.find((item) => item.id === preview.hoverItemId)?.id ??
							portfolio.filteredItems[0]?.id ??
							''}
						disabled={!portfolio.filteredItems.length}
						onchange={(event) => showProject(Number(event.currentTarget.value))}
					>
						{#each portfolio.filteredItems as item (item.id)}<option value={item.id}
								>{item.name}</option
							>{/each}
					</select></label
				>
			{/if}
			{#if preview.draft}<HoverCardControls
					theme={preview.draft}
					change={(patch) => {
						if (preview.draft) preview.draft = { ...preview.draft, ...patch };
					}}
				/>{/if}
		</div>
		<footer>
			<button class="primary" onclick={reviewInAdmin}>Review & save in admin</button><button
				onclick={exit}>Discard & exit</button
			>
		</footer>
	{/if}
</aside>

<style>
	.preview-panel {
		position: fixed;
		top: 16px;
		z-index: 10000;
		width: min(390px, calc(100vw - 32px));
		max-height: calc(100dvh - 32px);
		display: flex;
		flex-direction: column;
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
		border-radius: 16px;
		box-shadow: 0 16px 60px #0003;
		font:
			13px/1.5 Arial,
			sans-serif;
		overflow: hidden;
	}
	.right {
		right: 16px;
	}
	.left {
		left: 16px;
	}
	header,
	footer,
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px;
	}
	header {
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}
	header p,
	.hint {
		font-size: 11px;
		color: #64748b;
		margin: 8px 0;
	}
	.body {
		padding: 0 16px 16px;
		overflow: auto;
		min-height: 0;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 12px 0;
	}
	.row select {
		flex: 1;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 6px 8px;
		background: white;
	}
	footer {
		border-top: 1px solid #e2e8f0;
	}
	button {
		cursor: pointer;
		font-size: 11px;
		padding: 7px;
		border-radius: 6px;
	}
	button:hover {
		background: #e2e8f0;
	}
	button:focus-visible {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}
	.primary {
		background: #0f172a;
		color: white;
	}
	a {
		text-decoration: underline;
	}
</style>
