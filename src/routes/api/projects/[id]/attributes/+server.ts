import type { RequestHandler } from './$types';
import { and, eq, inArray } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projectAttributes, projects } from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type AttributeInput = {
	id?: number;
	name: string;
	value: string;
	showInNav?: boolean;
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

const parseAttributes = (payload: unknown) => {
	if (!payload || typeof payload !== 'object' || !('attributes' in payload)) {
		throw error(400, 'attributes is required');
	}
	const raw = (payload as { attributes: unknown }).attributes;
	if (!Array.isArray(raw)) {
		throw error(400, 'attributes must be an array');
	}

	return raw.map((entry) => {
		if (!entry || typeof entry !== 'object') {
			throw error(400, 'attributes must be objects');
		}
		const data = entry as AttributeInput;
		const name = data.name?.trim();
		const value = data.value?.trim();
		if (!name) {
			throw error(400, 'attribute name is required');
		}
		if (!value) {
			throw error(400, 'attribute value is required');
		}
		const id = data.id;
		if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
			throw error(400, 'attribute id must be a positive integer');
		}
		return {
			id,
			name,
			value,
			showInNav: data.showInNav ?? false,
			isPublished: data.isPublished ?? false
		};
	});
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
		? eq(projectAttributes.projectId, projectId)
		: and(eq(projectAttributes.projectId, projectId), eq(projectAttributes.isPublished, true));

	const rows = await db
		.select({
			id: projectAttributes.id,
			name: projectAttributes.name,
			value: projectAttributes.value,
			showInNav: projectAttributes.showInNav,
			isPublished: projectAttributes.isPublished
		})
		.from(projectAttributes)
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
	const attributes = parseAttributes(await request.json());

	if (attributes.length === 0) {
		return json([], { status: 201, headers: corsHeaders });
	}

	const created = await db
		.insert(projectAttributes)
		.values(
			attributes.map((attribute) => ({
				projectId,
				name: attribute.name,
				value: attribute.value,
				showInNav: attribute.showInNav,
				isPublished: attribute.isPublished
			}))
		)
		.returning();

	return json(created, { status: 201, headers: corsHeaders });
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const projectId = parseId(params.id);
	await fetchProjectOrThrow(db, projectId);

	const attributes = parseAttributes(await request.json());
	const existing = await db
		.select({ id: projectAttributes.id })
		.from(projectAttributes)
		.where(eq(projectAttributes.projectId, projectId));
	const existingIds = existing.map((row) => row.id);

	const updates = attributes.filter((attr) => attr.id && existingIds.includes(attr.id));
	const inserts = attributes.filter((attr) => !attr.id);
	const keepIds = updates.map((attr) => attr.id as number);
	const toDelete = existingIds.filter((id) => !keepIds.includes(id));

	for (const attr of updates) {
		await db
			.update(projectAttributes)
			.set({
				name: attr.name,
				value: attr.value,
				showInNav: attr.showInNav,
				isPublished: attr.isPublished
			})
			.where(and(eq(projectAttributes.id, attr.id as number), eq(projectAttributes.projectId, projectId)));
	}

	if (inserts.length > 0) {
		await db.insert(projectAttributes).values(
			inserts.map((attr) => ({
				projectId,
				name: attr.name,
				value: attr.value,
				showInNav: attr.showInNav,
				isPublished: attr.isPublished
			}))
		);
	}

	if (toDelete.length > 0) {
		await db
			.delete(projectAttributes)
			.where(and(eq(projectAttributes.projectId, projectId), inArray(projectAttributes.id, toDelete)));
	}

	const rows = await db
		.select({
			id: projectAttributes.id,
			name: projectAttributes.name,
			value: projectAttributes.value,
			showInNav: projectAttributes.showInNav,
			isPublished: projectAttributes.isPublished
		})
		.from(projectAttributes)
		.where(eq(projectAttributes.projectId, projectId));

	return json(rows, { headers: corsHeaders });
};
