<script lang="ts">
	import { SignedIn, SignedOut } from 'svelte-clerk';
	import { getArtifactSchema, getArtifactComponent } from '$lib/schemas/artifacts';
	import type { ArtifactComponentContext } from '$lib/schemas/artifacts';

	let { data } = $props();

	const schema = $derived(getArtifactSchema(data.schemaName));

	const contexts: { key: ArtifactComponentContext; label: string }[] = [
		{ key: 'adminEditor', label: 'Admin Editor' },
		{ key: 'adminList', label: 'Admin List' },
		{ key: 'adminProjectCover', label: 'Admin Project Cover' },
		{ key: 'publicViewLandingPage', label: 'Public View — Landing Page' },
		{ key: 'publicViewProjectPage', label: 'Public View — Project Page' }
	];

	const sampleData = {
		imageUrl: 'https://placehold.co/800x600/e2e8f0/94a3b8?text=Sample+Image',
		description: 'Sample description'
	};

	const noop = () => {};
	const noopAsync = async () => '';
</script>

<SignedIn>
	{#if !schema}
		<div class="max-w-3xl">
			<h1 class="text-2xl font-semibold text-slate-900 mb-2">Unknown schema</h1>
			<p class="text-sm text-slate-500">
				No schema found for <code class="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{data.schemaName}</code>.
			</p>
		</div>
	{:else}
		<div class="max-w-5xl">
			<div class="mb-8">
				<h1 class="text-2xl font-semibold text-slate-900">
					{schema.label}
					<code class="ml-2 text-sm font-mono font-normal text-slate-400">{schema.name}</code>
				</h1>
				<p class="text-sm text-slate-500 mt-1">{schema.description}</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{#each contexts as ctx (ctx.key)}
					{@const Comp = getArtifactComponent(schema.name, ctx.key)}
					<div>
						<div class="mb-2">
							<p class="text-xs font-semibold text-slate-600">{ctx.label}</p>
							<p class="text-[10px] font-mono text-slate-400">{ctx.key}</p>
						</div>
						{#if !Comp}
							<p class="text-xs text-slate-400">No component registered.</p>
						{:else if ctx.key === 'adminEditor'}
							<Comp
								value={sampleData}
								onChange={noop}
								onUpload={noopAsync}
								onUploadStateChange={noop}
							/>
						{:else if ctx.key === 'adminProjectCover'}
							<div class="h-48">
								<Comp data={sampleData} className="h-full" />
							</div>
						{:else}
							<Comp data={sampleData} />
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</SignedIn>

<SignedOut>
	<div class="max-w-3xl">
		<h1 class="text-2xl font-semibold text-slate-900 mb-2">Sign in required</h1>
		<p class="text-sm text-slate-500">Please <a href="/admin/sign-in" class="text-slate-900 underline">sign in</a> to view schema previews.</p>
	</div>
</SignedOut>
