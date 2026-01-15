import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projectArtifacts, projects } from '$lib/server/db/schema';
import { validateArtifactData } from '$lib/schemas/artifacts';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type ArtifactInput = {
	schema: string;
	dataBlob: unknown;
	isPublished?: boolean;
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

const fetchProjectOrThrow = async (
	db: ReturnType<App.Locals['db']>,
	projectId: number
) => {
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) {
		throw error(404, 'Project not found');
	}
	return project;
};

const parseArtifact = (payload: unknown) => {
	if (!payload || typeof payload !== 'object') {
		throw error(400, 'Invalid artifact payload');
	}
	const data = payload as ArtifactInput;
	if (typeof data.schema !== 'string' || data.schema.trim().length === 0) {
		throw error(400, 'schema must be a non-empty string');
	}
	if (data.dataBlob === undefined) {
		throw error(400, 'dataBlob is required');
	}
	let parsedBlob = data.dataBlob;
	if (typeof data.dataBlob === 'string') {
		try {
			parsedBlob = JSON.parse(data.dataBlob);
		} catch {
			throw error(400, 'dataBlob must be valid JSON');
		}
	}
	const schema = data.schema.trim();
	const validation = validateArtifactData(schema, parsedBlob);
	if (!validation.ok) {
		throw error(400, validation.errors.join('; '));
	}

	return {
		schema,
		dataBlob: validation.value,
		isPublished: data.isPublished ?? false
	};
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	const projectId = parseId(params.id);
	const project = await fetchProjectOrThrow(db, projectId);

	if (!userId && !authUserId && !project.isPublished) {
		throw error(404, 'Project not found');
	}

	const where = userId || authUserId
		? eq(projectArtifacts.projectId, projectId)
		: and(eq(projectArtifacts.projectId, projectId), eq(projectArtifacts.isPublished, true));

	const rows = await db
		.select({
			id: projectArtifacts.id,
			projectId: projectArtifacts.projectId,
			schema: projectArtifacts.schema,
			dataBlob: projectArtifacts.dataBlob,
			isPublished: projectArtifacts.isPublished
		})
		.from(projectArtifacts)
		.where(where);

	return json(rows, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const projectId = parseId(params.id);
	await fetchProjectOrThrow(db, projectId);
	const artifact = parseArtifact(await request.json());

	const [created] = await db
		.insert(projectArtifacts)
		.values({
			projectId,
			schema: artifact.schema,
			dataBlob: artifact.dataBlob,
			isPublished: artifact.isPublished
		})
		.returning();

	return json(created, { status: 201, headers: corsHeaders });
};
