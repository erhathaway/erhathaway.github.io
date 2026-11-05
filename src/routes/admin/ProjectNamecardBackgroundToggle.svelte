<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { useClerkContext } from 'svelte-clerk';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';

	const ctx = useClerkContext();
	const showBackground = $derived(page.data.projectNamecardBackground !== false);
	let busy = $state(false);
	let failure = $state('');

	async function update(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const next = input.checked;
		busy = true;
		failure = '';
		try {
			const response = await fetchNamecardAdmin(
				async () => (await ctx.clerk?.session?.getToken()) ?? null,
				'/api/admin/site-settings/project-namecard-background',
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ showBackground: next })
				}
			);
			if (!response.ok) throw new Error('Could not update the name card.');
			await invalidate('app:project-namecard');
		} catch (err) {
			input.checked = !next;
			failure = err instanceof Error ? err.message : 'Could not update the name card.';
		} finally {
			busy = false;
		}
	}
</script>

<section class="mb-6 rounded-xl border border-slate-200 bg-white p-4">
	<label class="flex items-center gap-3 text-sm font-medium text-slate-900">
		<input type="checkbox" checked={showBackground} disabled={busy} onchange={update} />
		Show background on project pages
	</label>
	<p class="mt-2 text-xs text-slate-500">
		Turn this off to show the name as plain text on the page, without the card behind it.
	</p>
	{#if failure}<p role="alert" class="mt-2 text-xs text-red-700">{failure}</p>{/if}
</section>
