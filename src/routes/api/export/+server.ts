import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import JSZip from 'jszip';
import {
	projects,
	categories,
	projectCategories,
	projectArtifacts,
	projectAttributes
} from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';
import type {
	ExportManifest,
	ExportCategory,
	ExportProject,
	ExportArtifact,
	ExportAttribute
} from '$lib/types/export-manifest';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

function extractR2Key(url: string, publicBaseUrl?: string): string | null {
	if (publicBaseUrl) {
		const base = publicBaseUrl.replace(/\/$/, '');
		if (url.startsWith(base)) {
			return url.slice(base.length + 1);
		}
	}
	try {
		const parsed = new URL(url, 'http://localhost');
		if (parsed.pathname === '/api/uploads/artifacts') {
			return parsed.searchParams.get('key');
		}
	} catch {
		/* ignore */
	}
	if (url.startsWith('artifacts/')) {
		return url;
	}
	return null;
}

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const db = getDbOrThrow(locals.db);
	const body = await request.json();
	const categoryNames: string[] = body.categoryNames ?? [];
	const projectNames: string[] = body.projectNames ?? [];

	// Fetch categories
	const categoryRows =
		categoryNames.length > 0
			? await db
					.select()
					.from(categories)
					.where(inArray(categories.name, categoryNames))
			: await db.select().from(categories);

	// Fetch projects
	const projectRows =
		projectNames.length > 0
			? await db
					.select()
					.from(projects)
					.where(inArray(projects.name, projectNames))
			: await db.select().from(projects);

	const bucket = platform?.env?.ARTIFACTS;
	const publicBaseUrl = platform?.env?.PUBLIC_R2_BASE_URL;
	const zip = new JSZip();
	const imageMap = new Map<string, ArrayBuffer>();

	// Build export projects with related data
	const exportProjects: ExportProject[] = [];

	for (const project of projectRows) {
		// Get project categories
		const projCatRows = await db
			.select({ name: categories.name })
			.from(projectCategories)
			.innerJoin(categories, eq(projectCategories.categoryId, categories.id))
			.where(eq(projectCategories.projectId, project.id));

		// Get project attributes
		const attrRows = await db
			.select({
				name: projectAttributes.name,
				value: projectAttributes.value,
				showInNav: projectAttributes.showInNav,
				isPublished: projectAttributes.isPublished
			})
			.from(projectAttributes)
			.where(eq(projectAttributes.projectId, project.id));

		// Get project artifacts
		const artifactRows = await db
			.select({
				schema: projectArtifacts.schema,
				dataBlob: projectArtifacts.dataBlob,
				isPublished: projectArtifacts.isPublished
			})
			.from(projectArtifacts)
			.where(eq(projectArtifacts.projectId, project.id));

		const exportArtifacts: ExportArtifact[] = [];

		for (const artifact of artifactRows) {
			let dataBlob =
				typeof artifact.dataBlob === 'string'
					? JSON.parse(artifact.dataBlob)
					: artifact.dataBlob;
			dataBlob = { ...dataBlob };

			const exportArtifact: ExportArtifact = {
				schema: artifact.schema,
				dataBlob,
				isPublished: artifact.isPublished
			};

			// Try to fetch and include the image
			if (artifact.schema === 'image-v1' && dataBlob.imageUrl && bucket) {
				const key = extractR2Key(String(dataBlob.imageUrl), publicBaseUrl);
				if (key && !imageMap.has(key)) {
					try {
						const obj = await bucket.get(key);
						if (obj) {
							const buffer = await obj.arrayBuffer();
							imageMap.set(key, buffer);
						}
					} catch {
						// Skip image if fetch fails
					}
				}
				if (key && imageMap.has(key)) {
					const localPath = `images/${key.replace(/^artifacts\//, '')}`;
					exportArtifact._localImagePath = localPath;
					exportArtifact.dataBlob = { ...dataBlob, imageUrl: localPath };
				}
			}

			exportArtifacts.push(exportArtifact);
		}

		const exportAttrs: ExportAttribute[] = attrRows.map((a) => ({
			name: a.name,
			value: a.value,
			showInNav: a.showInNav,
			isPublished: a.isPublished
		}));

		exportProjects.push({
			name: project.name,
			displayName: project.displayName,
			description: project.description,
			isPublished: project.isPublished,
			categories: projCatRows.map((c) => c.name),
			attributes: exportAttrs,
			artifacts: exportArtifacts
		});
	}

	const exportCategories: ExportCategory[] = categoryRows.map((c) => ({
		name: c.name,
		displayName: c.displayName,
		isPublished: c.isPublished
	}));

	const manifest: ExportManifest = {
		version: 1,
		exportedAt: new Date().toISOString(),
		categories: exportCategories,
		projects: exportProjects
	};

	zip.file('manifest.json', JSON.stringify(manifest, null, 2));

	for (const [key, buffer] of imageMap.entries()) {
		const localPath = `images/${key.replace(/^artifacts\//, '')}`;
		zip.file(localPath, buffer);
	}

	const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

	return new Response(zipBuffer, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="portfolio-export-${Date.now()}.zip"`,
			...corsHeaders
		}
	});
};
