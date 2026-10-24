import { exportAppearance } from '$lib/server/appearance-backup';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { Zip, ZipPassThrough } from 'fflate';
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

/** Add a file to the streaming zip */
function addFileToZip(zip: Zip, path: string, data: Uint8Array) {
	const entry = new ZipPassThrough(path);
	zip.add(entry);
	entry.push(data, true);
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
			? await db.select().from(categories).where(inArray(categories.name, categoryNames))
			: await db.select().from(categories);

	// Fetch projects
	const projectRows =
		projectNames.length > 0
			? await db.select().from(projects).where(inArray(projects.name, projectNames))
			: await db.select().from(projects);

	const bucket = platform?.env?.ARTIFACTS;

	// Track which R2 keys we've already added to the zip (dedup)
	const addedR2Keys = new Set<string>();
	// Track image hashes for the manifest (key → hash)
	const imageHashMap = new Map<string, string>();
	// Collect image entries to stream later: { zipPath, r2Key }
	const imageEntries: { zipPath: string; r2Key: string }[] = [];

	// Build export projects with related data (metadata only — no image buffers)
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
				isPublished: projectArtifacts.isPublished,
				sortOrder: projectArtifacts.sortOrder
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
				typeof artifact.dataBlob === 'string' ? JSON.parse(artifact.dataBlob) : artifact.dataBlob;
			dataBlob = { ...dataBlob };

			const isCover = artifact.id === coverArtifactId;
			const exportArtifact: ExportArtifact = {
				id: artifact.id,
				schema: artifact.schema,
				dataBlob,
				isPublished: artifact.isPublished,
				sortOrder: artifact.sortOrder,
				isCover,
				...(isCover && coverRow
					? {
							coverPositionX: coverRow.positionX,
							coverPositionY: coverRow.positionY,
							coverZoom: coverRow.zoom
						}
					: {})
			};

			// Queue images for streaming (don't fetch yet)
			if (artifact.schema === 'image-v1' && bucket) {
				// Main image
				if (dataBlob.imageUrl) {
					const key = extractR2Key(String(dataBlob.imageUrl));
					if (key) {
						const localPath = `images/${key.replace(/^artifacts\//, '')}`;
						exportArtifact._localImagePath = localPath;
						exportArtifact.dataBlob = { ...dataBlob, imageUrl: localPath };

						if (!addedR2Keys.has(key)) {
							addedR2Keys.add(key);
							imageEntries.push({ zipPath: localPath, r2Key: key });
						}
					}
				}

				// Hover image
				if (dataBlob.hoverImageUrl) {
					const hoverKey = extractR2Key(String(dataBlob.hoverImageUrl));
					if (hoverKey) {
						const localPath = `images/${hoverKey.replace(/^artifacts\//, '')}`;
						exportArtifact._localHoverImagePath = localPath;
						exportArtifact.dataBlob = { ...exportArtifact.dataBlob, hoverImageUrl: localPath };

						if (!addedR2Keys.has(hoverKey)) {
							addedR2Keys.add(hoverKey);
							imageEntries.push({ zipPath: localPath, r2Key: hoverKey });
						}
					}
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
			sortOrder: project.sortOrder,
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

	const appearance = await exportAppearance(db);
	for (const image of appearance.images) {
		if (!bucket) throw error(500, 'Image storage is required to back up name cards.');
		if (!addedR2Keys.has(image.key)) {
			addedR2Keys.add(image.key);
			imageEntries.push({ zipPath: image.path, r2Key: image.key });
		}
	}

	const manifest: ExportManifest = {
		version: 2,
		exportedAt: new Date().toISOString(),
		categories: exportCategories,
		projects: exportProjects,
		appearance
	};

	// --- Stream the zip response ---
	// fflate's Zip streams chunks as they're produced, so only one image
	// is in memory at a time instead of all 300+.

	const { readable, writable } = new TransformStream<Uint8Array>();
	const writer = writable.getWriter();

	const zipStream = new Zip((err, data, final) => {
		if (err) {
			void writer.abort(err).catch(() => {});
			return;
		}
		void writer.write(data).catch(() => {});
		if (final) void writer.close().catch(() => {});
	});

	// Run the streaming zip generation in the background
	(async () => {
		try {
			// 1. Write manifest.json first
			const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
			addFileToZip(zipStream, 'manifest.json', manifestBytes);

			// 2. Stream images one at a time from R2
			if (bucket) {
				for (const entry of imageEntries) {
					try {
						const obj = await bucket.get(entry.r2Key);
						if (!obj) throw new Error(`Backup image is missing: ${entry.r2Key}`);
						if (obj) {
							const buffer = await obj.arrayBuffer();

							// Compute hash for manifest (optional, for import dedup)
							const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
							const hashHex = Array.from(new Uint8Array(hashBuffer))
								.map((b) => b.toString(16).padStart(2, '0'))
								.join('');
							imageHashMap.set(entry.r2Key, hashHex);

							addFileToZip(zipStream, entry.zipPath, new Uint8Array(buffer));
						}
					} catch (err) {
						throw err;
					}
				}
			}

			// 3. Re-write manifest with hashes now that we have them
			// Update artifact hashes in the manifest
			for (const proj of manifest.projects) {
				for (const art of proj.artifacts) {
					if (art._localImagePath) {
						const r2Key = [...addedR2Keys].find(
							(k) => `images/${k.replace(/^artifacts\//, '')}` === art._localImagePath
						);
						if (r2Key && imageHashMap.has(r2Key)) {
							art.imageHash = imageHashMap.get(r2Key);
						}
					}
				}
			}

			// Write updated manifest with hashes
			const updatedManifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
			addFileToZip(zipStream, 'manifest-with-hashes.json', updatedManifestBytes);

			// 4. Finalize zip
			zipStream.end();
		} catch (err) {
			void writer.abort(err instanceof Error ? err : new Error(String(err))).catch(() => {});
		}
	})();

	return new Response(readable, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="portfolio-export-${Date.now()}.zip"`,
			...corsHeaders
		}
	});
};
