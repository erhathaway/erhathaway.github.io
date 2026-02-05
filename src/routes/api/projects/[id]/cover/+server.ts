import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projects, projectCoverArtifact } from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) {
		throw error(500, 'Database not available');
	}
	return db;
};

const parseId = (raw: string) => {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, 'Invalid project id');
	}
	return id;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);

	const [row] = await db
		.select()
		.from(projectCoverArtifact)
		.where(eq(projectCoverArtifact.projectId, projectId));

	return json(
		{ projectId, artifactId: row?.artifactId ?? null },
		{ headers: corsHeaders }
	);
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const projectId = parseId(params.id);

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) {
		throw error(404, 'Project not found');
	}

	const body = await request.json();
	const artifactId = Number(body.artifactId);
	if (!Number.isInteger(artifactId) || artifactId <= 0) {
		throw error(400, 'artifactId must be a positive integer');
	}

	// Delete any existing cover for this project, then insert the new one.
	// The unique constraint on project_id ensures only one cover per project.
	await db
		.delete(projectCoverArtifact)
		.where(eq(projectCoverArtifact.projectId, projectId));

	await db
		.insert(projectCoverArtifact)
		.values({ projectId, artifactId });

	return json({ projectId, artifactId }, { headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const projectId = parseId(params.id);

	await db
		.delete(projectCoverArtifact)
		.where(eq(projectCoverArtifact.projectId, projectId));

	return json({ success: true }, { headers: corsHeaders });
};
