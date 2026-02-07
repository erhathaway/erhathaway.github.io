import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import JSZip from 'jszip';
import {
	projects,
	categories,
	projectCategories,
	projectArtifacts,
	projectAttributes,
	projectCoverArtifact
} from '$lib/server/db/schema';
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

function extractR2Key(url: string): string | null {
	if (url.startsWith('/artifacts/')) {
		return url.slice(1);
	}
	try {
		const parsed = new URL(url, 'http://localhost');
		if (parsed.pathname.startsWith('/artifacts/')) {
			return parsed.pathname.slice(1);
		}
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
	const zip = new JSZip();
	const imageMap = new Map<string, ArrayBuffer>();
	const imageHashMap = new Map<string, string>();

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
				id: projectArtifacts.id,
				schema: projectArtifacts.schema,
				dataBlob: projectArtifacts.dataBlob,
				isPublished: projectArtifacts.isPublished
			})
			.from(projectArtifacts)
			.where(eq(projectArtifacts.projectId, project.id));

		// Get cover artifact ID and position
		const [coverRow] = await db
			.select({
				artifactId: projectCoverArtifact.artifactId,
				positionX: projectCoverArtifact.positionX,
				positionY: projectCoverArtifact.positionY,
				zoom: projectCoverArtifact.zoom
			})
			.from(projectCoverArtifact)
			.where(eq(projectCoverArtifact.projectId, project.id));
		const coverArtifactId = coverRow?.artifactId ?? null;

		const exportArtifacts: ExportArtifact[] = [];

		for (const artifact of artifactRows) {
			let dataBlob =
				typeof artifact.dataBlob === 'string'
					? JSON.parse(artifact.dataBlob)
					: artifact.dataBlob;
			dataBlob = { ...dataBlob };

			const isCover = artifact.id === coverArtifactId;
			const exportArtifact: ExportArtifact = {
				id: artifact.id,
				schema: artifact.schema,
				dataBlob,
				isPublished: artifact.isPublished,
				isCover,
				...(isCover && coverRow ? { coverPositionX: coverRow.positionX, coverPositionY: coverRow.positionY, coverZoom: coverRow.zoom } : {})
			};

			// Try to fetch and include the image
			if (artifact.schema === 'image-v1' && dataBlob.imageUrl && bucket) {
				const key = extractR2Key(String(dataBlob.imageUrl));
				if (key && !imageMap.has(key)) {
					try {
						const obj = await bucket.get(key);
						if (obj) {
							const buffer = await obj.arrayBuffer();
							imageMap.set(key, buffer);
							const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
							const hashHex = Array.from(new Uint8Array(hashBuffer))
								.map((b) => b.toString(16).padStart(2, '0'))
								.join('');
							imageHashMap.set(key, hashHex);
						}
					} catch {
						// Skip image if fetch fails
					}
				}
				if (key && imageMap.has(key)) {
					const localPath = `images/${key.replace(/^artifacts\//, '')}`;
					exportArtifact._localImagePath = localPath;
					exportArtifact.dataBlob = { ...dataBlob, imageUrl: localPath };
					exportArtifact.imageHash = imageHashMap.get(key);
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
