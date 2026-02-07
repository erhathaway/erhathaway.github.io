import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import JSZip from 'jszip';
import {
	projects,
	categories,
	projectCategories,
	projectArtifacts,
	projectAttributes,
	projectCoverArtifact
} from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';
import type { Db } from '$lib/server/db';
import type {
	ExportManifest,
	ExportProject,
	ImportConflicts,
	ImportSummary,
	ConflictResolution
} from '$lib/types/export-manifest';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']): Db => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

function mimeFromExtension(ext: string): string {
	const map: Record<string, string> = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
		gif: 'image/gif',
		svg: 'image/svg+xml'
	};
	return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

function extractR2Key(url: string): string | null {
	// /artifacts/uuid.ext -> artifacts/uuid.ext
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

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function computeR2ImageHash(
	imageUrl: string,
	bucket: import('@cloudflare/workers-types').R2Bucket | undefined
): Promise<string | null> {
	if (!bucket) return null;
	const key = extractR2Key(imageUrl);
	if (!key) return null;
	try {
		const obj = await bucket.get(key);
		if (!obj) return null;
		const buffer = await obj.arrayBuffer();
		return computeSha256Hex(buffer);
	} catch {
		return null;
	}
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
	const bucket = platform?.env?.ARTIFACTS;

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		throw error(400, 'file is required');
	}

	const conflictsRaw = formData.get('conflicts');
	let conflicts: ImportConflicts = {
		defaultResolution: 'merge',
		perProject: {},
		perCategory: {}
	};
	if (typeof conflictsRaw === 'string') {
		try {
			conflicts = JSON.parse(conflictsRaw);
		} catch {
			throw error(400, 'Invalid conflicts JSON');
		}
	}

	// Parse ZIP
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(await file.arrayBuffer());
	} catch {
		throw error(400, 'Invalid ZIP file');
	}

	const manifestFile = zip.file('manifest.json');
	if (!manifestFile) {
		throw error(400, 'Invalid export package: missing manifest.json');
	}

	let manifest: ExportManifest;
	try {
		manifest = JSON.parse(await manifestFile.async('text'));
	} catch {
		throw error(400, 'Invalid manifest.json');
	}

	if (manifest.version !== 1) {
		throw error(400, `Unsupported manifest version: ${manifest.version}`);
	}

	const summary: ImportSummary = {
		categoriesCreated: 0,
		categoriesUpdated: 0,
		categoriesSkipped: 0,
		projectsCreated: 0,
		projectsClobbered: 0,
		projectsMerged: 0,
		projectsSkipped: 0,
		artifactsCreated: 0,
		artifactsSkipped: 0,
		imagesUploaded: 0,
		warnings: []
	};

	// --- Process Categories ---
	const categoryNameToIdMap = new Map<string, number>();

	// Pre-load all existing categories
	const existingCategories = await db.select().from(categories);
	const existingCatMap = new Map(existingCategories.map((c) => [c.name, c]));

	for (const cat of manifest.categories) {
		const existing = existingCatMap.get(cat.name);
		const resolution: ConflictResolution =
			conflicts.perCategory[cat.name] ?? conflicts.defaultResolution;

		if (existing) {
			if (resolution === 'skip') {
				categoryNameToIdMap.set(cat.name, existing.id);
				summary.categoriesSkipped++;
				continue;
			}
			// clobber and merge both update for categories (no sub-entities)
			await db
				.update(categories)
				.set({
					displayName: cat.displayName,
					isPublished: cat.isPublished
				})
				.where(eq(categories.id, existing.id));
			categoryNameToIdMap.set(cat.name, existing.id);
			summary.categoriesUpdated++;
		} else {
			const [created] = await db
				.insert(categories)
				.values({
					name: cat.name,
					displayName: cat.displayName,
					isPublished: cat.isPublished
				})
				.returning();
			categoryNameToIdMap.set(cat.name, created.id);
			summary.categoriesCreated++;
		}
	}

	// Also load categories not in the manifest (for project category linking)
	const allCats = await db.select().from(categories);
	for (const c of allCats) {
		if (!categoryNameToIdMap.has(c.name)) {
			categoryNameToIdMap.set(c.name, c.id);
		}
	}

	// --- Process Projects ---
	const existingProjects = await db.select().from(projects);
	const existingProjMap = new Map(existingProjects.map((p) => [p.name, p]));
	const processedNames = new Set<string>();

	for (const proj of manifest.projects) {
		// Skip duplicates within the manifest
		if (processedNames.has(proj.name)) continue;
		processedNames.add(proj.name);

		const existing = existingProjMap.get(proj.name);
		const resolution: ConflictResolution =
			conflicts.perProject[proj.name] ?? conflicts.defaultResolution;

		if (!existing) {
			await createProject(db, proj, categoryNameToIdMap, zip, bucket, summary);
			summary.projectsCreated++;
		} else if (resolution === 'skip') {
			summary.projectsSkipped++;
		} else if (resolution === 'clobber') {
			// Delete existing (cascade handles related rows)
			await db.delete(projects).where(eq(projects.id, existing.id));
			await createProject(db, proj, categoryNameToIdMap, zip, bucket, summary);
			summary.projectsClobbered++;
		} else {
			// merge
			await mergeProject(
				db,
				existing.id,
				proj,
				categoryNameToIdMap,
				zip,
				bucket,
				summary
			);
			summary.projectsMerged++;
		}
	}

	return json({ success: true, summary }, { headers: corsHeaders });
};

