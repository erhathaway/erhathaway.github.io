import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, platform }) => {
	const key = `artifacts/${params.path}`;
	if (!key) {
		throw error(400, 'Missing path');
	}

	const bucket = platform?.env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	const object = await bucket.get(key);
	if (!object) {
		throw error(404, 'Not found');
	}

	const headers = new Headers();
	if (object.httpMetadata?.contentType) {
		headers.set('Content-Type', object.httpMetadata.contentType);
	}
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(object.body, { status: 200, headers });
};
