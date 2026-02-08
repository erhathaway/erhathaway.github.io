<script lang="ts">
	type Props = {
		value: Record<string, unknown>;
		onChange: (next: Record<string, unknown>) => void;
		onUpload?: (file: File) => Promise<string | { url: string; formats?: string[] }>;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value, onChange }: Props = $props();
</script>

<div class="flex flex-col items-center gap-3 py-4">
	<div class="flex items-center gap-3 w-full">
		<hr class="flex-1 border-t border-slate-300" />
		<span class="text-xs font-medium text-slate-500">Horizontal Divider</span>
		<hr class="flex-1 border-t border-slate-300" />
	</div>
	<p class="text-xs text-slate-400">This divider will span the full width of the gallery and start a new row.</p>
</div>
