import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { and, eq, asc } from 'drizzle-orm';
import { projects, projectArtifacts, projectCoverArtifact, categories, projectCategories, projectAttributes } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
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

export const GET: RequestHandler = async ({ locals }) => {
	const db = getDbOrThrow(locals.db);

	const rows = await db
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
		.where(eq(projects.isPublished, true))
		.orderBy(asc(projects.sortOrder), asc(projects.id));

	// Fetch categories and nav attributes for all projects
	const projectIds = rows.map((r) => r.id);

	const [catRows, attrRows] = await Promise.all([
		projectIds.length > 0
			? db
				.select({
					projectId: projectCategories.projectId,
					categoryName: categories.displayName
				})
				.from(projectCategories)
				.innerJoin(categories, eq(projectCategories.categoryId, categories.id))
				.where(eq(categories.isPublished, true))
			: Promise.resolve([]),
		projectIds.length > 0
			? db
				.select({
					projectId: projectAttributes.projectId,
					name: projectAttributes.name,
					value: projectAttributes.value
				})
				.from(projectAttributes)
				.where(and(eq(projectAttributes.showInNav, true), eq(projectAttributes.isPublished, true)))
			: Promise.resolve([])
	]);

	const catsByProject = new Map<number, string[]>();
	for (const row of catRows) {
		const arr = catsByProject.get(row.projectId) ?? [];
		arr.push(row.categoryName);
		catsByProject.set(row.projectId, arr);
	}

	const attrsByProject = new Map<number, Array<{ name: string; value: string }>>();
	for (const row of attrRows) {
		const arr = attrsByProject.get(row.projectId) ?? [];
		arr.push({ name: row.name, value: row.value });
		attrsByProject.set(row.projectId, arr);
	}

	const result = rows.map((row) => {
		let coverImageUrl: string | null = null;
		let coverHoverImageUrl: string | null = null;
		if (row.coverArtifactDataBlob) {
			const blob = typeof row.coverArtifactDataBlob === 'string'
				? JSON.parse(row.coverArtifactDataBlob)
				: row.coverArtifactDataBlob;
			coverImageUrl = blob?.imageUrl ?? null;
			coverHoverImageUrl = blob?.hoverImageUrl ?? null;
		}
		return {
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
			categories: catsByProject.get(row.id) ?? [],
			navAttributes: attrsByProject.get(row.id) ?? []
		};
	});

	return json(result, { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
};
