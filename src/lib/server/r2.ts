import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * Extract R2 keys from a dataBlob by finding string values that look like artifact URLs.
 * Handles `/artifacts/...` paths and full URLs with `/artifacts/` in the pathname.
 * Also generates keys for format variants (e.g. if imageFormats: ['avif', 'webp'] exists).
 */
export function extractR2Keys(dataBlob: unknown): string[] {
	const keys: string[] = [];

	function walk(value: unknown) {
		if (typeof value === 'string') {
			const key = extractR2Key(value);
			if (key) keys.push(key);
		} else if (Array.isArray(value)) {
			for (const item of value) walk(item);
		} else if (value && typeof value === 'object') {
			for (const v of Object.values(value)) walk(v);
		}
	}

	walk(dataBlob);

	// Generate format-variant keys from URL fields + their associated formats arrays
	if (dataBlob && typeof dataBlob === 'object') {
		const blob = dataBlob as Record<string, unknown>;
		addFormatVariantKeys(keys, blob.imageUrl, blob.imageFormats);
		addFormatVariantKeys(keys, blob.hoverImageUrl, blob.hoverImageFormats);
	}

	// Deduplicate
	return [...new Set(keys)];
}

function addFormatVariantKeys(keys: string[], url: unknown, formats: unknown): void {
	if (typeof url !== 'string' || !Array.isArray(formats)) return;
	const key = extractR2Key(url);
	if (!key) return;
	const dotIndex = key.lastIndexOf('.');
	if (dotIndex === -1) return;
	const base = key.slice(0, dotIndex + 1);
	for (const fmt of formats) {
		if (typeof fmt === 'string') {
			keys.push(`${base}${fmt}`);
		}
	}
}

function extractR2Key(url: string): string | null {
	if (url.startsWith('/artifacts/')) {
		return url.slice(1);
	}
	try {
		const parsed = new URL(url, 'http://localhost');
		if (parsed.pathname.startsWith('/artifacts/')) {
			return parsed.pathname.slice(1);
		}
		if (parsed.pathname === '/api/uploads/artifacts') {
			return parsed.searchParams.get('key');
		}
	} catch {
		/* ignore */
	}
	return null;
}

/** Best-effort deletion of R2 objects. Never throws. */
export async function deleteR2Objects(bucket: R2Bucket, keys: string[]): Promise<void> {
	if (keys.length === 0) return;
	try {
		await bucket.delete(keys);
	} catch {
		// Best-effort: DB is the source of truth
	}
}
