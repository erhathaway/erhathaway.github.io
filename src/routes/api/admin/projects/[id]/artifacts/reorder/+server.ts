import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { projectArtifacts, projects } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'PUT, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
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

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);

	// Verify project exists
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) {
		throw error(404, 'Project not found');
	}

	const body = await request.json();
	const ids: number[] = body.ids;

	if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'number')) {
		throw error(400, 'ids must be an array of numbers');
	}

	for (let i = 0; i < ids.length; i++) {
		await db
			.update(projectArtifacts)
			.set({ sortOrder: i })
			.where(
				and(
					eq(projectArtifacts.id, ids[i]),
					eq(projectArtifacts.projectId, projectId)
				)
			);
	}

	return json({ ok: true }, { headers: corsHeaders });
};
