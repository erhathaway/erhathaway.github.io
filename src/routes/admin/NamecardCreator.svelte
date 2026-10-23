<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		DEFAULT_THEME,
		snapshotTypography,
		type TypographyTheme,
		type TypographyContext
	} from '$lib/typography';
	import { SvelteMap } from 'svelte/reactivity';
	import NamecardSlider from './NamecardSlider.svelte';
	import type { NamecardRecipe, NamecardBackground } from '$lib/types/site-settings';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import {
		renderNamecardPreview,
		NAMECARD_DEFAULTS,
		type NamecardDesign
	} from '$lib/utils/namecard';

	let {
		getToken,
		onGenerate,
		disabled = false
	}: {
		getToken: () => Promise<string | null>;
		onGenerate: (
			file: File,
			design: NamecardDesign,
			background: File | NamecardBackground | null
		) => Promise<NamecardRecipe>;
		disabled?: boolean;
	} = $props();

	interface LibraryImage {
		key: string;
		projectName?: string;
		settingLabel?: string;
		uploaded: string;
	}
	let gradient = $state<NonNullable<NamecardDesign['gradient']>>('none');
	let gradientColor = $state('#fdda82');
	let gradientOpacity = $state(30);
	let gradientSize = $state(60);
	let gradientX = $state(100);
	let gradientY = $state(100);
	let gradientAngle = $state(135);
	let textPadding = $state(48);
	let subtitleColor = $state<string | undefined>();
	let background = $state<HTMLImageElement | null>(null);
	let backgroundName = $state('');
	let backgroundSource = $state<File | NamecardBackground | null>(null);
	let container: HTMLElement | undefined;
	function attachContainer(node: HTMLElement) {
		container = node;
		return () => {
			if (container === node) container = undefined;
		};
	}
	let title = $state(NAMECARD_DEFAULTS.title);
	let subtitle = $state(NAMECARD_DEFAULTS.subtitle);
	let textPositionY = $state(NAMECARD_DEFAULTS.textPositionY);
	let titleSize = $state(NAMECARD_DEFAULTS.titleSize);
	let titleLineHeight = $state(NAMECARD_DEFAULTS.titleLineHeight);
	let subtitleSize = $state(NAMECARD_DEFAULTS.subtitleSize);
	let subtitleLetterSpacing = $state(NAMECARD_DEFAULTS.subtitleLetterSpacing);
	let titleGap = $state(NAMECARD_DEFAULTS.titleGap);
	let subtitleGap = $state(NAMECARD_DEFAULTS.subtitleGap);
	let dividerWidth = $state(NAMECARD_DEFAULTS.dividerWidth);
	let backgroundColor = $state(NAMECARD_DEFAULTS.backgroundColor);
	let divider = $state(NAMECARD_DEFAULTS.divider);
	let textColor = $state(NAMECARD_DEFAULTS.textColor);
	let darkness = $state(NAMECARD_DEFAULTS.darkness);
	let positionX = $state(NAMECARD_DEFAULTS.positionX);
	let positionY = $state(NAMECARD_DEFAULTS.positionY);
	let zoom = $state(NAMECARD_DEFAULTS.zoom);
	let alignment = $state<NamecardDesign['alignment']>(NAMECARD_DEFAULTS.alignment);
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	let generatedBlob = $state<Blob | null>(null);
	let typographyTheme = $state<TypographyTheme>(DEFAULT_THEME);
	let typographyContext = $state<TypographyContext>('landing');
	let themeLoaded = $state(false);
	let themeError = $state('');
	async function loadTheme() {
		const response = await fetchNamecardAdmin(getToken, '/api/admin/typography');
		if (!response.ok) throw new Error('Could not load the active typography theme.');
		const result = (await response.json()) as { themes: TypographyTheme[]; activeId: string };
		const active = result.themes.find((theme) => theme.id === result.activeId);
		if (!active) throw new Error('Active typography theme not found.');
		typographyTheme = active;
		themeLoaded = true;
		return active;
	}
	function applyThemeSizing() {
		const snapshot = snapshotTypography(typographyTheme, typographyContext);
		titleSize = Math.min(300, Math.max(72, Math.round((snapshot.title.size * 1200) / 340)));
		subtitleSize = Math.min(96, Math.max(24, Math.round((snapshot.subtitle.size * 1200) / 340)));
		titleLineHeight = Math.min(1.6, Math.max(0.8, snapshot.title.lineHeight));
		subtitleLetterSpacing = Math.min(24, Math.max(0, snapshot.subtitle.tracking * subtitleSize));
	}
	async function retryTheme() {
		themeError = '';
		try {
			await loadTheme();
		} catch (err) {
			themeError = err instanceof Error ? err.message : 'Could not load typography.';
		}
	}
	onMount(() => {
		void retryTheme();
	});
	const design = $derived({
		typography: snapshotTypography(typographyTheme, typographyContext),
		gradient,
		gradientColor,
		gradientOpacity,
		gradientSize,
		gradientX,
		gradientY,
		gradientAngle,
		textPadding,
		subtitleColor,
		title,
		subtitle,
		textPositionY,
		titleSize,
		titleLineHeight,
		subtitleSize,
		subtitleLetterSpacing,
		titleGap,
		subtitleGap,
		dividerWidth,
		backgroundColor,
		divider,
		textColor,
		darkness,
		positionX,
		positionY,
		zoom,
		alignment
	});
	const preview = $derived(mounted ? renderNamecardPreview(background, design) : null);

	let loadingImage = $state(false);
	let generating = $state(false);
	let error = $state('');
	let libraryOpen = $state(false);
	let library = $state<LibraryImage[]>([]);
	let libraryLoading = $state(false);
	let libraryError = $state('');
	let search = $state('');
	let imageRequest = 0;
	const busy = $derived(disabled || generating || loadingImage || !themeLoaded);
	const filteredImages = $derived(
		library.filter((image) =>
			`${image.projectName ?? ''} ${image.settingLabel ?? ''} ${image.key}`
				.toLowerCase()
				.includes(search.toLowerCase())
		)
	);

	async function loadBackground(source: File | string, name: string) {
		const request = ++imageRequest;
		loadingImage = true;
		error = '';
		let objectUrl = '';
		try {
			let blob: Blob;
			if (typeof source === 'string') {
				const response = await fetch(source);
				if (!response.ok)
					throw new Error('Could not load that image. Choose another image or try again.');
				blob = await response.blob();
			} else {
				if (!source.type.startsWith('image/')) throw new Error('Choose an image file.');
				blob = source;
			}
			objectUrl = URL.createObjectURL(blob);
			const image = new Image();
			image.src = objectUrl;
			await image.decode();
			if (request !== imageRequest) return false;
			background = image;
			backgroundSource = typeof source === 'string' ? { imageUrl: source } : source;
			backgroundName = name;
			positionX = positionY = 50;
			zoom = 1;
			libraryOpen = false;
			return true;
		} catch (err) {
			if (request === imageRequest)
				error = err instanceof Error ? err.message : 'Could not read this image.';
			return false;
		} finally {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
			if (request === imageRequest) loadingImage = false;
		}
	}

	async function openLibrary() {
		libraryOpen = true;
		libraryLoading = true;
		libraryError = '';
		try {
			const response = await fetchNamecardAdmin(getToken, '/api/admin/images');
			if (!response.ok) throw new Error('Could not load your image library.');
			const data = (await response.json()) as { items: LibraryImage[] };
			// Show one copy of each image rather than every optimized format.
			const unique = new SvelteMap<string, LibraryImage>();
			for (const item of data.items) {
				if (!/\.(avif|webp|png|jpe?g|gif)$/i.test(item.key)) continue;
				const base = item.key.replace(/\.[^.]+$/, '');
				if (!unique.has(base) || item.key.endsWith('.webp')) unique.set(base, item);
			}
			library = [...unique.values()].sort((a, b) => b.uploaded.localeCompare(a.uploaded));
		} catch (err) {
			libraryError = err instanceof Error ? err.message : 'Could not load images.';
		} finally {
			libraryLoading = false;
		}
	}

	async function generate(_blob: Blob) {
		if (busy || !title.trim()) return;
		generating = true;
		error = '';
		try {
			const active = await loadTheme();
			const currentDesign = {
				...design,
				typography: snapshotTypography(active, typographyContext)
			};
			const { blob } = await renderNamecardPreview(background, currentDesign);
			const recipe = await onGenerate(
				new File([blob], 'namecard.png', { type: 'image/png' }),
				currentDesign,
				backgroundSource
			);
			backgroundSource = recipe.background;
			generatedBlob = blob;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not generate the name card.';
		} finally {
			generating = false;
		}
	}

	export async function edit(recipe: NamecardRecipe): Promise<boolean> {
		typographyContext = recipe.design.typography?.context ?? 'landing';
		if (recipe.background) {
			const loaded = await loadBackground(recipe.background.imageUrl, 'Saved background');
			if (!loaded) return false;
		} else {
			background = null;
			backgroundName = '';
		}
		backgroundSource = recipe.background ? { ...recipe.background } : null;
		gradient = recipe.design.gradient ?? 'none';
		gradientColor = recipe.design.gradientColor ?? '#fdda82';
		gradientOpacity = recipe.design.gradientOpacity ?? 30;
		gradientSize = recipe.design.gradientSize ?? 60;
		gradientX = recipe.design.gradientX ?? 100;
		gradientY = recipe.design.gradientY ?? 100;
		gradientAngle = recipe.design.gradientAngle ?? 135;
		textPadding = recipe.design.textPadding ?? 48;
		subtitleColor = recipe.design.subtitleColor;
		title = recipe.design.title;
		subtitle = recipe.design.subtitle;
		textPositionY = recipe.design.textPositionY;
		titleSize = recipe.design.titleSize;
		titleLineHeight = recipe.design.titleLineHeight;
		subtitleSize = recipe.design.subtitleSize;
		subtitleLetterSpacing = recipe.design.subtitleLetterSpacing;
		titleGap = recipe.design.titleGap;
		subtitleGap = recipe.design.subtitleGap;
		dividerWidth = recipe.design.dividerWidth;
		backgroundColor = recipe.design.backgroundColor;
		divider = recipe.design.divider;
		textColor = recipe.design.textColor;
		darkness = recipe.design.darkness;
		positionX = recipe.design.positionX;
		positionY = recipe.design.positionY;
		zoom = recipe.design.zoom;
		alignment = recipe.design.alignment;
		error = '';
		generatedBlob = null;
		container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		container
			?.querySelector<HTMLTextAreaElement>('textarea[aria-label="Title"]')
			?.focus({ preventScroll: true });
		return true;
	}

	function resetDefaults() {
		gradient = 'none';
		gradientColor = '#fdda82';
		gradientOpacity = 30;
		gradientSize = 60;
		gradientX = 100;
		gradientY = 100;
		gradientAngle = 135;
		textPadding = 48;
		subtitleColor = undefined;
		title = NAMECARD_DEFAULTS.title;
		subtitle = NAMECARD_DEFAULTS.subtitle;
		textPositionY = NAMECARD_DEFAULTS.textPositionY;
		titleSize = NAMECARD_DEFAULTS.titleSize;
		titleLineHeight = NAMECARD_DEFAULTS.titleLineHeight;
		subtitleSize = NAMECARD_DEFAULTS.subtitleSize;
		subtitleLetterSpacing = NAMECARD_DEFAULTS.subtitleLetterSpacing;
		titleGap = NAMECARD_DEFAULTS.titleGap;
		subtitleGap = NAMECARD_DEFAULTS.subtitleGap;
		dividerWidth = NAMECARD_DEFAULTS.dividerWidth;
		backgroundColor = NAMECARD_DEFAULTS.backgroundColor;
		divider = NAMECARD_DEFAULTS.divider;
		textColor = NAMECARD_DEFAULTS.textColor;
		darkness = NAMECARD_DEFAULTS.darkness;
		positionX = NAMECARD_DEFAULTS.positionX;
		positionY = NAMECARD_DEFAULTS.positionY;
		zoom = NAMECARD_DEFAULTS.zoom;
		alignment = NAMECARD_DEFAULTS.alignment;
		error = '';
		generatedBlob = null;
	}

	async function download(_url: string) {
		if (busy) return;
		generating = true;
		try {
			const active = await loadTheme();
			const { url } = await renderNamecardPreview(background, {
				...design,
				typography: snapshotTypography(active, typographyContext)
			});
			const link = document.createElement('a');
			link.href = url;
			link.download = 'namecard.png';
			link.click();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not download image.';
		} finally {
			generating = false;
		}
	}

	onDestroy(() => {
		imageRequest++;
	});
