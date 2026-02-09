<script lang="ts">
	type Props = {
		data: Record<string, never>;
		className?: string;
	};

	let { className = '' }: Props = $props();
</script>

<div class={`flex items-center justify-center rounded-2xl bg-slate-100 p-6 ${className}`}>
	<span class="text-xs text-slate-400">Dense Section</span>
</div>
