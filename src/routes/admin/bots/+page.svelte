<script lang="ts">
	import { onMount } from 'svelte';
	import { useClerkContext } from 'svelte-clerk';

	interface BotSummary {
		identifier: string;
		latestUserAgent: string;
		latestPayload: string;
		count: number;
		firstSeen: string;
		lastSeen: string;
	}

	const ctx = useClerkContext();
	let bots = $state<BotSummary[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function loadBots() {
		loading = true;
		errorMsg = '';
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) headers.Authorization = `Bearer ${token}`;
			const res = await fetch('/api/admin/bots', { headers });
			if (!res.ok) throw new Error('Failed to load bots');
			bots = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load bots';
		} finally {
			loading = false;
		}
	}

	function truncate(str: string, max: number): string {
		return str.length > max ? str.slice(0, max) + '...' : str;
	}

	function parsePayload(raw: string): string {
		try {
			const obj = JSON.parse(raw);
			return obj.mission || raw;
		} catch {
			return raw;
		}
	}

	onMount(() => {
		void loadBots();
	});
</script>

<div class="max-w-5xl">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-semibold text-slate-900">Bot Check-ins</h1>
		<button
			type="button"
			onclick={loadBots}
			class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors duration-150"
		>
			Refresh
		</button>
	</div>

	{#if errorMsg}
		<p class="text-sm text-red-600 mb-4">{errorMsg}</p>
	{/if}

	{#if loading}
		<p class="text-sm text-slate-400">Loading...</p>
	{:else if bots.length === 0}
		<div class="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
			<p class="text-sm text-slate-500">No bots have checked in yet.</p>
			<p class="text-xs text-slate-400 mt-1">Bot check-in instructions are in robots.txt</p>
		</div>
	{:else}
		<div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-100 bg-slate-50/50">
						<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">Identifier</th>
						<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">User Agent</th>
						<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">Mission</th>
						<th class="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Visits</th>
						<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">First Seen</th>
						<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">Last Seen</th>
					</tr>
				</thead>
				<tbody>
					{#each bots as bot (bot.identifier)}
						<tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors duration-100">
							<td class="px-4 py-2.5">
								<a
									href={`/admin/bots/${bot.identifier}`}
									class="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
								>
									{bot.identifier}
								</a>
							</td>
							<td class="px-4 py-2.5 text-xs text-slate-600 max-w-[200px] truncate" title={bot.latestUserAgent}>
								{truncate(bot.latestUserAgent, 40)}
							</td>
							<td class="px-4 py-2.5 text-xs text-slate-600">
								{truncate(parsePayload(bot.latestPayload), 30)}
							</td>
							<td class="px-4 py-2.5 text-xs text-slate-600 text-right font-mono">
								{bot.count}
							</td>
							<td class="px-4 py-2.5 text-xs text-slate-400">
								{new Date(bot.firstSeen + 'Z').toLocaleDateString()}
							</td>
							<td class="px-4 py-2.5 text-xs text-slate-400">
								{new Date(bot.lastSeen + 'Z').toLocaleDateString()}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-xs text-slate-400 mt-3">{bots.length} unique bot{bots.length === 1 ? '' : 's'}</p>
	{/if}
</div>
