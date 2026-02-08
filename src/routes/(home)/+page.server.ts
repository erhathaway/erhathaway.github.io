import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { and, eq, asc } from 'drizzle-orm';
import {
	projects,
	projectArtifacts,
	projectCoverArtifact,
	categories,
	projectCategories,
	projectAttributes,
	siteSettings
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const db = locals.db;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const [rows, catList, namecardRow, projectNamecardRow] = await Promise.all([
		db
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
			.orderBy(asc(projects.sortOrder), asc(projects.id)),
		db.select().from(categories).where(eq(categories.isPublished, true)),
		db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, 'namecard_image'))
			.then((r) => r[0] ?? null),
		db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, 'project_namecard_image'))
			.then((r) => r[0] ?? null)
	]);

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
					.where(
						and(eq(projectAttributes.showInNav, true), eq(projectAttributes.isPublished, true))
					)
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

	const projectList = rows.map((row) => {
		let coverImageUrl: string | null = null;
		let coverHoverImageUrl: string | null = null;
		if (row.coverArtifactDataBlob) {
			const blob =
				typeof row.coverArtifactDataBlob === 'string'
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

	setHeaders({
		'Cache-Control': 'public, max-age=0, s-maxage=300'
	});

	return {
		projects: projectList,
		categories: catList,
		namecardImage: namecardRow?.value ?? null,
		projectNamecardImage: projectNamecardRow?.value ?? null
	};
};
