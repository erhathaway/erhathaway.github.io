import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
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

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

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
	const { projectId, item, isPublished = false } = body as {
		projectId: number;
		item: PickedMediaItem;
		isPublished?: boolean;
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
		if (e && typeof e === 'object' && 'status' in e) throw e; // re-throw SvelteKit errors
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

	// Download with 4K max dimension — Google strips EXIF server-side for sized downloads
	const mediaResponse = await downloadMedia(accessToken, item.mediaFile.baseUrl, 'PHOTO', 4096);

	const contentType =
		item.mediaFile.mimeType ||
		mediaResponse.headers.get('Content-Type') ||
		'application/octet-stream';

	// R2 requires known content length for streams; buffer the sized download (~1-5 MB with =w4096-h4096).
	// This is safe: no EXIF stripping needed so no second copy, and sized images are well under 128 MB.
	const ext = mimeToExtension(contentType);
	const key = `artifacts/${crypto.randomUUID()}.${ext}`;
	const mediaBytes = await mediaResponse.arrayBuffer();
	await bucket.put(key, mediaBytes, {
		httpMetadata: { contentType }
	});
	const mediaUrl = `/${key}`;

	// Build artifact data
	const schema = 'image-v1';
	const dataBlob = {
		imageUrl: mediaUrl,
		description: item.mediaFile.filename || undefined
	};

	// Create artifact
	const [artifact] = await db
		.insert(projectArtifacts)
		.values({
			projectId,
			schema,
			dataBlob,
			isPublished
		})
		.returning();

	// Store metadata
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
				isPublished: artifact.isPublished
			}
		},
		{ headers: corsHeaders }
	);
};
