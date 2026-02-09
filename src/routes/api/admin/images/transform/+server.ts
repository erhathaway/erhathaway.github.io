import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { projectArtifacts, siteSettings } from '$lib/server/db/schema';
import { getDb } from '$lib/server/db';
import { transformToModernFormats } from '$lib/server/image-transform';

export const POST: RequestHandler = async ({ request, platform }) => {
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
	const { r2Key, artifactId, field, settingKey } = body as {
		r2Key?: string;
		artifactId?: number;
		field?: 'imageUrl' | 'hoverImageUrl';
		settingKey?: string;
	};

	if (!r2Key || typeof r2Key !== 'string') {
		throw error(400, 'r2Key is required');
	}

	// Must provide either artifactId+field OR settingKey
	const isArtifact = artifactId && field;
	const isSetting = settingKey && typeof settingKey === 'string';

	if (!isArtifact && !isSetting) {
		throw error(400, 'Either artifactId+field or settingKey is required');
	}

	const origin = new URL(request.url).origin;
	console.log(`[transform] Starting: r2Key=${r2Key}, origin=${origin}`);
	const result = await transformToModernFormats(bucket, r2Key, origin);

	if (!result.ok) {
		console.error(`[transform] Failed: ${result.reason}`);
		throw error(500, result.reason);
	}

	const newUrl = `/${result.avifKey}`;

	if (isSetting) {
		// Update site_settings row
		const [row] = await db
			.select({ value: siteSettings.value })
			.from(siteSettings)
			.where(eq(siteSettings.key, settingKey))
			.limit(1)
			.all();

		if (!row) {
			throw error(404, `Setting "${settingKey}" not found`);
		}

		const val = typeof row.value === 'string' ? JSON.parse(row.value) : (row.value ?? {});
		val.imageUrl = newUrl;
		val.imageFormats = result.formats;

		await db
			.update(siteSettings)
			.set({ value: val })
			.where(eq(siteSettings.key, settingKey))
			.run();
	} else {
		// Update project artifact's dataBlob
		const [artifact] = await db
			.select({ dataBlob: projectArtifacts.dataBlob })
			.from(projectArtifacts)
			.where(eq(projectArtifacts.id, artifactId!))
			.limit(1)
			.all();

		if (!artifact) {
			throw error(404, 'Artifact not found');
		}

		const blob =
			typeof artifact.dataBlob === 'string'
				? JSON.parse(artifact.dataBlob)
				: (artifact.dataBlob ?? {});

		const formatsField = field === 'imageUrl' ? 'imageFormats' : 'hoverImageFormats';

		blob[field!] = newUrl;
		blob[formatsField] = result.formats;

		await db
			.update(projectArtifacts)
			.set({ dataBlob: blob })
			.where(eq(projectArtifacts.id, artifactId!))
			.run();
	}

	return json({ success: true, newUrl, formats: result.formats });
};
