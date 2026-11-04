<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getEmptyCardPreview, storeReviewDraft, clearReviewDraft } from './preview';
	import EmptyCardControls from './EmptyCardControls.svelte';
	const preview = getEmptyCardPreview();
	let minimized = $state(false);
	// The empty card always ends a row, so the panel starts clear of it.
	let side = $state<'left' | 'right'>('left');
	let highlight = $state(false);
	let cardMissing = $state(false);
	const dirty = $derived(!!preview.draft && JSON.stringify(preview.draft) !== preview.baseline);
	const homePage = $derived(page.url.pathname === resolve('/'));

	function showCard() {
		const card = document.querySelector('[data-empty-card]');
		cardMissing = !card;
		card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
	onMount(() => {
		void tick().then(showCard);
	});
	async function reviewInAdmin() {
		if (!preview.draft) return;
		preview.review = {
			draft: structuredClone($state.snapshot(preview.draft)),
			baseline: preview.baseline
		};
		storeReviewDraft(preview.review);
		await goto(resolve('/admin/empty-card'));
	}
	function exit() {
		if (dirty && !window.confirm('Discard this unsaved empty card draft and exit preview?')) return;
		preview.draft = null;
		preview.review = null;
		clearReviewDraft();
	}
</script>

<svelte:head
	><svelte:element this={'style'}
		>{highlight && !minimized
			? '[data-empty-card]{outline:2px solid #6366f1;outline-offset:-2px}'
			: ''}</svelte:element
	></svelte:head
>
<svelte:window
	onbeforeunload={(event) => {
		if (dirty) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>
<aside class="preview-panel {side}" aria-label="Live empty card preview">
	<header>
		<div>
			<strong>Empty card preview</strong>
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
					The empty card appears on the home page. <a href={resolve('/')}>Return home</a>
				</p>{:else if cardMissing}<p class="hint">
					No leftover space right now. It depends on your window width and category filter.
				</p>{/if}
			<div class="card-tools">
				<button onclick={showCard}>Scroll to card</button>
				<label><input type="checkbox" bind:checked={highlight} /> Highlight card</label>
			</div>
			{#if preview.draft}<EmptyCardControls
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
	.toolbar,
	.card-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px;
	}
	.card-tools {
		padding: 0;
		margin: 16px 0;
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