async function uploadImage(
	zip: JSZip,
	localPath: string,
	bucket: import('@cloudflare/workers-types').R2Bucket | undefined,
	summary: ImportSummary
): Promise<string | null> {
	if (!bucket) {
		summary.warnings.push(`No R2 bucket configured, skipping image: ${localPath}`);
		return null;
	}

	const imageFile = zip.file(localPath);
	if (!imageFile) {
		summary.warnings.push(`Image not found in ZIP: ${localPath}`);
		return null;
	}

	const buffer = await imageFile.async('arraybuffer');
	const ext = localPath.split('.').pop() ?? 'bin';
	const key = `artifacts/${crypto.randomUUID()}.${ext}`;

	await bucket.put(key, buffer, {
		httpMetadata: { contentType: mimeFromExtension(ext) }
	});

	summary.imagesUploaded++;

	return `/${key}`;
}

async function createProject(
	db: Db,
	proj: ExportProject,
	categoryNameToIdMap: Map<string, number>,
	zip: JSZip,
	bucket: import('@cloudflare/workers-types').R2Bucket | undefined,
	summary: ImportSummary
) {
	const [created] = await db
		.insert(projects)
		.values({
			name: proj.name,
			displayName: proj.displayName,
			description: proj.description,
			isPublished: proj.isPublished
		})
		.returning();

	const projectId = created.id;

	// Link categories
	const catIds = proj.categories
		.map((name) => categoryNameToIdMap.get(name))
		.filter((id): id is number => id !== undefined);

	if (catIds.length > 0) {
		await db
			.insert(projectCategories)
			.values(catIds.map((categoryId) => ({ projectId, categoryId })))
			.onConflictDoNothing();
	}

	// Insert attributes
	if (proj.attributes.length > 0) {
		await db.insert(projectAttributes).values(
			proj.attributes.map((attr) => ({
				projectId,
				name: attr.name,
				value: attr.value,
				showInNav: attr.showInNav,
				isPublished: attr.isPublished
			}))
		);
	}

	// Insert artifacts with image upload
	let coverArtifactId: number | null = null;
	let coverPositionX = 50;
	let coverPositionY = 50;
	let coverZoom = 1;
	for (const artifact of proj.artifacts) {
		const dataBlob = { ...artifact.dataBlob };

		if (artifact._localImagePath && artifact.schema === 'image-v1') {
			const newUrl = await uploadImage(zip, artifact._localImagePath, bucket, summary);
			if (newUrl) {
				dataBlob.imageUrl = newUrl;
			}
		}

		// Persist imageHash in dataBlob for future dedup
		if (artifact.imageHash) {
			dataBlob.imageHash = artifact.imageHash;
		}

		const [created] = await db.insert(projectArtifacts).values({
			projectId,
			schema: artifact.schema,
			dataBlob,
			isPublished: artifact.isPublished
		}).returning();
		summary.artifactsCreated++;

		if (artifact.isCover) {
			coverArtifactId = created.id;
			coverPositionX = artifact.coverPositionX ?? 50;
			coverPositionY = artifact.coverPositionY ?? 50;
			coverZoom = artifact.coverZoom ?? 1;
		}
	}

	if (coverArtifactId !== null) {
		await db.delete(projectCoverArtifact).where(eq(projectCoverArtifact.projectId, projectId));
		await db.insert(projectCoverArtifact).values({
			projectId,
			artifactId: coverArtifactId,
			positionX: coverPositionX,
			positionY: coverPositionY,
			zoom: coverZoom
		});
	}
}

