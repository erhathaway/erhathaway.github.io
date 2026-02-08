import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { projectArtifacts } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { transformToModernFormats } from '$lib/server/image-transform';

export const POST: RequestHandler = async ({ request, platform }) => {
	const bucket = platform?.env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	const db = platform?.env?.DB
		? getDb(platform.env.DB as unknown as import('@cloudflare/workers-types').D1Database)
		: null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = await request.json();
	const { r2Key, artifactId, field } = body as {
		r2Key?: string;
		artifactId?: number;
		field?: 'imageUrl' | 'hoverImageUrl';
	};

	if (!r2Key || typeof r2Key !== 'string') {
		throw error(400, 'r2Key is required');
	}
	if (!artifactId || typeof artifactId !== 'number') {
		throw error(400, 'artifactId is required');
	}
	if (field !== 'imageUrl' && field !== 'hoverImageUrl') {
		throw error(400, 'field must be imageUrl or hoverImageUrl');
	}

	const origin = new URL(request.url).origin;
	const result = await transformToModernFormats(bucket, r2Key, origin);

	if (!result.ok) {
		throw error(500, result.reason);
	}

	// Update the artifact's dataBlob in D1
	const [artifact] = await db
		.select({ dataBlob: projectArtifacts.dataBlob })
		.from(projectArtifacts)
		.where(eq(projectArtifacts.id, artifactId))
		.limit(1)
		.all();

	if (!artifact) {
		throw error(404, 'Artifact not found');
	}

	const blob =
		typeof artifact.dataBlob === 'string'
			? JSON.parse(artifact.dataBlob)
			: (artifact.dataBlob ?? {});

	const newUrl = `/${result.avifKey}`;
	const formatsField = field === 'imageUrl' ? 'imageFormats' : 'hoverImageFormats';

	blob[field] = newUrl;
	blob[formatsField] = result.formats;

	await db
		.update(projectArtifacts)
		.set({ dataBlob: JSON.stringify(blob) })
		.where(eq(projectArtifacts.id, artifactId))
		.run();

	return json({ success: true, newUrl, formats: result.formats });
};
