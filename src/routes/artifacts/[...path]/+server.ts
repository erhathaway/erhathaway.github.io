import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { projectArtifacts, projects, siteSettings } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth';
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

	// Resizing requests must pass the same publication check as every other visitor.
	// A Via header is caller-controlled and is never an authorization credential.
	const owner = isAdmin(locals, platform?.env);
	if (!owner) {
		const db = platform?.env?.DB ? getDb(platform.env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
		if (!db) {
			throw error(500, 'Database not available');
		}

		// Extract UUID from filename to match format variants (e.g. .avif URL when imageUrl is .avif, .webp variant)
		const uuidMatch = path.match(/^([0-9a-f-]+)\.\w+$/);
		const uuidPattern = uuidMatch ? `/artifacts/${uuidMatch[1]}.%` : null;

		// Check project artifacts first
		const artifactResult = await db
			.select({ id: projectArtifacts.id })
			.from(projectArtifacts)
			.innerJoin(projects, eq(projectArtifacts.projectId, projects.id))
			.where(
				and(
					uuidPattern
						? sql`(json_extract(${projectArtifacts.dataBlob}, '$.imageUrl') = ${url} OR json_extract(${projectArtifacts.dataBlob}, '$.hoverImageUrl') = ${url} OR json_extract(${projectArtifacts.dataBlob}, '$.imageUrl') LIKE ${uuidPattern} OR json_extract(${projectArtifacts.dataBlob}, '$.hoverImageUrl') LIKE ${uuidPattern})`
						: sql`(json_extract(${projectArtifacts.dataBlob}, '$.imageUrl') = ${url} OR json_extract(${projectArtifacts.dataBlob}, '$.hoverImageUrl') = ${url})`,
					eq(projectArtifacts.isPublished, true),
					eq(projects.isPublished, true)
				)
			)
			.limit(1)
			.all();

		if (artifactResult.length === 0) {
			// Also check site_settings (namecard images are public but not in project_artifacts)
			const settingResult = await db
				.select({ key: siteSettings.key })
				.from(siteSettings)
				.where(and(
					inArray(siteSettings.key, ['namecard_image', 'project_namecard_image']),
					uuidPattern
						? sql`(json_extract(${siteSettings.value}, '$.imageUrl') = ${url} OR json_extract(${siteSettings.value}, '$.imageUrl') LIKE ${uuidPattern})`
						: sql`json_extract(${siteSettings.value}, '$.imageUrl') = ${url}`
				))
				.limit(1)
				.all();

			if (settingResult.length === 0) {
				throw error(404, 'Not found');
			}
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
	headers.set('Cache-Control', owner ? 'private, no-store' : 'public, max-age=0, must-revalidate');
	headers.set('Vary', 'Cookie, Authorization');
	headers.set('X-Content-Type-Options', 'nosniff');

	return new Response(object.body as unknown as BodyInit, { status: 200, headers });
};
