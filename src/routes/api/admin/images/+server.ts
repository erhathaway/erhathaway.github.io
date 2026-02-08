import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { projectArtifacts, projects } from '$lib/server/db/schema';
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

	// Cross-reference
	const items: R2ImageItem[] = allObjects.map((obj) => {
		const info = keyToArtifact.get(obj.key);
		const ext = obj.key.split('.').pop()?.toLowerCase() ?? '';
		return {
			key: obj.key,
			size: obj.size,
			contentType: obj.httpMetadata?.contentType ?? `image/${ext}`,
			uploaded: obj.uploaded.toISOString(),
			...(info
				? {
						artifactId: info.artifactId,
						projectId: info.projectId,
						projectName: info.projectName,
						urlField: info.urlField
					}
				: {}),
			isOptimized: ext === 'avif' || ext === 'webp'
		};
	});

	return json({ items });
};
