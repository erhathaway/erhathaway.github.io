import { env } from '$env/dynamic/public';

const mimeTypes: Record<string, string> = {
	avif: 'image/avif',
	webp: 'image/webp',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif'
};

function isResizingEnabled(): boolean {
	try {
		return env.PUBLIC_CF_IMAGE_RESIZING === 'true';
	} catch {
		return false;
	}
}

/** Replace the file extension on a URL path. */
export function replaceExtension(url: string, ext: string): string {
	const dotIndex = url.lastIndexOf('.');
	if (dotIndex === -1) return `${url}.${ext}`;
	return `${url.slice(0, dotIndex + 1)}${ext}`;
}

/**
 * Build a responsive srcset string using Cloudflare Image Resizing.
 * Uses the WebP variant as source (smaller than PNG, supported by Image Resizing unlike AVIF)
 * and format=auto so Cloudflare serves AVIF or WebP based on the browser's Accept header.
 * Returns undefined when Image Resizing is disabled.
 */
export function getResponsiveSrcset(url: string, widths: number[] = [400, 800, 1200]): string | undefined {
	if (!isResizingEnabled()) return undefined;
	const webpPath = replaceExtension(url, 'webp');
	const path = webpPath.startsWith('/') ? webpPath.slice(1) : webpPath;
	return widths.map((w) => `/cdn-cgi/image/width=${w},quality=65,format=auto/${path} ${w}w`).join(', ');
}

/** Gallery tile sizes attribute (3-col desktop, 2-col mobile). */
export const GALLERY_SIZES = '(max-width: 899px) 50vw, 33vw';

/** Generate `<source>` data for a `<picture>` element from a URL and its available formats. */
export function getImageSources(
	url: string,
	formats?: string[],
	sizes?: string
): Array<{ srcset: string; type: string; sizes?: string }> {
	if (!formats || formats.length === 0) return [];
	const resizing = isResizingEnabled();
	return formats
		.map((fmt) => {
			const type = mimeTypes[fmt];
			if (!type) return null;
			const fmtUrl = replaceExtension(url, fmt);
			if (resizing && sizes) {
				// Use WebP as source, explicit format output for each <source> type
				const webpPath = replaceExtension(url, 'webp');
				const path = webpPath.startsWith('/') ? webpPath.slice(1) : webpPath;
				const srcset = [400, 800, 1200]
					.map((w) => `/cdn-cgi/image/width=${w},quality=65,format=${fmt}/${path} ${w}w`)
					.join(', ');
				return { srcset, type, sizes };
			}
			return { srcset: fmtUrl, type };
		})
		.filter((s): s is { srcset: string; type: string; sizes?: string } => s !== null);
}
