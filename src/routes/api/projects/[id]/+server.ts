import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projects, projectArtifacts, projectCoverArtifact, categories, projectCategories, projectAttributes } from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type ProjectInput = {
	name: string;
	displayName: string;
	description: string;
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

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	const isAuthed = !!(userId || authUserId);
	const id = parseId(params.id);

	const where = isAuthed
		? eq(projects.id, id)
		: and(eq(projects.id, id), eq(projects.isPublished, true));

	const [row] = await db
		.select({
			id: projects.id,
			name: projects.name,
			displayName: projects.displayName,
			description: projects.description,
			isPublished: projects.isPublished,
			coverArtifactDataBlob: projectArtifacts.dataBlob
		})
		.from(projects)
		.leftJoin(projectCoverArtifact, eq(projects.id, projectCoverArtifact.projectId))
		.leftJoin(projectArtifacts, eq(projectCoverArtifact.artifactId, projectArtifacts.id))
		.where(where);

	if (!row) {
		throw error(404, 'Project not found');
	}

	const [catRows, attrRows] = await Promise.all([
		db
			.select({
				categoryName: categories.displayName
			})
			.from(projectCategories)
			.innerJoin(categories, eq(projectCategories.categoryId, categories.id))
			.where(isAuthed
				? eq(projectCategories.projectId, id)
				: and(eq(projectCategories.projectId, id), eq(categories.isPublished, true))
			),
		db
			.select({
				name: projectAttributes.name,
				value: projectAttributes.value
			})
			.from(projectAttributes)
			.where(isAuthed
				? and(eq(projectAttributes.projectId, id), eq(projectAttributes.showInNav, true))
				: and(eq(projectAttributes.projectId, id), eq(projectAttributes.showInNav, true), eq(projectAttributes.isPublished, true))
			)
	]);

	let coverImageUrl: string | null = null;
	if (row.coverArtifactDataBlob) {
		const blob = typeof row.coverArtifactDataBlob === 'string'
			? JSON.parse(row.coverArtifactDataBlob)
			: row.coverArtifactDataBlob;
		coverImageUrl = blob?.imageUrl ?? null;
	}

	return json({
		id: row.id,
		name: row.name,
		displayName: row.displayName,
		description: row.description,
		isPublished: row.isPublished,
		coverImageUrl,
		categories: catRows.map((r) => r.categoryName),
		navAttributes: attrRows.map((r) => ({ name: r.name, value: r.value }))
	}, { headers: corsHeaders });
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const id = parseId(params.id);
	const payload = (await request.json()) as Partial<ProjectInput>;
	const name = payload.name?.trim();
	const displayName = payload.displayName?.trim() || name;
	const description = payload.description?.trim() || null;
	const isPublished = payload.isPublished;

	if (!name) {
		throw error(400, 'name is required');
	}

	const [updated] = await db
		.update(projects)
		.set({
			name,
			displayName,
			description,
			isPublished: isPublished ?? false
		})
		.where(eq(projects.id, id))
		.returning();

	if (!updated) {
		throw error(404, 'Project not found');
	}

	return json(updated, { headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const id = parseId(params.id);
	const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();

	if (!deleted) {
		throw error(404, 'Project not found');
	}

	return json({ success: true }, { headers: corsHeaders });
};
