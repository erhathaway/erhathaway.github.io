import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * Transform an image in R2 to AVIF and WebP using Cloudflare Image Resizing.
 * Returns the new keys and formats on success, or null if transformation fails
 * (e.g. in local dev where cf.image isn't available).
 */
export async function transformToModernFormats(
	bucket: R2Bucket,
	originalKey: string,
	origin: string
): Promise<{ avifKey: string; webpKey: string; formats: string[] } | null> {
	// Extract UUID from key: artifacts/{uuid}.{ext}
	const match = originalKey.match(/^artifacts\/([^.]+)\.(.+)$/);
	if (!match) return null;

	const [, uuid, ext] = match;
	const url = `${origin}/${originalKey}`;

	try {
		// Fetch AVIF and WebP variants in parallel
		const [avifRes, webpRes] = await Promise.all([
			fetch(url, { cf: { image: { format: 'avif', quality: 80 } } } as RequestInit),
			fetch(url, { cf: { image: { format: 'webp', quality: 80 } } } as RequestInit)
		]);

		if (!avifRes.ok || !webpRes.ok) return null;

		const avifKey = `artifacts/${uuid}.avif`;
		const webpKey = `artifacts/${uuid}.webp`;

		const [avifBody, webpBody] = await Promise.all([
			avifRes.arrayBuffer(),
			webpRes.arrayBuffer()
		]);

		// Store both variants
		await Promise.all([
			bucket.put(avifKey, avifBody, { httpMetadata: { contentType: 'image/avif' } }),
			bucket.put(webpKey, webpBody, { httpMetadata: { contentType: 'image/webp' } })
		]);

		// Delete original if it's not already avif or webp
		if (ext !== 'avif' && ext !== 'webp') {
			try {
				await bucket.delete(originalKey);
			} catch {
				// best-effort
			}
		}

		return { avifKey, webpKey, formats: ['avif', 'webp'] };
	} catch {
		// cf.image not available (local dev) or other failure
		return null;
	}
}
