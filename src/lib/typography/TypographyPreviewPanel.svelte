<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ROLES, resolveRole, type TextStyle } from './index';
	import { getTypographyPreview, storeReviewDraft, clearReviewDraft } from './preview';
	import StyleControls from './StyleControls.svelte';
	const preview = getTypographyPreview();
	let available = $state<string[]>([]);
	let selected = $state('');
	let minimized = $state(false);
	let side = $state<'left' | 'right'>('right');
	let highlight = $state(true);
	let pickingCard = $state(false);
	const homePage = $derived(page.url.pathname === resolve('/'));
	const tileHover = ['1', 'true', 'yes', 'on'].includes(
		(env.PUBLIC_HOME_NAMECARD_IN_GALLERY ?? '').trim().toLowerCase()
	);
	const hoverRoles = ['title', 'description', 'label', 'value'].map(
		(part) => `${tileHover ? 'tile' : 'hover'}-${part}`
	);
	const selectable = $derived(homePage ? [...available, ...hoverRoles] : available);
	const roles = $derived(ROLES.filter((role) => selectable.includes(role.id)));
	const roleId = $derived(selectable.includes(selected) ? selected : roles[0]?.id);
	const role = $derived(ROLES.find((role) => role.id === roleId));
	const resolved = $derived(preview.draft && roleId ? resolveRole(preview.draft, roleId) : null);
	const dirty = $derived(!!preview.draft && JSON.stringify(preview.draft) !== preview.baseline);
	const outline = $derived(
		highlight && !minimized && roleId
			? `[data-typo="${roleId}"]{outline:2px solid #6366f1 !important;outline-offset:4px !important}`
			: ''
	);
	function change<K extends keyof TextStyle>(key: K, value: TextStyle[K]) {
		if (preview.draft && roleId)
			preview.draft.roles[roleId] = { ...preview.draft.roles[roleId], [key]: value };
	}
	function reset(key?: keyof TextStyle) {
		if (!preview.draft || !roleId) return;
		if (!key) delete preview.draft.roles[roleId];
		else if (preview.draft.roles[roleId]) delete preview.draft.roles[roleId][key];
	}
	async function reviewInAdmin() {
		if (!preview.draft) return;
		const draft = structuredClone($state.snapshot(preview.draft));
		if (draft.id === 'default') {
			draft.id = '';
			draft.name = `${draft.name} copy`;
		}
		preview.review = { draft, baseline: preview.baseline, roleId };
		storeReviewDraft(preview.review);
		await goto(resolve('/admin/typography'));
	}
	function exit() {
		if (dirty && !window.confirm('Discard this unsaved typography draft and exit preview?')) return;
		preview.hoverItemId = null;
		preview.draft = null;
		preview.review = null;
		clearReviewDraft();
	}
	function locate() {
		if (!roleId) return;
		const target = [...document.querySelectorAll<HTMLElement>(`[data-typo="${roleId}"]`)].find(
			(element) =>
				element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'
		);
		target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	}

	afterNavigate(() => {
		pickingCard = false;
		if (!homePage) preview.hoverItemId = null;
	});
	onMount(() => {
		let frame = 0;
		function pickCard(event: MouseEvent) {
			if (!pickingCard || !homePage || !(event.target instanceof Element)) return;
			const card = event.target.closest<HTMLElement>('[data-gallery-project-id]');
			if (!card) return;
			const id = Number(card.dataset.galleryProjectId);
			if (!portfolio.filteredItems.some((item) => item.id === id)) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			preview.hoverItemId = id;
			preview.keepHoverOpen = true;
			selected = `${tileHover ? 'tile' : 'hover'}-title`;
			pickingCard = false;
		}
		document.addEventListener('click', pickCard, true);
		function scan() {
			frame = 0;
			const ids = [
				...new Set(
					[...document.querySelectorAll<HTMLElement>('[data-typo]')]
						.filter(
							(element) =>
								element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'
						)
						.map((element) => element.dataset.typo!)
				)
			].sort();
			if (ids.join('|') !== available.join('|')) available = ids;
		}
		function schedule() {
			if (!frame) frame = requestAnimationFrame(scan);
		}
		const observer = new MutationObserver((records) => {
			if (
				records.some(
					(record) =>
						!(
							record.target instanceof Element ? record.target : record.target.parentElement
						)?.closest('[data-typography-panel]')
				)
			)
				schedule();
		});
		observer.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['class', 'style', 'data-typo', 'hidden']
		});
		window.addEventListener('resize', schedule);
		scan();
		return () => {
			document.removeEventListener('click', pickCard, true);
			observer.disconnect();
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', schedule);
		};
	});
</script>

<svelte:head
	><svelte:element this={'style'}
		>{outline}
		{pickingCard
			? '[data-gallery-project-id]{cursor:crosshair!important}[data-gallery-project-id]:hover,[data-gallery-project-id]:focus-visible{outline:3px solid #6366f1!important;outline-offset:-3px!important}'
			: ''}
	</svelte:element></svelte:head
