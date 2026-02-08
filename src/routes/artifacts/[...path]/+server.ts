import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, sql, and } from 'drizzle-orm';
import { projectArtifacts, projects } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const path = params.path;
	if (!path) {
		throw error(400, 'Missing path');
	}

	const key = `artifacts/${path}`;
	const url = `/${key}`;

	const bucket = platform?.env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	// If no authenticated user, verify the artifact is published and belongs to a published project
	const userId = locals.auth?.()?.userId;
	if (!userId) {
		const db = platform?.env?.DB ? getDb(platform.env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const result = await db
			.select({ id: projectArtifacts.id })
			.from(projectArtifacts)
			.innerJoin(projects, eq(projectArtifacts.projectId, projects.id))
			.where(
				and(
					sql`(json_extract(${projectArtifacts.dataBlob}, '$.imageUrl') = ${url} OR json_extract(${projectArtifacts.dataBlob}, '$.hoverImageUrl') = ${url})`,
					eq(projectArtifacts.isPublished, true),
					eq(projects.isPublished, true)
				)
			)
			.limit(1)
			.all();

		if (result.length === 0) {
			throw error(404, 'Not found');
		}
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
