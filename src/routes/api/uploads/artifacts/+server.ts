import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getBucketOrThrow = (env: App.Platform['env'] | undefined) => {
	const bucket = env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}
	return bucket;
};

const getPublicBaseUrlOrThrow = (env: App.Platform['env'] | undefined) => {
	const baseUrl = env?.PUBLIC_R2_BASE_URL;
	if (!baseUrl) {
		throw error(500, 'PUBLIC_R2_BASE_URL is not configured');
	}
	return baseUrl.replace(/\/$/, '');
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
	const baseUrl = getPublicBaseUrlOrThrow(platform?.env);
	const extension = getExtension(file);
	const key = `artifacts/${crypto.randomUUID()}.${extension}`;

	const body = await file.arrayBuffer();
	await bucket.put(key, body, {
		httpMetadata: {
			contentType: file.type || undefined
		}
	});

	return json(
		{
			key,
			url: `${baseUrl}/${key}`
		},
		{ headers: corsHeaders }
	);
};