async function mergeProject(
	db: Db,
	existingProjectId: number,
	proj: ExportProject,
	categoryNameToIdMap: Map<string, number>,
	zip: JSZip,
	bucket: import('@cloudflare/workers-types').R2Bucket | undefined,
	summary: ImportSummary
) {
	// Update project metadata
	await db
		.update(projects)
		.set({
			displayName: proj.displayName,
			description: proj.description,
			isPublished: proj.isPublished
		})
		.where(eq(projects.id, existingProjectId));

	// Add new category associations
	const catIds = proj.categories
		.map((name) => categoryNameToIdMap.get(name))
		.filter((id): id is number => id !== undefined);

	if (catIds.length > 0) {
		await db
			.insert(projectCategories)
			.values(catIds.map((categoryId) => ({ projectId: existingProjectId, categoryId })))
			.onConflictDoNothing();
	}

	// Upsert attributes by name
	const existingAttrs = await db
		.select({
			id: projectAttributes.id,
			name: projectAttributes.name,
			value: projectAttributes.value,
			showInNav: projectAttributes.showInNav,
			isPublished: projectAttributes.isPublished
		})
		.from(projectAttributes)
		.where(eq(projectAttributes.projectId, existingProjectId));
	const existingAttrMap = new Map(existingAttrs.map((a) => [a.name, a]));

	for (const attr of proj.attributes) {
		const existing = existingAttrMap.get(attr.name);
		if (existing) {
			await db
				.update(projectAttributes)
				.set({
					value: attr.value,
					showInNav: attr.showInNav,
					isPublished: attr.isPublished
				})
				.where(
					and(
						eq(projectAttributes.id, existing.id),
						eq(projectAttributes.projectId, existingProjectId)
					)
				);
		} else {
			await db.insert(projectAttributes).values({
				projectId: existingProjectId,
				name: attr.name,
				value: attr.value,
				showInNav: attr.showInNav,
				isPublished: attr.isPublished
			});
		}
	}

	// Deduplicate artifacts: only add ones that don't already exist
	const existingArtifacts = await db
		.select({
			id: projectArtifacts.id,
			schema: projectArtifacts.schema,
			dataBlob: projectArtifacts.dataBlob,
			isPublished: projectArtifacts.isPublished
		})
		.from(projectArtifacts)
		.where(eq(projectArtifacts.projectId, existingProjectId));

	const existingIdSet = new Set(existingArtifacts.map((a) => a.id));

	// Build hash → artifactId map from existing artifacts' stored imageHash
	const existingHashMap = new Map<string, number>();
	for (const existing of existingArtifacts) {
		const blob =
			typeof existing.dataBlob === 'string'
				? JSON.parse(existing.dataBlob)
				: existing.dataBlob;
		if (blob?.imageHash) {
			existingHashMap.set(blob.imageHash, existing.id);
		}
	}

	let coverArtifactId: number | null = null;
	let coverPositionX = 50;
	let coverPositionY = 50;
	let coverZoom = 1;

	for (const artifact of proj.artifacts) {
		// Match by artifact ID
		if (artifact.id && existingIdSet.has(artifact.id)) {
			summary.artifactsSkipped++;
			if (artifact.isCover) {
				coverArtifactId = artifact.id;
				coverPositionX = artifact.coverPositionX ?? 50;
				coverPositionY = artifact.coverPositionY ?? 50;
			coverZoom = artifact.coverZoom ?? 1;
			}
			continue;
		}

		// Match by image hash (fast path: stored hashes)
		if (artifact.imageHash) {
			const matchedId = existingHashMap.get(artifact.imageHash);
			if (matchedId) {
				summary.artifactsSkipped++;
				if (artifact.isCover) {
					coverArtifactId = matchedId;
					coverPositionX = artifact.coverPositionX ?? 50;
					coverPositionY = artifact.coverPositionY ?? 50;
			coverZoom = artifact.coverZoom ?? 1;
				}
				continue;
			}

			// Slow path: compute hash from R2 for existing artifacts without stored hash
			let foundByR2Hash = false;
			for (const existing of existingArtifacts) {
				const blob =
					typeof existing.dataBlob === 'string'
						? JSON.parse(existing.dataBlob)
						: existing.dataBlob;
				if (blob?.imageHash) continue; // Already checked above
				if (existing.schema !== 'image-v1' || !blob?.imageUrl) continue;

				const existingHash = await computeR2ImageHash(
					String(blob.imageUrl),
					bucket
				);
				if (existingHash) {
					// Backfill hash into existing artifact for future fast lookups
					existingHashMap.set(existingHash, existing.id);
					await db
						.update(projectArtifacts)
						.set({ dataBlob: { ...blob, imageHash: existingHash } })
						.where(eq(projectArtifacts.id, existing.id));

					if (existingHash === artifact.imageHash) {
						summary.artifactsSkipped++;
						if (artifact.isCover) {
							coverArtifactId = existing.id;
							coverPositionX = artifact.coverPositionX ?? 50;
							coverPositionY = artifact.coverPositionY ?? 50;
			coverZoom = artifact.coverZoom ?? 1;
						}
						foundByR2Hash = true;
						break;
					}
				}
			}
			if (foundByR2Hash) continue;
		}

		// No match found: insert as new artifact
		const dataBlob = { ...artifact.dataBlob };

		if (artifact._localImagePath && artifact.schema === 'image-v1') {
			const newUrl = await uploadImage(
				zip,
				artifact._localImagePath,
				bucket,
				summary
			);
			if (newUrl) {
				dataBlob.imageUrl = newUrl;
			}
		}

		// Persist imageHash in dataBlob for future dedup
		if (artifact.imageHash) {
			dataBlob.imageHash = artifact.imageHash;
		}

		const [created] = await db
			.insert(projectArtifacts)
			.values({
				projectId: existingProjectId,
				schema: artifact.schema,
				dataBlob,
				isPublished: artifact.isPublished
			})
			.returning();
		summary.artifactsCreated++;

		if (artifact.isCover) {
			coverArtifactId = created.id;
			coverPositionX = artifact.coverPositionX ?? 50;
			coverPositionY = artifact.coverPositionY ?? 50;
			coverZoom = artifact.coverZoom ?? 1;
		}
	}

	if (coverArtifactId !== null) {
		await db
			.delete(projectCoverArtifact)
			.where(eq(projectCoverArtifact.projectId, existingProjectId));
		await db
			.insert(projectCoverArtifact)
			.values({
				projectId: existingProjectId,
				artifactId: coverArtifactId,
				positionX: coverPositionX,
				positionY: coverPositionY,
				zoom: coverZoom
			});
	}
}
