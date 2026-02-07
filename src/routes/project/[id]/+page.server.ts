import type { PageServerLoad } from './$types';
import { and, eq, sql } from 'drizzle-orm';
import { projects, categories, projectCategories, projectAttributes } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	const db = locals.db;
	if (!db) return { meta: null };

	const projectId = parseInt(params.id);
	if (isNaN(projectId)) return { meta: null };

	const [row] = await db
		.select({
			name: projects.displayName,
			description: projects.description
		})
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);

	if (!row) return { meta: null };

	const [catRows, yearRows] = await Promise.all([
		db
			.select({ name: categories.displayName })
			.from(projectCategories)
			.innerJoin(categories, eq(projectCategories.categoryId, categories.id))
			.where(eq(projectCategories.projectId, projectId)),
		db
			.select({ value: projectAttributes.value })
			.from(projectAttributes)
			.where(and(eq(projectAttributes.projectId, projectId), sql`lower(${projectAttributes.name}) = 'year'`))
			.limit(1)
	]);

	return {
		meta: {
			name: row.name,
			description: row.description,
			categories: catRows.map((c) => c.name),
			year: yearRows[0]?.value ?? null
		}
	};
};
