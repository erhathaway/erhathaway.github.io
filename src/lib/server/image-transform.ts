import type { R2Bucket } from '@cloudflare/workers-types';

export type TransformResult =
	| { ok: true; avifKey: string; webpKey: string; formats: string[] }
	| { ok: false; reason: string };

/**
 * Transform an image in R2 to AVIF and WebP using Cloudflare Image Resizing.
 * Returns a result with the new keys on success, or a reason string on failure.
 */
export async function transformToModernFormats(
	bucket: R2Bucket,
	originalKey: string,
	origin: string
): Promise<TransformResult> {
	// Extract UUID from key: artifacts/{uuid}.{ext}
	const match = originalKey.match(/^artifacts\/([^.]+)\.(.+)$/);
	if (!match) {
		return { ok: false, reason: `Key "${originalKey}" does not match expected pattern artifacts/{uuid}.{ext}` };
	}

	const [, uuid, ext] = match;
	const url = `${origin}/${originalKey}`;

	let avifRes: Response;
	let webpRes: Response;
	try {
		[avifRes, webpRes] = await Promise.all([
			fetch(url, { cf: { image: { format: 'avif', quality: 80 } } } as RequestInit),
			fetch(url, { cf: { image: { format: 'webp', quality: 80 } } } as RequestInit)
		]);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, reason: `cf.image fetch failed: ${msg}. Cloudflare Image Resizing is only available on deployed Workers, not in local dev (wrangler dev).` };
	}

	if (!avifRes.ok || !webpRes.ok) {
		const details = [];
		if (!avifRes.ok) details.push(`AVIF: ${avifRes.status} ${avifRes.statusText}`);
		if (!webpRes.ok) details.push(`WebP: ${webpRes.status} ${webpRes.statusText}`);
		return { ok: false, reason: `Image Resizing returned errors: ${details.join(', ')}. Source URL: ${url}` };
	}

	// Check content types to verify we got actual transformed images
	const avifCt = avifRes.headers.get('content-type') ?? '';
	const webpCt = webpRes.headers.get('content-type') ?? '';
	if (!avifCt.includes('avif') && !avifCt.includes('octet')) {
		// Image Resizing may not be enabled — response is probably the original HTML/image
		return { ok: false, reason: `AVIF response has unexpected content-type "${avifCt}". Image Resizing may not be enabled for this zone.` };
	}

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

	return { ok: true, avifKey, webpKey, formats: ['avif', 'webp'] };
}
