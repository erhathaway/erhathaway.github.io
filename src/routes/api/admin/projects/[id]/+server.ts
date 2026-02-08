import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projects, projectArtifacts, projectCoverArtifact, categories, projectCategories, projectAttributes } from '$lib/server/db/schema';
import { extractR2Keys, deleteR2Objects } from '$lib/server/r2';
import type { R2Bucket } from '@cloudflare/workers-types';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type ProjectInput = {
	name: string;
	displayName: string;
	description: string;
	isPublished?: boolean;
};

const RESERVED_SLUGS = new Set(['admin', 'api', 'artifacts', 'robots.txt', 'sitemap.xml', 'favicon.ico']);

function validateSlug(slug: string): string | null {
	if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
		return 'Slug must be lowercase alphanumeric with hyphens, e.g. "my-project"';
	}
	if (RESERVED_SLUGS.has(slug)) {
		return `"${slug}" is a reserved name`;
	}
	return null;
}

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
	const id = parseId(params.id);

	const [row] = await db
		.select({
			id: projects.id,
			name: projects.name,
			displayName: projects.displayName,
			description: projects.description,
			isPublished: projects.isPublished,
			coverArtifactDataBlob: projectArtifacts.dataBlob,
			coverPositionX: projectCoverArtifact.positionX,
			coverPositionY: projectCoverArtifact.positionY,
			coverZoom: projectCoverArtifact.zoom
		})
		.from(projects)
		.leftJoin(projectCoverArtifact, eq(projects.id, projectCoverArtifact.projectId))
		.leftJoin(projectArtifacts, eq(projectCoverArtifact.artifactId, projectArtifacts.id))
		.where(eq(projects.id, id));

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
			.where(eq(projectCategories.projectId, id)),
		db
			.select({
				name: projectAttributes.name,
				value: projectAttributes.value
			})
			.from(projectAttributes)
			.where(eq(projectAttributes.projectId, id))
	]);

	let coverImageUrl: string | null = null;
	let coverHoverImageUrl: string | null = null;
	if (row.coverArtifactDataBlob) {
		const blob = typeof row.coverArtifactDataBlob === 'string'
			? JSON.parse(row.coverArtifactDataBlob)
			: row.coverArtifactDataBlob;
		coverImageUrl = blob?.imageUrl ?? null;
		coverHoverImageUrl = blob?.hoverImageUrl ?? null;
	}

	return json({
		id: row.id,
		name: row.name,
		displayName: row.displayName,
		description: row.description,
		isPublished: row.isPublished,
		coverImageUrl,
		coverHoverImageUrl,
		coverPositionX: row.coverPositionX ?? 50,
		coverPositionY: row.coverPositionY ?? 50,
		coverZoom: row.coverZoom ?? 1,
		categories: catRows.map((r) => r.categoryName),
		navAttributes: attrRows.map((r) => ({ name: r.name, value: r.value }))
	}, { headers: corsHeaders });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const id = parseId(params.id);
	const payload = (await request.json()) as Partial<ProjectInput>;
	const name = payload.name?.trim();
	const displayName = payload.displayName?.trim() || name;
	const description = payload.description?.trim() || null;
	const isPublished = payload.isPublished;

	if (!name) {
		throw error(400, 'name is required');
	}

	const slugError = validateSlug(name);
	if (slugError) {
		throw error(400, slugError);
	}

	let updated;
	try {
		[updated] = await db
			.update(projects)
			.set({
				name,
				displayName,
				description,
				isPublished: isPublished ?? false
			})
			.where(eq(projects.id, id))
			.returning();
	} catch (e) {
		const cause = e instanceof Error ? (e.cause as Error)?.message ?? e.message : String(e);
		if (cause.includes('UNIQUE constraint failed')) {
			throw error(409, `A project with the name "${name}" already exists`);
		}
		throw error(500, cause);
	}

	if (!updated) {
		throw error(404, 'Project not found');
	}

	return json(updated, { headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const id = parseId(params.id);

	// Collect R2 keys from all artifacts before cascade delete
	const artifactRows = await db
		.select({ dataBlob: projectArtifacts.dataBlob })
		.from(projectArtifacts)
		.where(eq(projectArtifacts.projectId, id));

	const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();

	if (!deleted) {
		throw error(404, 'Project not found');
	}

	// Clean up R2 objects after DB delete
	const bucket = platform?.env?.ARTIFACTS as R2Bucket | undefined;
	if (bucket && artifactRows.length > 0) {
		const keys = artifactRows.flatMap((row) => extractR2Keys(row.dataBlob));
		await deleteR2Objects(bucket, keys);
	}

	return json({ success: true }, { headers: corsHeaders });
};
