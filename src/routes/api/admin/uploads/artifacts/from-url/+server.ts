import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const mimeToExt: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif',
	'image/svg+xml': 'svg'
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const body = await request.json();
	const { url } = body as { url?: string };

	if (!url || typeof url !== 'string') {
		throw error(400, 'url is required');
	}

	// Only allow http/https
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw error(400, 'Invalid URL');
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw error(400, 'Only HTTP/HTTPS URLs are supported');
	}

	const bucket = platform?.env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	// Fetch the image server-side (no CORS restrictions)
	let imageResponse: Response;
	try {
		imageResponse = await fetch(url, {
			headers: {
				'Accept': 'image/*',
				'User-Agent': 'Mozilla/5.0 (compatible; ArtifactFetcher/1.0)'
			}
		});
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e; // re-throw SvelteKit errors
		throw error(502, 'Failed to connect to image URL');
	}

	if (!imageResponse.ok) {
		throw error(422, `Could not fetch image — remote server returned ${imageResponse.status}. The image may require authentication. Try saving the image first.`);
	}

	const contentType = imageResponse.headers.get('content-type')?.split(';')[0]?.trim() || '';
	if (!contentType.startsWith('image/')) {
		throw error(400, 'URL does not point to an image');
	}

	const imageBytes = await imageResponse.arrayBuffer();
	if (imageBytes.byteLength > MAX_SIZE) {
		throw error(400, 'Image exceeds 20 MB limit');
	}

	const ext = mimeToExt[contentType] || 'jpg';
	const key = `artifacts/${crypto.randomUUID()}.${ext}`;

	await bucket.put(key, imageBytes, {
		httpMetadata: { contentType }
	});

	return json({ key, url: `/${key}` });
};
