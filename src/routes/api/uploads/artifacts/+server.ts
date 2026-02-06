import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getBucketOrThrow = (env: App.Platform['env'] | undefined) => {
	const bucket = env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}
	return bucket;
};

const getExtension = (file: File) => {
	const name = file.name || '';
	const dot = name.lastIndexOf('.');
	if (dot > -1 && dot < name.length - 1) {
		return name.slice(dot + 1).toLowerCase();
	}
	const type = file.type.toLowerCase();
	if (type === 'image/jpeg') return 'jpg';
	if (type === 'image/png') return 'png';
	if (type === 'image/webp') return 'webp';
	if (type === 'image/gif') return 'gif';
	return 'bin';
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

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		throw error(400, 'file is required');
	}

	const bucket = getBucketOrThrow(platform?.env);
	const extension = getExtension(file);
	const key = `artifacts/${crypto.randomUUID()}.${extension}`;

	const body = await file.arrayBuffer();
	await bucket.put(key, body, {
		httpMetadata: {
			contentType: file.type || undefined
		}
	});

	const url = `/${key}`;

	return json(
		{
			key,
			url
		},
		{ headers: corsHeaders }
	);
};
