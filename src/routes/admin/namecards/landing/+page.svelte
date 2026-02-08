<script lang="ts">
	import { SignedIn, SignedOut, useClerkContext } from 'svelte-clerk';
	import NamecardImageSettings from '../../NamecardImageSettings.svelte';

	const ctx = useClerkContext();

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}
</script>

<header class="mb-8 pb-5 border-b border-slate-200">
	<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Landing Page Namecard</p>
</header>

<SignedIn>
	<NamecardImageSettings {getToken} />
</SignedIn>

<SignedOut>
	<div class="mt-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
		<svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<p class="text-sm text-red-700">You need to be signed in to access this page.</p>
	</div>
</SignedOut>
