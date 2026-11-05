export type ImageSize = { width: number; height: number };

/** Reads an image's pixel size the way the browser will display it, or null when it can't be decoded. */
export function measureImage(url: string): Promise<ImageSize | null> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () =>
			resolve(img.naturalWidth > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
		img.onerror = () => resolve(null);
		img.src = url;
	});
}

/** Height per unit of width from a stored size, or undefined when the size isn't recorded. */
export function storedAspectRatio(data: unknown): number | undefined {
	const blob = data as Record<string, unknown> | null;
	const width = blob?.width;
	const height = blob?.height;
	return typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0
		? height / width
		: undefined;
}
