<script lang="ts">
	type Props = {
		value: Record<string, unknown>;
		onChange: (next: Record<string, unknown>) => void;
		onUpload?: (file: File) => Promise<string | { url: string; formats?: string[] }>;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value }: Props = $props();

	const pairId = $derived(typeof value.pairId === 'number' ? value.pairId : 0);
</script>

<div class="flex flex-col gap-3 py-4">
	<div class="flex items-center gap-3 w-full">
		<hr class="flex-1 border-t-2 border-dashed border-indigo-300" />
		<span class="text-xs font-semibold text-indigo-500">Dense Section #{pairId}</span>
		<hr class="flex-1 border-t-2 border-dashed border-indigo-300" />
	</div>
	<p class="text-xs text-slate-400">Images between the two Dense #{pairId} markers render at half width. Deleting this marker also deletes its pair.</p>
</div>
