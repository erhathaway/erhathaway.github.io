import type { ImagesBinding, R2Bucket } from '@cloudflare/workers-types';

export type TransformResult =
	| { ok: true; avifKey: string; webpKey: string; formats: string[] }
	| { ok: false; reason: string };

/** Transform private R2 bytes directly; never expose an unpublished source through a URL/cache. */
export async function transformToModernFormats(
	bucket: R2Bucket,
	originalKey: string,
	images: ImagesBinding | undefined,
	preserveOriginal = false
): Promise<TransformResult> {
	const match = originalKey.match(/^artifacts\/([a-zA-Z0-9_-]+)\.([a-zA-Z0-9]+)$/);
	if (!match) return { ok: false, reason: 'Invalid artifact key' };
	if (!images) return { ok: false, reason: 'Image optimization is not configured' };
	const [, uuid, ext] = match;
	try {
		const source = await bucket.get(originalKey);
		if (!source) return { ok: false, reason: 'Source image not found' };
		const [avifInput, webpInput] = source.body.tee();
		const [avif, webp] = await Promise.all([
			images.input(avifInput).output({ format: 'image/avif', quality: 80 }),
			images.input(webpInput).output({ format: 'image/webp', quality: 80 })
		]);
		const avifKey = `artifacts/${uuid}.avif`;
		const webpKey = `artifacts/${uuid}.webp`;
		await bucket.put(avifKey, await avif.response().arrayBuffer(), { httpMetadata: { contentType: 'image/avif' } });
		await bucket.put(webpKey, await webp.response().arrayBuffer(), { httpMetadata: { contentType: 'image/webp' } });
		if (!preserveOriginal && ext !== 'avif' && ext !== 'webp') {
			try { await bucket.delete(originalKey); } catch { /* Best-effort cleanup. */ }
		}
		return { ok: true, avifKey, webpKey, formats: ['avif', 'webp'] };
	} catch {
		return { ok: false, reason: 'Image optimization failed; the original image has been kept.' };
	}
}
