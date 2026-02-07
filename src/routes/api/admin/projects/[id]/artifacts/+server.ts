import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projectArtifacts, projects, projectCoverArtifact } from '$lib/server/db/schema';
import { validateArtifactData } from '$lib/schemas/artifacts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type ArtifactInput = {
	schema: string;
	dataBlob: unknown;
	isPublished?: boolean;
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

const fetchProjectOrThrow = async (
	db: ReturnType<App.Locals['db']>,
	projectId: number
) => {
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) {
		throw error(404, 'Project not found');
	}
	return project;
};

const parseArtifact = (payload: unknown) => {
	if (!payload || typeof payload !== 'object') {
		throw error(400, 'Invalid artifact payload');
	}
	const data = payload as ArtifactInput;
	if (typeof data.schema !== 'string' || data.schema.trim().length === 0) {
		throw error(400, 'schema must be a non-empty string');
	}
	if (data.dataBlob === undefined) {
		throw error(400, 'dataBlob is required');
	}
	let parsedBlob = data.dataBlob;
	if (typeof data.dataBlob === 'string') {
		try {
			parsedBlob = JSON.parse(data.dataBlob);
		} catch {
			throw error(400, 'dataBlob must be valid JSON');
		}
	}
	const schema = data.schema.trim();
	const validation = validateArtifactData(schema, parsedBlob);
	if (!validation.ok) {
		throw error(400, validation.errors.join('; '));
	}

	return {
		schema,
		dataBlob: validation.value,
		isPublished: data.isPublished ?? false
	};
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
	await fetchProjectOrThrow(db, projectId);

	const rows = await db
		.select({
			id: projectArtifacts.id,
			projectId: projectArtifacts.projectId,
			schema: projectArtifacts.schema,
			dataBlob: projectArtifacts.dataBlob,
			isPublished: projectArtifacts.isPublished,
			coverArtifactId: projectCoverArtifact.artifactId,
			coverPositionX: projectCoverArtifact.positionX,
			coverPositionY: projectCoverArtifact.positionY,
			coverZoom: projectCoverArtifact.zoom
		})
		.from(projectArtifacts)
		.leftJoin(
			projectCoverArtifact,
			and(
				eq(projectCoverArtifact.projectId, projectArtifacts.projectId),
				eq(projectCoverArtifact.artifactId, projectArtifacts.id)
			)
		)
		.where(eq(projectArtifacts.projectId, projectId));

	const normalized = rows.map((row) => ({
		...normalizeArtifactRow(row),
		isCover: row.coverArtifactId !== null,
		coverPositionX: row.coverPositionX ?? 50,
		coverPositionY: row.coverPositionY ?? 50,
		coverZoom: row.coverZoom ?? 1
	}));

	return json(normalized, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);
	await fetchProjectOrThrow(db, projectId);
	const artifact = parseArtifact(await request.json());

	const [created] = await db
		.insert(projectArtifacts)
		.values({
			projectId,
			schema: artifact.schema,
			dataBlob: artifact.dataBlob,
			isPublished: artifact.isPublished
		})
		.returning();

	return json({ ...normalizeArtifactRow(created), isCover: false }, { status: 201, headers: corsHeaders });
};
