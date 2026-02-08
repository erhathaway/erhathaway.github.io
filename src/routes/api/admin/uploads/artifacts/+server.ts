import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { transformToModernFormats } from '$lib/server/image-transform';

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

export const POST: RequestHandler = async ({ request, platform }) => {
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

	// Attempt to transform to AVIF + WebP (no-op in local dev)
	const origin = new URL(request.url).origin;
	const result = await transformToModernFormats(bucket, key, origin);
	if (result.ok) {
		return json(
			{ key: result.avifKey, url: `/${result.avifKey}`, formats: result.formats },
			{ headers: corsHeaders }
		);
	}

	return json(
		{ key, url: `/${key}` },
		{ headers: corsHeaders }
	);
};
