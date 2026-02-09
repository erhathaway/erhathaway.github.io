import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';
import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { projectArtifacts, artifactMetadata } from '$lib/server/db/schema';
import {
	getValidAccessToken,
	downloadMedia,
	extractMetadata,
	mimeToExtension,
	type PickedMediaItem
} from '$lib/server/integrations/google-photos';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET || !env?.GOOGLE_TOKEN_ENCRYPTION_KEY) {
		throw error(500, 'Google integration not configured');
	}

	const bucket = env?.ARTIFACTS as R2Bucket | undefined;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	const db = env?.DB
		? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database)
		: null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = await request.json();
	const { projectId, item, isPublished = false, skipDescription = false } = body as {
		projectId: number;
		item: PickedMediaItem;
		isPublished?: boolean;
		skipDescription?: boolean;
	};

	if (!projectId || !item?.mediaFile?.baseUrl) {
		throw error(400, 'projectId and item with mediaFile.baseUrl are required');
	}

	// Validate baseUrl is a Google domain
	try {
		const url = new URL(item.mediaFile.baseUrl);
		if (!url.hostname.endsWith('.googleusercontent.com') && !url.hostname.endsWith('.google.com')) {
			throw error(400, 'Invalid media URL');
		}
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(400, 'Invalid media URL');
	}

	if (item.type === 'VIDEO') {
		throw error(400, 'Video items are not yet supported');
	}

	const accessToken = await getValidAccessToken(db, {
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GOOGLE_TOKEN_ENCRYPTION_KEY: env.GOOGLE_TOKEN_ENCRYPTION_KEY
	});

	const mediaResponse = await downloadMedia(accessToken, item.mediaFile.baseUrl, 'PHOTO', 4096);

	if (!mediaResponse.body) {
		throw error(502, 'Empty response from Google Photos');
	}

	const contentType =
		item.mediaFile.mimeType ||
		mediaResponse.headers.get('Content-Type') ||
		'application/octet-stream';

	const ext = mimeToExtension(contentType);
	const key = `artifacts/${crypto.randomUUID()}.${ext}`;
	// Buffer into ArrayBuffer — local R2 (miniflare) requires a known length,
	// and ReadableStream from Google Photos doesn't provide Content-Length.
	// Single 4096px images are ~5-15MB, well within the 128MB Worker limit.
	const imageBytes = await mediaResponse.arrayBuffer();
	await bucket.put(key, imageBytes, {
		httpMetadata: { contentType }
	});
	const mediaUrl = `/${key}`;

	const schema = 'image-v1';
	const dataBlob: Record<string, unknown> = {
		imageUrl: mediaUrl
	};
	if (!skipDescription) {
		dataBlob.description = item.mediaFile.filename || undefined;
	}

	const [artifact] = await db
		.insert(projectArtifacts)
		.values({
			projectId,
			schema,
			dataBlob,
			isPublished
		})
		.returning();

	const metadata = extractMetadata(item);
	await db.insert(artifactMetadata).values({
		artifactId: artifact.id,
		metadata,
		source: 'google-photos'
	});

	return json(
		{
			artifact: {
				id: artifact.id,
				schema: artifact.schema,
				dataBlob: artifact.dataBlob,
				isPublished: artifact.isPublished,
				// Pass R2 key so the client can trigger format transform separately
				r2Key: key
			}
		},
		{ headers: corsHeaders }
	);
};
