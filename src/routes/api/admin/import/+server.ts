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
	projectCoverArtifact,
	siteSettings
} from '$lib/server/db/schema';
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
			await db.delete(projects).where(eq(projects.id, existing.id));
			await createProject(db, proj, categoryNameToIdMap, zip, bucket, summary);
			summary.projectsClobbered++;
		} else {
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

	// --- Process Site Settings ---
	const importNamecardSetting = async (
		data: NonNullable<typeof manifest.siteSettings>['namecardImage'],
		settingKey: string
	) => {
		if (!data) return;
		let imageUrl = data.imageUrl;

		if (data._localImagePath) {
			const newUrl = await uploadImage(zip, data._localImagePath, bucket, summary);
			if (newUrl) {
				imageUrl = newUrl;
			}
		}

		const value = {
			imageUrl,
			positionX: data.positionX,
			positionY: data.positionY,
			zoom: data.zoom
		};

		await db.delete(siteSettings).where(eq(siteSettings.key, settingKey));
		await db.insert(siteSettings).values({ key: settingKey, value });
	};

	await importNamecardSetting(manifest.siteSettings?.namecardImage, 'namecard_image');
	await importNamecardSetting(manifest.siteSettings?.projectNamecardImage, 'project_namecard_image');

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

	const catIds = proj.categories
		.map((name) => categoryNameToIdMap.get(name))
		.filter((id): id is number => id !== undefined);

	if (catIds.length > 0) {
		await db
			.insert(projectCategories)
			.values(catIds.map((categoryId) => ({ projectId, categoryId })))
			.onConflictDoNothing();
	}

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

	let coverArtifactId: number | null = null;
	let coverPositionX = 50;
	let coverPositionY = 50;
	let coverZoom = 1;
	for (const artifact of proj.artifacts) {
		const dataBlob = { ...artifact.dataBlob };

		if (artifact.schema === 'image-v1') {
			if (artifact._localImagePath) {
				const newUrl = await uploadImage(zip, artifact._localImagePath, bucket, summary);
				if (newUrl) {
					dataBlob.imageUrl = newUrl;
				}
			}
			if (artifact._localHoverImagePath) {
				const newUrl = await uploadImage(zip, artifact._localHoverImagePath, bucket, summary);
				if (newUrl) {
					dataBlob.hoverImageUrl = newUrl;
				}
			}
		}

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
	await db
		.update(projects)
		.set({
			displayName: proj.displayName,
			description: proj.description,
			isPublished: proj.isPublished
		})
		.where(eq(projects.id, existingProjectId));

	const catIds = proj.categories
		.map((name) => categoryNameToIdMap.get(name))
		.filter((id): id is number => id !== undefined);

	if (catIds.length > 0) {
		await db
			.insert(projectCategories)
			.values(catIds.map((categoryId) => ({ projectId: existingProjectId, categoryId })))
			.onConflictDoNothing();
	}

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

			let foundByR2Hash = false;
			for (const existing of existingArtifacts) {
				const blob =
					typeof existing.dataBlob === 'string'
						? JSON.parse(existing.dataBlob)
						: existing.dataBlob;
				if (blob?.imageHash) continue;
				if (existing.schema !== 'image-v1' || !blob?.imageUrl) continue;

				const existingHash = await computeR2ImageHash(
					String(blob.imageUrl),
					bucket
				);
				if (existingHash) {
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

		const dataBlob = { ...artifact.dataBlob };

		if (artifact.schema === 'image-v1') {
			if (artifact._localImagePath) {
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
			if (artifact._localHoverImagePath) {
				const newUrl = await uploadImage(
					zip,
					artifact._localHoverImagePath,
					bucket,
					summary
				);
				if (newUrl) {
					dataBlob.hoverImageUrl = newUrl;
				}
			}
		}

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
