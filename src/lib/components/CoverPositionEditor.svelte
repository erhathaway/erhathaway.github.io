<script lang="ts">
	let {
		imageUrl,
		positionX = 50,
		positionY = 50,
		zoom = 1,
		onChange
	}: {
		imageUrl: string;
		positionX: number;
		positionY: number;
		zoom: number;
		onChange: (x: number, y: number, zoom: number) => void;
	} = $props();

	let editing = $state(false);
	let dragging = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();
	let imgEl: HTMLImageElement | undefined = $state();
	let startPointer = { x: 0, y: 0 };
	let startPosition = { x: 0, y: 0 };

	const isDefault = $derived(positionX === 50 && positionY === 50 && zoom === 1);

	function handlePointerDown(e: PointerEvent) {
		if (!editing || !containerEl || !imgEl) return;
		e.preventDefault();
		dragging = true;
		startPointer = { x: e.clientX, y: e.clientY };
		startPosition = { x: positionX, y: positionY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging || !containerEl || !imgEl) return;
		e.preventDefault();

		const containerRect = containerEl.getBoundingClientRect();
		const naturalW = imgEl.naturalWidth;
		const naturalH = imgEl.naturalHeight;

		if (naturalW === 0 || naturalH === 0) return;

		const containerW = containerRect.width;
		const containerH = containerRect.height;

		// object-fit: cover scale factor
		const coverScale = Math.max(containerW / naturalW, containerH / naturalH);
		// After cover + zoom, the rendered image dimensions on screen
		const renderedW = naturalW * coverScale * zoom;
		const renderedH = naturalH * coverScale * zoom;

		// Total excess in each axis (pixels on screen)
		const excessX = Math.max(0, renderedW - containerW);
		const excessY = Math.max(0, renderedH - containerH);

		const dx = e.clientX - startPointer.x;
		const dy = e.clientY - startPointer.y;

		const pctDx = excessX > 0 ? (dx / excessX) * -100 : 0;
		const pctDy = excessY > 0 ? (dy / excessY) * -100 : 0;

		const nextX = Math.max(0, Math.min(100, startPosition.x + pctDx));
		const nextY = Math.max(0, Math.min(100, startPosition.y + pctDy));

		onChange(nextX, nextY, zoom);
	}

	function handlePointerUp() {
		dragging = false;
	}

	function handleZoomInput(e: Event) {
		const value = parseFloat((e.currentTarget as HTMLInputElement).value);
		onChange(positionX, positionY, value);
	}

	function reset() {
		onChange(50, 50, 1);
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-xs font-medium text-slate-500">Cover framing</span>
			{#if !isDefault}
				<span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title="Custom position"></span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if editing && !isDefault}
				<button
					type="button"
					class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
					onclick={reset}
				>
					Reset
				</button>
			{/if}
			<button
				type="button"
				class="text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors duration-150 {editing ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"
				onclick={() => { editing = !editing; }}
			>
				{editing ? 'Done' : 'Adjust'}
			</button>
		</div>
	</div>

	<div
		bind:this={containerEl}
		class="relative w-full aspect-square overflow-hidden rounded-lg border select-none transition-colors duration-150 {editing ? 'border-amber-300 cursor-grab' : 'border-slate-200 cursor-default'}"
		class:cursor-grabbing={dragging}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		role="img"
		aria-label="Cover image preview{editing ? ' — drag to reposition' : ''}"
	>
		<img
			bind:this={imgEl}
			src={imageUrl}
			alt="Cover position preview"
			class="w-full h-full object-cover pointer-events-none transition-transform duration-100"
			style:object-position="{positionX}% {positionY}%"
			style:transform="scale({zoom})"
			style:transform-origin="{positionX}% {positionY}%"
			draggable="false"
		/>
		{#if editing}
			<div class="absolute inset-0 ring-2 ring-inset ring-amber-400/50 rounded-lg pointer-events-none"></div>
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
					{Math.round(positionX)}%, {Math.round(positionY)}% &middot; {zoom.toFixed(2)}x
				</div>
			</div>
		{/if}
	</div>

	{#if editing}
		<div class="flex items-center gap-3">
			<span class="text-[11px] text-slate-400 w-10 shrink-0">Zoom</span>
			<input
				type="range"
				min="0.5"
				max="2"
				step="0.01"
				value={zoom}
				oninput={handleZoomInput}
				class="flex-1 h-1 accent-amber-500 cursor-pointer"
			/>
			<span class="text-[11px] font-mono text-slate-400 w-10 text-right">{zoom.toFixed(2)}x</span>
		</div>
	{/if}
</div>