</script>

<section {@attach attachContainer} class="pt-5" aria-label="Name card creator">
	<h3 class="text-sm font-semibold text-slate-900">Design & preview</h3>
	<p class="mt-1 text-sm text-slate-500">
		Add your text and choose a background image or color. Preview the card before applying it.
	</p>
	<div class="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
		<label
			>Typography context <select
				bind:value={typographyContext}
				disabled={generating || disabled}
				class="ml-2 rounded border border-slate-200 px-2 py-1"
				><option value="landing">Landing</option><option value="project">Project</option><option
					value="preview">Preview</option
				></select
			></label
		>
		<button type="button" disabled={busy} onclick={applyThemeSizing} class="ml-3 underline"
			>Apply theme size & spacing</button
		>
		<p class="mt-2">
			Active theme: {themeLoaded ? typographyTheme.name : 'Loading…'}. Size and spacing below
			override the theme for this image.
		</p>
		{#if themeError}<p role="alert" class="mt-2 text-red-600">{themeError}</p>
			<button type="button" onclick={retryTheme} class="underline">Retry typography</button>{/if}
	</div>
	<div class="mt-6 grid gap-8 lg:grid-cols-2">
		<fieldset disabled={busy} class="min-w-0 space-y-5 disabled:opacity-60">
			<legend class="sr-only">Name card design</legend>
			<div class="flex items-end justify-between gap-3">
				<label class="text-xs font-semibold text-slate-600"
					>Text alignment
					<select
						bind:value={alignment}
						class="mt-2 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
					>
						<option value="center">Center</option>
						<option value="left">Left</option>
					</select>
				</label>
				<button
					type="button"
					onclick={resetDefaults}
					class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
					>Reset defaults</button
				>
			</div>
			<div>
				<p class="mb-2 text-xs font-semibold text-slate-600">Background image</p>
				<div class="flex flex-wrap items-center gap-3">
					<label class="text-sm text-slate-600">
						<span class="sr-only">Upload a background image</span>
						<input
							type="file"
							accept="image/*"
							class="w-full max-w-xs text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
							onchange={(event) => {
								const file = event.currentTarget.files?.[0];
								if (file) void loadBackground(file, file.name);
								event.currentTarget.value = '';
							}}
						/>
					</label>
					<button
						type="button"
						onclick={openLibrary}
						class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
						>Choose from library</button
					>
				</div>
				{#if loadingImage}<p class="mt-2 text-xs text-slate-500" role="status">
						Loading background…
					</p>
				{:else if backgroundName}<p class="mt-2 text-xs break-all text-slate-500">
						{backgroundName}
					</p>{/if}
			</div>
			{#if libraryOpen}
				<div class="rounded-xl border border-slate-200 bg-white p-3">
					<div class="mb-3 flex items-center justify-between gap-3">
						<label class="flex-1"
							><span class="sr-only">Search images</span><input
								type="search"
								bind:value={search}
								placeholder="Search images…"
								class="w-full rounded-lg border-slate-200 text-sm"
							/></label
						>
						<button
							type="button"
							onclick={() => (libraryOpen = false)}
							class="text-xs text-slate-500">Close</button
						>
					</div>
					{#if libraryLoading}<p class="py-4 text-sm text-slate-500" role="status">
							Loading images…
						</p>
					{:else if libraryError}<p class="text-sm text-red-600" role="alert">{libraryError}</p>
						<button type="button" onclick={openLibrary} class="mt-2 text-sm underline"
							>Try again</button
						>
					{:else}
						<div class="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
							{#each filteredImages as item (item.key)}
								{@const label =
									item.projectName ?? item.settingLabel ?? item.key.split('/').pop() ?? 'Image'}
								<button
									type="button"
									onclick={() => loadBackground(`/${item.key}`, label)}
									class="overflow-hidden rounded-lg border border-slate-200 text-left hover:border-slate-500"
									title={label}
								>
									<img
										src={`/${item.key}`}
										alt={label}
										loading="lazy"
										class="aspect-square w-full object-cover"
									/>
									<span class="block truncate p-1.5 text-[10px] text-slate-500">{label}</span>
								</button>
							{:else}<p class="col-span-3 py-4 text-sm text-slate-500">
									No images found. Upload a background to get started.
								</p>{/each}
						</div>
					{/if}
				</div>
			{/if}
			<label class="block text-xs font-semibold text-slate-600"
				>Title
				<textarea
					bind:value={title}
					aria-label="Title"
					rows="2"
					maxlength="200"
					class="mt-2 block w-full rounded-lg border-slate-200 text-sm font-normal"
					placeholder="Ethan Hathaway"
				></textarea>
				<span class="mt-1 block font-normal text-slate-400"
					>Press Enter to insert a line break.</span
				>
			</label>
			<label class="block text-xs font-semibold text-slate-600"
				>Subtitle
				<textarea
					bind:value={subtitle}
					rows="2"
					maxlength="300"
					class="mt-2 block w-full rounded-lg border-slate-200 text-sm font-normal"
					placeholder="Things I Make"
				></textarea>
			</label>
			<details class="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
				<summary class="cursor-pointer text-sm font-medium text-slate-700"
					>Typography & spacing</summary
				>
				<div class="mt-4 space-y-4">
					<NamecardSlider
						label="Text side padding"
						value={textPadding}
						defaultValue={48}
						min={0}
						max={240}
						unit="px"
						onChange={(v) => (textPadding = v)}
					/>
					<NamecardSlider
						label="Text vertical position"
						value={textPositionY}
						defaultValue={NAMECARD_DEFAULTS.textPositionY}
						min={20}
						max={80}
						unit="%"
						onChange={(value) => (textPositionY = value)}
					/>
					<NamecardSlider
						label="Title size"
						value={titleSize}
						defaultValue={NAMECARD_DEFAULTS.titleSize}
						min={72}
						max={300}
						step={2}
						unit="px"
						onChange={(value) => (titleSize = value)}
					/>
					<NamecardSlider
						label="Title line spacing"
						value={titleLineHeight}
						defaultValue={NAMECARD_DEFAULTS.titleLineHeight}
						min={0.8}
						max={1.6}
						step={0.01}
						unit="×"
						onChange={(value) => (titleLineHeight = value)}
					/>
					<NamecardSlider
						label="Space above divider"
						value={titleGap}
						defaultValue={NAMECARD_DEFAULTS.titleGap}
						min={0}
						max={240}
						step={4}
						unit="px"
						onChange={(value) => (titleGap = value)}
					/>
					<NamecardSlider
						label="Space below divider"
						value={subtitleGap}
						defaultValue={NAMECARD_DEFAULTS.subtitleGap}
						min={0}
						max={240}
						step={4}
						unit="px"
						onChange={(value) => (subtitleGap = value)}
					/>
					<NamecardSlider
						label="Subtitle size"
						value={subtitleSize}
						defaultValue={NAMECARD_DEFAULTS.subtitleSize}
						min={24}
						max={96}
						step={2}
						unit="px"
						onChange={(value) => (subtitleSize = value)}
					/>
					<NamecardSlider
						label="Subtitle letter spacing"
						value={subtitleLetterSpacing}
						defaultValue={NAMECARD_DEFAULTS.subtitleLetterSpacing}
						min={0}
						max={24}
						step={1}
						unit="px"
						onChange={(value) => (subtitleLetterSpacing = value)}
					/>
					<NamecardSlider
						label="Divider width"
						value={dividerWidth}
						defaultValue={NAMECARD_DEFAULTS.dividerWidth}
						min={48}
						max={480}
						step={4}
						unit="px"
						onChange={(value) => (dividerWidth = value)}
					/>
				</div>
			</details>
			<label class="flex items-center gap-2 text-sm text-slate-600"
				><input
					type="checkbox"
					bind:checked={divider}
					class="rounded border-slate-300 text-slate-900"
				/>Show a divider between title and subtitle</label
			>
			<div class="flex flex-wrap items-center gap-5">
				<div class="flex items-center gap-2">
					<label class="flex items-center gap-2 text-xs font-semibold text-slate-600"
						>Text color<input
							type="color"
							bind:value={textColor}
							class="h-8 w-10 rounded border border-slate-200"
						/></label
					>
					<button
						type="button"
						onclick={() => (textColor = NAMECARD_DEFAULTS.textColor)}
						disabled={textColor === NAMECARD_DEFAULTS.textColor}
						aria-label="Reset text color"
						class="text-xs text-slate-500 underline hover:text-slate-900 disabled:opacity-30"
						>Reset</button
					>
				</div>
				<div class="flex items-center gap-2">
					<label class="flex items-center gap-2 text-xs font-semibold text-slate-600"
						>Background color<input
							type="color"
							bind:value={backgroundColor}
							class="h-8 w-10 rounded border border-slate-200"
						/></label
					>
					<button
						type="button"
						onclick={() => (backgroundColor = NAMECARD_DEFAULTS.backgroundColor)}
						disabled={backgroundColor === NAMECARD_DEFAULTS.backgroundColor}
						aria-label="Reset background color"
						class="text-xs text-slate-500 underline hover:text-slate-900 disabled:opacity-30"
						>Reset</button
					>
				</div>
			</div>
			<details class="rounded-xl border border-slate-200 p-4" open={gradient !== 'none'}>
				<summary class="cursor-pointer text-sm font-medium text-slate-700"
					>Background gradient</summary
				>
				<div class="mt-4 space-y-4">
					<label class="block text-xs font-semibold text-slate-600"
						>Gradient type
						<select
							bind:value={gradient}
							class="mt-2 block rounded-lg border border-slate-200 px-3 py-2"
							><option value="none">None</option><option value="radial">Radial glow</option><option
								value="linear">Linear</option
							></select
						>
					</label>
					{#if gradient !== 'none'}
						<div class="flex gap-3">
							<label class="text-xs text-slate-600"
								>Gradient color <input type="color" bind:value={gradientColor} /></label
							><button
								type="button"
								class="text-xs underline"
								onclick={() => (gradientColor = '#fdda82')}>Reset gradient color</button
							>
						</div>
						<NamecardSlider
							label="Gradient opacity"
							value={gradientOpacity}
							defaultValue={30}
							min={0}
							max={100}
							unit="%"
							onChange={(v) => (gradientOpacity = v)}
						/>
						{#if gradient === 'radial'}
							<NamecardSlider
								label="Gradient spread"
								value={gradientSize}
								defaultValue={60}
								min={10}
								max={150}
								unit="%"
								onChange={(v) => (gradientSize = v)}
							/>
							<NamecardSlider
								label="Gradient horizontal position"
								value={gradientX}
								defaultValue={100}
								min={0}
								max={100}
								unit="%"
								onChange={(v) => (gradientX = v)}
							/>
							<NamecardSlider
								label="Gradient vertical position"
								value={gradientY}
								defaultValue={100}
								min={0}
								max={100}
								unit="%"
								onChange={(v) => (gradientY = v)}
							/>
						{:else}
							<NamecardSlider
								label="Gradient angle"
								value={gradientAngle}
								defaultValue={135}
								min={0}
								max={360}
								unit="°"
								onChange={(v) => (gradientAngle = v)}
							/>
						{/if}
					{/if}
					<p class="text-xs text-slate-500">
						Gradients sit over the background color. Remove the background image to see them.
					</p>
					{#if background}<button
							type="button"
							class="text-xs underline"
							onclick={() => {
								background = null;
								backgroundSource = null;
								backgroundName = '';
							}}>Remove background image</button
						>{/if}
				</div>
			</details>
			<div class="flex gap-3">
				<label class="text-xs text-slate-600"
					>Subtitle color <input
						type="color"
						value={subtitleColor ?? textColor}
						oninput={(event) => (subtitleColor = event.currentTarget.value)}
					/></label
				><button type="button" class="text-xs underline" onclick={() => (subtitleColor = undefined)}
					>Reset subtitle color</button
				>
			</div>
			<NamecardSlider
				label="Darken background"
				value={darkness}
				defaultValue={NAMECARD_DEFAULTS.darkness}
				min={0}
				max={80}
				unit="%"
				onChange={(value) => (darkness = value)}
			/>
			<details class="text-sm text-slate-600">
				<summary class="cursor-pointer font-medium">Adjust background framing</summary>
				<div class="mt-4 space-y-3">
					<NamecardSlider
						label="Horizontal position"
						value={positionX}
						defaultValue={NAMECARD_DEFAULTS.positionX}
						min={0}
						max={100}
						unit="%"
						onChange={(value) => (positionX = value)}
					/>
					<NamecardSlider
						label="Vertical position"
						value={positionY}
						defaultValue={NAMECARD_DEFAULTS.positionY}
						min={0}
						max={100}
						unit="%"
						onChange={(value) => (positionY = value)}
					/>
					<NamecardSlider
						label="Zoom"
						value={zoom}
						defaultValue={NAMECARD_DEFAULTS.zoom}
						min={1}
						max={3}
						step={0.05}
						unit="×"
						onChange={(value) => (zoom = value)}
					/>
				</div>
			</details>
		</fieldset>
		<div class="min-w-0 lg:sticky lg:top-6 lg:self-start">
			<p class="mb-2 text-xs font-semibold text-slate-600">Preview</p>
			{#await preview}
				<div
					class="flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-400"
					role="status"
				>
					Rendering preview…
				</div>
			{:then card}
				<div
					class="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
				>
					{#if card}<img
							src={card.url}
							alt="Name card preview: {title} — {subtitle}"
							class="h-full w-full object-contain"
						/>
					{:else}<p class="p-8 text-center text-sm text-slate-400">
							Choose a background image to preview your name card.
						</p>{/if}
				</div>
				<div class="mt-4 flex flex-wrap items-center gap-3">
					<button
						type="button"
						onclick={() => card && generate(card.blob)}
						disabled={busy || !card || !title.trim()}
						class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
						>{generating ? 'Generating…' : 'Generate & apply'}</button
					>
					{#if card}<button
							type="button"
							disabled={busy}
							onclick={() => download(card.url)}
							class="text-sm text-slate-500 underline hover:text-slate-900">Download PNG</button
						>{/if}
				</div>
				{#if card && generatedBlob === card.blob}<p
						class="mt-3 text-sm text-emerald-700"
						role="status"
					>
						Image applied. Save your variant to keep this design.
					</p>{/if}
			{:catch previewError}
				<p class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600" role="alert">
					{previewError instanceof Error ? previewError.message : 'Could not render the preview.'}
				</p>
			{/await}
			<p class="mt-2 text-xs text-slate-400">
				1200 × 1200 pixels. Applying returns you to the variant editor.
			</p>
			{#if error}<p class="mt-3 text-sm text-red-600" role="alert">{error}</p>{/if}
		</div>
	</div>
</section>