>
<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') pickingCard = false;
	}}
	onbeforeunload={(event) => {
		if (dirty) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>

<aside
	data-typography-panel
	class="preview-panel {side} {minimized ? 'minimized' : ''}"
	aria-label="Live typography preview"
>
	<header>
		<div>
			<strong>Typography preview</strong>
			<p>Private draft · {preview.draft?.name}</p>
		</div>
		<button
			aria-label={minimized ? 'Expand typography editor' : 'Minimize typography editor'}
			onclick={() => (minimized = !minimized)}>{minimized ? 'Expand' : 'Minimize'}</button
		>
	</header>
	{#if !minimized}
		<div class="toolbar">
			<label><input type="checkbox" bind:checked={preview.enabled} /> Apply draft</label>
			<button onclick={() => (side = side === 'right' ? 'left' : 'right')}
				>Move {side === 'right' ? 'left' : 'right'}</button
			>
		</div>
		<div class="body">
			<p class="hint">Browse the site normally. Changes appear immediately and are not saved.</p>
			{#if homePage}
				<button
					class="primary"
					aria-pressed={pickingCard}
					onclick={() => (pickingCard = !pickingCard)}
					>{pickingCard ? 'Cancel picking' : 'Pick card on page'}</button
				>
				{#if pickingCard}<p class="hint" role="status">
						Click a gallery card to keep its preview open. This replaces the previous card without
						opening its project. Press Escape to cancel.
					</p>{/if}
				<label class="highlight"
					><input
						type="checkbox"
						checked={preview.keepHoverOpen !== false}
						onchange={(event) => (preview.keepHoverOpen = event.currentTarget.checked)}
					/> Keep hover card open</label
				>
				{#if preview.keepHoverOpen !== false}
					<label class="section-label"
						>Preview project
						<select
							value={portfolio.filteredItems.find((item) => item.id === preview.hoverItemId)?.id ??
								portfolio.filteredItems[0]?.id ??
								''}
							disabled={!portfolio.filteredItems.length}
							onchange={(event) => (preview.hoverItemId = Number(event.currentTarget.value))}
						>
							{#each portfolio.filteredItems as item (item.id)}<option value={item.id}
									>{item.name}</option
								>{/each}
						</select>
					</label>
					<p class="hint">
						One card stays open while you edit. Choose another project to replace it.
					</p>
				{/if}
			{/if}
			<label class="section-label"
				>Text styles on {page.url.pathname}
				<select
					value={roleId ?? ''}
					onchange={(event) => (selected = event.currentTarget.value)}
					aria-label="Text style on this page"
				>
					<option value="">Choose a text style</option>
					{#each roles as item (item.id)}<option value={item.id}>{item.group} · {item.label}</option
						>{/each}
				</select>
			</label>
			{#if role && resolved}
				<div class="toolbar">
					<h2>{role.label}</h2>
					<button onclick={locate}>Find on page</button>
				</div>
				<label class="highlight"
					><input type="checkbox" bind:checked={highlight} /> Highlight matching text</label
				>

				<StyleControls {resolved} {change} {reset} />
			{:else}<p class="hint">
					No editable text is currently rendered. Open a project or reveal a menu to see its styles.
				</p>{/if}
			<p class="hint">
				Hover styles remain available even when their card is hidden. Text inside generated images
				is edited by regenerating the name card.
			</p>
		</div>
		<footer>
			<button class="primary" onclick={reviewInAdmin}>Review & save in admin</button>
			<button onclick={exit}>Discard & exit</button>
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
		background: #fff;
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
	}
	header {
		padding: 16px;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}
	header p {
		color: #64748b;
		font-size: 11px;
		margin: 4px 0 0;
	}
	.toolbar {
		padding: 12px 16px;
	}
	.body .toolbar {
		padding: 12px 0;
	}
	.body {
		padding: 0 16px 16px;
		overflow: auto;
		min-height: 0;
	}
	.hint {
		font-size: 11px;
		color: #64748b;
		margin: 12px 0;
	}
	.section-label {
		display: grid;
		gap: 8px;
		font-size: 12px;
		overflow-wrap: anywhere;
	}
	select {
		width: 100%;
		padding: 10px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
	}
	h2 {
		font-weight: 600;
		font-size: 13px;
	}
	.highlight {
		display: block;
		font-size: 12px;
		margin-bottom: 16px;
	}
	footer {
		padding: 12px 16px;
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
	button:focus-visible,
	select:focus-visible {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}
	.primary {
		background: #0f172a;
		color: white;
	}
	.primary:hover {
		background: #334155;
	}
	.minimized {
		width: min(340px, calc(100vw - 32px));
	}
</style>
