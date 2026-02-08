const mimeTypes: Record<string, string> = {
	avif: 'image/avif',
	webp: 'image/webp',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif'
};

/** Replace the file extension on a URL path. */
export function replaceExtension(url: string, ext: string): string {
	const dotIndex = url.lastIndexOf('.');
	if (dotIndex === -1) return `${url}.${ext}`;
	return `${url.slice(0, dotIndex + 1)}${ext}`;
}

/** Generate `<source>` data for a `<picture>` element from a URL and its available formats. */
export function getImageSources(
	url: string,
	formats?: string[]
): Array<{ srcset: string; type: string }> {
	if (!formats || formats.length === 0) return [];
	return formats
		.map((fmt) => {
			const type = mimeTypes[fmt];
			if (!type) return null;
			return { srcset: replaceExtension(url, fmt), type };
		})
		.filter((s): s is { srcset: string; type: string } => s !== null);
}
