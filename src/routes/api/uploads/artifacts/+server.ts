import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

const getBucketOrThrow = (env: App.Platform['env'] | undefined) => {
	const bucket = env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}
	return bucket;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const key = url.searchParams.get('key');
	if (!key) {
		throw error(400, 'key is required');
	}

	const bucket = getBucketOrThrow(platform?.env);
	const object = await bucket.get(key);
	if (!object) {
		throw error(404, 'Object not found');
	}

	const headers = new Headers();
	if (object.httpMetadata?.contentType) {
		headers.set('Content-Type', object.httpMetadata.contentType);
	}
	return new Response(object.body, { status: 200, headers });
};
