import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { projectArtifacts, projects, siteSettings } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';

interface R2ImageItem {
	key: string;
	size: number;
	contentType: string;
	uploaded: string;
	artifactId?: number;
	projectId?: number;
	projectName?: string;
	urlField?: 'imageUrl' | 'hoverImageUrl';
	settingKey?: string;
	settingLabel?: string;
	isOptimized: boolean;
}

export const GET: RequestHandler = async ({ platform }) => {
	const bucket = platform?.env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	const db = platform?.env?.DB
		? getDb(platform.env.DB as unknown as import('@cloudflare/workers-types').D1Database)
		: null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// List all R2 objects with cursor-based pagination
	const allObjects: Array<{
		key: string;
		size: number;
		httpMetadata?: { contentType?: string };
		uploaded: Date;
	}> = [];

	let cursor: string | undefined;
	do {
		const list = await bucket.list({
			prefix: 'artifacts/',
			limit: 1000,
			...(cursor ? { cursor } : {})
		});
		for (const obj of list.objects) {
			allObjects.push(obj);
		}
		cursor = list.truncated ? list.cursor : undefined;
	} while (cursor);

	// Query all image-v1 artifacts joined with projects
	const artifactRows = await db
		.select({
			id: projectArtifacts.id,
			projectId: projectArtifacts.projectId,
			dataBlob: projectArtifacts.dataBlob,
			projectName: projects.displayName
		})
		.from(projectArtifacts)
		.innerJoin(projects, eq(projectArtifacts.projectId, projects.id))
		.where(eq(projectArtifacts.schema, 'image-v1'))
		.all();

	// Build a map: R2 key → artifact info
	const keyToArtifact = new Map<
		string,
		{ artifactId: number; projectId: number; projectName: string; urlField: 'imageUrl' | 'hoverImageUrl' }
	>();

	for (const row of artifactRows) {
		const blob =
			typeof row.dataBlob === 'string' ? JSON.parse(row.dataBlob) : row.dataBlob;
		if (!blob) continue;

		const imageUrl = typeof blob.imageUrl === 'string' ? blob.imageUrl : null;
		const hoverImageUrl = typeof blob.hoverImageUrl === 'string' ? blob.hoverImageUrl : null;

		for (const [url, field] of [
			[imageUrl, 'imageUrl'],
			[hoverImageUrl, 'hoverImageUrl']
		] as const) {
			if (!url) continue;
			// Convert URL to R2 key
			const key = url.startsWith('/') ? url.slice(1) : url;
			if (key.startsWith('artifacts/')) {
				keyToArtifact.set(key, {
					artifactId: row.id,
					projectId: row.projectId,
					projectName: row.projectName,
					urlField: field
				});
				// Also map format variants
				const formats = field === 'imageUrl' ? blob.imageFormats : blob.hoverImageFormats;
				if (Array.isArray(formats)) {
					const dotIndex = key.lastIndexOf('.');
					if (dotIndex > -1) {
						const base = key.slice(0, dotIndex + 1);
						for (const fmt of formats) {
							if (typeof fmt === 'string') {
								keyToArtifact.set(`${base}${fmt}`, {
									artifactId: row.id,
									projectId: row.projectId,
									projectName: row.projectName,
									urlField: field
								});
							}
						}
					}
				}
			}
		}
	}

	// Query site_settings for namecard images
	const NAMECARD_SETTINGS: Array<{ key: string; label: string }> = [
		{ key: 'namecard_image', label: 'Namecard (Landing)' },
		{ key: 'project_namecard_image', label: 'Namecard (Project)' }
	];

	const keyToSetting = new Map<string, { settingKey: string; settingLabel: string }>();

	for (const setting of NAMECARD_SETTINGS) {
		const [row] = await db
			.select({ value: siteSettings.value })
			.from(siteSettings)
			.where(eq(siteSettings.key, setting.key))
			.limit(1)
			.all();

		if (!row) continue;
		const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
		if (!val || typeof val.imageUrl !== 'string') continue;

		const r2Key = val.imageUrl.startsWith('/') ? val.imageUrl.slice(1) : val.imageUrl;
		if (r2Key.startsWith('artifacts/')) {
			const info = { settingKey: setting.key, settingLabel: setting.label };
			keyToSetting.set(r2Key, info);

			// Also map format variants
			if (Array.isArray(val.imageFormats)) {
				const dotIndex = r2Key.lastIndexOf('.');
				if (dotIndex > -1) {
					const base = r2Key.slice(0, dotIndex + 1);
					for (const fmt of val.imageFormats) {
						if (typeof fmt === 'string') {
							keyToSetting.set(`${base}${fmt}`, info);
						}
					}
				}
			}
		}
	}

	// Cross-reference
	const items: R2ImageItem[] = allObjects.map((obj) => {
		const artifactInfo = keyToArtifact.get(obj.key);
		const settingInfo = keyToSetting.get(obj.key);
		const ext = obj.key.split('.').pop()?.toLowerCase() ?? '';
		return {
			key: obj.key,
			size: obj.size,
			contentType: obj.httpMetadata?.contentType ?? `image/${ext}`,
			uploaded: obj.uploaded.toISOString(),
			...(artifactInfo
				? {
						artifactId: artifactInfo.artifactId,
						projectId: artifactInfo.projectId,
						projectName: artifactInfo.projectName,
						urlField: artifactInfo.urlField
					}
				: {}),
			...(settingInfo
				? {
						settingKey: settingInfo.settingKey,
						settingLabel: settingInfo.settingLabel
					}
				: {}),
			isOptimized: ext === 'avif' || ext === 'webp'
		};
	});

	return json({ items });
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const bucket = platform?.env?.ARTIFACTS;
	if (!bucket) {
		throw error(500, 'Artifacts bucket not configured');
	}

	const db = platform?.env?.DB
		? getDb(platform.env.DB as unknown as import('@cloudflare/workers-types').D1Database)
		: null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = await request.json();
	const { keys } = body as { keys?: string[] };

	if (!Array.isArray(keys) || keys.length === 0) {
		throw error(400, 'keys array is required');
	}
	if (keys.some((k) => typeof k !== 'string' || !k.startsWith('artifacts/'))) {
		throw error(400, 'All keys must be valid artifact paths');
	}

	// Verify none of these keys are referenced by artifacts or site settings
	const artifactRows = await db
		.select({ dataBlob: projectArtifacts.dataBlob })
		.from(projectArtifacts)
		.where(eq(projectArtifacts.schema, 'image-v1'))
		.all();

	const referencedKeys = new Set<string>();
	for (const row of artifactRows) {
		const blob = typeof row.dataBlob === 'string' ? JSON.parse(row.dataBlob) : row.dataBlob;
		if (!blob) continue;
		for (const field of ['imageUrl', 'hoverImageUrl'] as const) {
			const url = blob[field];
			if (typeof url === 'string') {
				const key = url.startsWith('/') ? url.slice(1) : url;
				if (key.startsWith('artifacts/')) {
					referencedKeys.add(key);
					// Also add format variants
					const formats = field === 'imageUrl' ? blob.imageFormats : blob.hoverImageFormats;
					if (Array.isArray(formats)) {
						const dotIndex = key.lastIndexOf('.');
						if (dotIndex > -1) {
							const base = key.slice(0, dotIndex + 1);
							for (const fmt of formats) {
								if (typeof fmt === 'string') referencedKeys.add(`${base}${fmt}`);
							}
						}
					}
				}
			}
		}
	}

	// Also check site settings
	const NAMECARD_KEYS = ['namecard_image', 'project_namecard_image'];
	for (const settingKey of NAMECARD_KEYS) {
		const [row] = await db
			.select({ value: siteSettings.value })
			.from(siteSettings)
			.where(eq(siteSettings.key, settingKey))
			.limit(1)
			.all();
		if (!row) continue;
		const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
		if (!val || typeof val.imageUrl !== 'string') continue;
		const key = val.imageUrl.startsWith('/') ? val.imageUrl.slice(1) : val.imageUrl;
		if (key.startsWith('artifacts/')) {
			referencedKeys.add(key);
			if (Array.isArray(val.imageFormats)) {
				const dotIndex = key.lastIndexOf('.');
				if (dotIndex > -1) {
					const base = key.slice(0, dotIndex + 1);
					for (const fmt of val.imageFormats) {
						if (typeof fmt === 'string') referencedKeys.add(`${base}${fmt}`);
					}
				}
			}
		}
	}

	// Filter out any keys that are actually referenced (safety check)
	const safeToDelete = keys.filter((k) => !referencedKeys.has(k));
	const blocked = keys.filter((k) => referencedKeys.has(k));

	if (safeToDelete.length > 0) {
		await bucket.delete(safeToDelete);
	}

	return json({ deleted: safeToDelete.length, blocked: blocked.length });
};
