import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { projectArtifacts, artifactMetadata } from '$lib/server/db/schema';
import {
	getValidAccessToken,
	listAllPickedMediaItems,
	downloadMedia,
	downloadThumbnail,
	deletePickerSession,
	extractMetadata,
	mimeToExtension,
	type PickedMediaItem
} from '$lib/server/integrations/google-photos';
import { stripExif } from '$lib/server/integrations/exif-strip';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

type ImportResult = {
	id: number;
	schema: string;
	dataBlob: unknown;
	isPublished: boolean;
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

	const bucket = env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = await request.json();
	const { projectId, sessionId, isPublished = false } = body as {
		projectId: number;
		sessionId: string;
		isPublished?: boolean;
	};

	if (!projectId || !sessionId) {
		throw error(400, 'projectId and sessionId are required');
	}

	const accessToken = await getValidAccessToken(db, {
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GOOGLE_TOKEN_ENCRYPTION_KEY: env.GOOGLE_TOKEN_ENCRYPTION_KEY
	});

	// List all selected media items
	const items = await listAllPickedMediaItems(accessToken, sessionId);
	console.log(`[google-photos-import] Found ${items.length} items to import for project ${projectId}`);

	const baseUrl = env.PUBLIC_R2_BASE_URL?.replace(/\/$/, '');
	const created: ImportResult[] = [];
	const errors: Array<{ filename: string; error: string }> = [];

	for (const item of items) {
		try {
			const result = await importSingleItem(
				item,
				accessToken,
				projectId,
				isPublished,
				bucket,
				db,
				baseUrl
			);
			created.push(result);
		} catch (err) {
			console.error(`Failed to import ${item.mediaFile.filename}:`, err);
			errors.push({
				filename: item.mediaFile.filename,
				error: err instanceof Error ? err.message : 'Import failed'
			});
		}
	}

	// Clean up the picker session
	try {
		await deletePickerSession(accessToken, sessionId);
	} catch {
		// Non-critical cleanup failure
	}

	console.log(`[google-photos-import] Done: ${created.length} created, ${errors.length} errors`);
	if (errors.length > 0) console.log('[google-photos-import] Errors:', JSON.stringify(errors));
	return json({ created, errors }, { headers: corsHeaders });
};

async function importSingleItem(
	item: PickedMediaItem,
	accessToken: string,
	projectId: number,
	isPublished: boolean,
	bucket: R2Bucket,
	db: ReturnType<typeof getDb>,
	r2BaseUrl: string | undefined
): Promise<ImportResult> {
	const isVideo = item.type === 'VIDEO';

	// Skip videos that aren't ready
	if (isVideo && item.mediaFile.mediaFileMetadata.videoMetadata?.processingStatus !== 'READY') {
		throw new Error('Video is still processing');
	}

	// Download the media
	const mediaResponse = await downloadMedia(
		accessToken,
		item.mediaFile.baseUrl,
		isVideo ? 'VIDEO' : 'PHOTO'
	);
	let mediaBytes = await mediaResponse.arrayBuffer();

	// Strip EXIF from images
	const contentType = item.mediaFile.mimeType || mediaResponse.headers.get('Content-Type') || 'application/octet-stream';
	if (!isVideo) {
		mediaBytes = stripExif(mediaBytes, contentType);
	}

	// Upload to R2
	const ext = mimeToExtension(contentType);
	const key = `artifacts/${crypto.randomUUID()}.${ext}`;
	await bucket.put(key, mediaBytes, {
		httpMetadata: { contentType }
	});
	const mediaUrl = r2BaseUrl ? `${r2BaseUrl}/${key}` : `/api/uploads/artifacts?key=${encodeURIComponent(key)}`;

	// For videos, also download and upload a thumbnail
	let thumbnailUrl: string | undefined;
	if (isVideo) {
		try {
			const thumbResponse = await downloadThumbnail(accessToken, item.mediaFile.baseUrl);
			const thumbBytes = await thumbResponse.arrayBuffer();
			const thumbKey = `artifacts/${crypto.randomUUID()}.jpg`;
			await bucket.put(thumbKey, thumbBytes, {
				httpMetadata: { contentType: 'image/jpeg' }
			});
			thumbnailUrl = r2BaseUrl ? `${r2BaseUrl}/${thumbKey}` : `/api/uploads/artifacts?key=${encodeURIComponent(thumbKey)}`;
		} catch {
			// Thumbnail is optional, continue without it
		}
	}

	// Build artifact data
	const schema = isVideo ? 'video-v1' : 'image-v1';
	const dataBlob = isVideo
		? {
				videoUrl: mediaUrl,
				thumbnailUrl,
				description: item.mediaFile.filename || undefined
			}
		: {
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

	return {
		id: artifact.id,
		schema: artifact.schema,
		dataBlob: artifact.dataBlob,
		isPublished: artifact.isPublished
	};
}
