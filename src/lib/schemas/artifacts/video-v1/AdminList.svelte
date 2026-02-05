<script lang="ts">
	import type { VideoV1Data } from './validator';

	type Props = {
		data: VideoV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex flex-col gap-2.5 ${className}`}>
	{#if data.thumbnailUrl}
		<div class="relative">
			<img
				src={data.thumbnailUrl}
				alt={data.description ?? ''}
				loading="lazy"
				class="h-40 w-full rounded-xl object-cover border border-slate-200"
			/>
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
					<svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				</div>
			</div>
		</div>
	{:else}
		<div class="relative h-40 w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
			<div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
				<svg class="w-5 h-5 text-slate-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			</div>
		</div>
	{/if}
	{#if data.description}
		<p class="text-xs text-slate-500">{data.description}</p>
	{/if}
</div>
