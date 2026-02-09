<script lang="ts">
	type Props = {
		value: Record<string, unknown>;
		onChange: (next: Record<string, unknown>) => void;
		onUpload?: (file: File) => Promise<{ url: string }>;
		onUploadStateChange?: (state: { uploading: boolean; progress: number }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value, onChange }: Props = $props();
</script>

<div class="flex items-center justify-center rounded-2xl bg-slate-100 p-6">
	<span class="text-xs text-slate-400">Displays the project cover image. No settings needed.</span>
</div>
