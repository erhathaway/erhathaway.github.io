<script lang="ts">
	type Props = {
		data: Record<string, never>;
		className?: string;
	};

	let { className = '' }: Props = $props();
</script>

<div class={`flex items-center gap-3 py-3 ${className}`}>
	<hr class="flex-1 border-t border-slate-300" />
	<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Divider</span>
	<hr class="flex-1 border-t border-slate-300" />
</div>
