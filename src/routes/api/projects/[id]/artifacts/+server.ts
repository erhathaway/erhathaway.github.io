import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projectArtifacts, projectCoverArtifact, projects } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) {
		throw error(500, 'Database not available');
	}
	return db;
};

const parseId = (raw: string) => {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, 'Invalid project id');
	}
	return id;
};

const normalizeArtifactRow = <T extends { dataBlob: unknown }>(row: T) => {
	let dataBlob = row.dataBlob;
	if (typeof dataBlob === 'string') {
		try {
			dataBlob = JSON.parse(dataBlob);
		} catch {
			dataBlob = row.dataBlob;
		}
	}
	return { ...row, dataBlob };
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project || !project.isPublished) {
		throw error(404, 'Project not found');
	}

	const [coverRow] = await db
		.select({ artifactId: projectCoverArtifact.artifactId })
		.from(projectCoverArtifact)
		.where(eq(projectCoverArtifact.projectId, projectId));
	const coverArtifactId = coverRow?.artifactId ?? null;

	const rows = await db
		.select({
			id: projectArtifacts.id,
			projectId: projectArtifacts.projectId,
			schema: projectArtifacts.schema,
			dataBlob: projectArtifacts.dataBlob,
			isPublished: projectArtifacts.isPublished
		})
		.from(projectArtifacts)
		.where(and(eq(projectArtifacts.projectId, projectId), eq(projectArtifacts.isPublished, true)));

	const normalized = rows.map((row) => ({
		...normalizeArtifactRow(row),
		isCover: row.id === coverArtifactId
	}));

	return json(normalized, { headers: corsHeaders });
};
