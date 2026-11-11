<script lang="ts">
	// Zoom and pan for an image artifact. The frame has the image's own shape, as it does on the
	// project page, so 1x shows the whole image and there is nothing further out to zoom to.
	type Props = {
		imageUrl: string;
		positionX?: number;
		positionY?: number;
		zoom?: number;
		/** Width per unit of height, when the image's size is already recorded. */
		aspect?: number;
		busy?: boolean;
		onChange: (x: number, y: number, zoom: number) => void;
	};

	let { imageUrl, positionX = 50, positionY = 50, zoom = 1, aspect, busy = false, onChange }: Props = $props();

	const MAX_ZOOM = 2;

	let frameEl: HTMLDivElement | undefined = $state();
	let measured = $state<{ url: string; aspect: number } | null>(null);
	let dragging = $state(false);
	let startPointer = { x: 0, y: 0 };
	let startPosition = { x: 0, y: 0 };

	const frameAspect = $derived(aspect ?? (measured?.url === imageUrl ? measured.aspect : undefined) ?? 1.5);
	// An image saved below 1x keeps its value until the slider is moved.
	const minZoom = $derived(Math.min(1, zoom));
	const canPan = $derived(zoom > 1);
	const isDefault = $derived(positionX === 50 && positionY === 50 && zoom === 1);

	function handleLoad(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		if (img.naturalWidth > 0 && img.naturalHeight > 0) {
			measured = { url: imageUrl, aspect: img.naturalWidth / img.naturalHeight };
		}
	}

	function handlePointerDown(event: PointerEvent) {
		if (!canPan) return;
		event.preventDefault();
		dragging = true;
		startPointer = { x: event.clientX, y: event.clientY };
		startPosition = { x: positionX, y: positionY };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || !frameEl) return;
		event.preventDefault();
		const rect = frameEl.getBoundingClientRect();
		// How far the zoomed image overhangs the frame on each axis.
		const excessX = rect.width * (zoom - 1);
		const excessY = rect.height * (zoom - 1);
		if (excessX <= 0 || excessY <= 0) return;
		const nextX = startPosition.x - ((event.clientX - startPointer.x) / excessX) * 100;
		const nextY = startPosition.y - ((event.clientY - startPointer.y) / excessY) * 100;
		onChange(Math.max(0, Math.min(100, nextX)), Math.max(0, Math.min(100, nextY)), zoom);
	}

	function handlePointerUp() {
		dragging = false;
	}

	function handleZoomInput(event: Event) {
		onChange(positionX, positionY, parseFloat((event.currentTarget as HTMLInputElement).value));
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<span class="text-xs font-medium text-slate-500">Framing</span>
		{#if !isDefault}
			<button
				type="button"
				class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
				onclick={() => onChange(50, 50, 1)}
			>
				Reset
			</button>
		{/if}
	</div>

	<div class="flex justify-center rounded-lg bg-slate-100">
		<div
			bind:this={frameEl}
			class={[
				'relative overflow-hidden rounded-lg select-none touch-none',
				canPan && (dragging ? 'cursor-grabbing' : 'cursor-grab')
			]}
			style:aspect-ratio={frameAspect}
			style:width="min(100%, calc(var(--framing-max-h, 24rem) * {frameAspect}))"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			role="img"
			aria-label={canPan ? 'Image framing preview. Drag to reposition.' : 'Image framing preview'}
		>
			<img
				src={imageUrl}
				alt=""
				class={['absolute inset-0 h-full w-full object-cover pointer-events-none', busy && 'opacity-50']}
				style:object-position="{positionX}% {positionY}%"
				style:transform="scale({zoom})"
				style:transform-origin="{positionX}% {positionY}%"
				draggable="false"
				onload={handleLoad}
			/>
			{#if busy}
				<div class="absolute inset-0 flex items-center justify-center">
					<div class="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5">
						<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
						<span class="text-xs font-medium text-slate-700">Uploading...</span>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-3">
		<span class="w-10 shrink-0 text-[11px] text-slate-400">Zoom</span>
		<input
			type="range"
			min={minZoom}
			max={MAX_ZOOM}
			step="0.01"
			value={zoom}
			oninput={handleZoomInput}
			aria-label="Zoom"
			class="h-1 flex-1 cursor-pointer accent-amber-500"
		/>
		<span class="w-10 text-right font-mono text-[11px] text-slate-400">{zoom.toFixed(2)}x</span>
	</div>
	<p class="text-[11px] text-slate-400">
		{canPan ? 'Drag the image to choose what stays in view.' : 'The whole image is showing. Zoom in to crop it.'}
	</p>
</div>
