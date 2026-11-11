/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { GET, OPTIONS } from './[id]/artifacts/+server';
import { GET as adminGET, POST } from '../admin/projects/[id]/artifacts/+server';
import { projectArtifacts, projectCoverArtifact, projects } from '$lib/server/db/schema';
import { mockDb } from '../test-db';

const image = {
	id: 10,
	projectId: 1,
	schema: 'image-v1',
	dataBlob: { imageUrl: 'https://example.com/image.jpg' },
	isPublished: true
};

const event = (db: unknown, request?: Request) =>
	({ params: { id: '1' }, request, locals: { db } }) as any;

describe('GET /api/projects/:id/artifacts', () => {
	it('returns 404 when the project is not published', async () => {
		const { db } = mockDb([[projects, [{ id: 1, isPublished: false }]]]);

		await expect(GET(event(db))).rejects.toMatchObject({ status: 404 });
	});

	it('returns the artifacts of a published project and marks the cover', async () => {
		const { db } = mockDb([
			[projects, [{ id: 1, isPublished: true }]],
			[projectCoverArtifact, [{ artifactId: 10 }]],
			[projectArtifacts, [image, { ...image, id: 11 }]]
		]);

		const response = await GET(event(db));

		expect(await response.json()).toEqual([
			{ ...image, isCover: true },
			{ ...image, id: 11, isCover: false }
		]);
	});
});

describe('GET /api/admin/projects/:id/artifacts', () => {
	it('returns 404 when the project does not exist', async () => {
		const { db } = mockDb();

		await expect(adminGET(event(db))).rejects.toMatchObject({ status: 404 });
	});

	it('returns unpublished artifacts too, with their cover framing', async () => {
		const draft = { ...image, isPublished: false };
		const { db } = mockDb([
			[projects, [{ id: 1, isPublished: false }]],
			[
				projectArtifacts,
				[
					{ ...draft, coverArtifactId: 10, coverPositionX: 20, coverPositionY: 30, coverZoom: 1.5 },
					{ ...draft, id: 11, coverArtifactId: null, coverPositionX: null, coverPositionY: null, coverZoom: null }
				]
			]
		]);

		const response = await adminGET(event(db));

		expect(await response.json()).toEqual([
			{ ...draft, coverArtifactId: 10, isCover: true, coverPositionX: 20, coverPositionY: 30, coverZoom: 1.5 },
			{ ...draft, id: 11, coverArtifactId: null, isCover: false, coverPositionX: 50, coverPositionY: 50, coverZoom: 1 }
		]);
	});
});

describe('POST /api/admin/projects/:id/artifacts', () => {
	const post = (body: unknown) =>
		new Request('http://localhost/api/admin/projects/1/artifacts', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		});

	it('creates an artifact', async () => {
		const { db } = mockDb([[projects, [{ id: 1, isPublished: true }]]], { inserted: [image] });
		const request = post({ schema: image.schema, dataBlob: image.dataBlob, isPublished: true });

		const response = await POST(event(db, request));

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ ...image, isCover: false });
	});

	it('rejects a payload without a schema', async () => {
		const { db } = mockDb([[projects, [{ id: 1, isPublished: true }]]]);

		await expect(POST(event(db, post({ dataBlob: image.dataBlob })))).rejects.toMatchObject({
			status: 400
		});
	});
});

describe('OPTIONS /api/projects/:id/artifacts', () => {
	it('returns 200', async () => {
		const response = await OPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
