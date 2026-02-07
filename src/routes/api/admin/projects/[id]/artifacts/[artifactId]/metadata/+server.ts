import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { artifactMetadata } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ platform, params }) => {
	const env = platform?.env;
	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const artifactId = Number(params.artifactId);
	if (!artifactId) {
		throw error(400, 'Invalid artifact ID');
	}

	const row = await db
		.select()
		.from(artifactMetadata)
		.where(eq(artifactMetadata.artifactId, artifactId))
		.get();

	if (!row) {
		throw error(404, 'No metadata for this artifact');
	}

	return json(
		{
			metadata: row.metadata,
			source: row.source,
			createdAt: row.createdAt
		},
		{ headers: corsHeaders }
	);
};
