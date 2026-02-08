<script lang="ts">
	type Props = {
		data: Record<string, never>;
		className?: string;
	};

	let { className = '' }: Props = $props();
</script>

<div class={`py-4 ${className}`}>
	<hr class="border-t border-ash/30" />
</div>
