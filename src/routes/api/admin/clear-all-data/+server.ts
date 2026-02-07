import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { error, json } from '@sveltejs/kit';
import { projects, categories, integrations, siteSettings, projectArtifacts } from '$lib/server/db/schema';
import { extractR2Keys, deleteR2Objects } from '$lib/server/r2';
import type { R2Bucket } from '@cloudflare/workers-types';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) {
		throw error(500, 'Database not available');
	}
	return db;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ locals, platform }) => {
	if (!dev && platform?.env?.ENVIRONMENT !== 'development') {
		throw error(403, 'This action is only allowed in development');
	}

	const db = getDbOrThrow(locals.db);

	// Collect R2 keys from all artifacts before deleting
	const artifactRows = await db
		.select({ dataBlob: projectArtifacts.dataBlob })
		.from(projectArtifacts);

	// Delete projects (cascades: artifacts, cover, attributes, project_categories, artifact_metadata)
	await db.delete(projects);

	// Delete remaining top-level tables
	await db.delete(categories);
	await db.delete(integrations);
	await db.delete(siteSettings);

	// Best-effort R2 cleanup
	const bucket = platform?.env?.ARTIFACTS as R2Bucket | undefined;
	if (bucket && artifactRows.length > 0) {
		const keys = artifactRows.flatMap((row) => extractR2Keys(row.dataBlob));
		await deleteR2Objects(bucket, keys);
	}

	return json({ success: true }, { headers: corsHeaders });
};
