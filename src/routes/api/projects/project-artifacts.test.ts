import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, OPTIONS, POST } from './[id]/artifacts/+server';
import { projectArtifacts, projects } from '$lib/server/db/schema';

vi.mock('$lib/server/auth', () => ({
	verifyClerkAuth: vi.fn()
}));

import { verifyClerkAuth } from '$lib/server/auth';

const asAuth = (value: string | null) => {
	vi.mocked(verifyClerkAuth).mockResolvedValue(value);
};

const createDbForGet = (projectRow: any, artifactRows: any[]) => {
	return {
		select: (selection?: unknown) => ({
			from: (table: unknown) => ({
				where: async () => {
					if (table === projects) {
						return projectRow ? [projectRow] : [];
					}
					if (table === projectArtifacts) {
						return artifactRows;
					}
					return [];
				}
			})
		})
	} as any;
};

const createDbForPost = (projectRow: any, created: any) => {
	return {
		select: () => ({
			from: () => ({
				where: async () => (projectRow ? [projectRow] : [])
			})
		}),
		insert: () => ({
			values: () => ({
				returning: async () => [created]
			})
		})
	} as any;
};

beforeEach(() => {
	vi.mocked(verifyClerkAuth).mockResolvedValue(null);
});

describe('GET /api/projects/:id/artifacts', () => {
	it('returns 404 when project is not published and unauthenticated', async () => {
		const db = createDbForGet({ id: 1, isPublished: false }, []);
		const request = new Request('http://localhost/api/projects/1/artifacts');

		await expect(GET({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 404
		});
	});

	it('returns artifacts for authenticated user', async () => {
		const rows = [
			{ id: 10, projectId: 1, schemaVersion: 1, dataBlob: { ok: true }, isPublished: false }
		];
		const db = createDbForGet({ id: 1, isPublished: false }, rows);
		asAuth('user_123');
		const request = new Request('http://localhost/api/projects/1/artifacts');
		const response = await GET({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(rows);
	});
});

describe('POST /api/projects/:id/artifacts', () => {
	it('requires authentication', async () => {
		const db = createDbForPost({ id: 1, isPublished: true }, { id: 10 });
		const request = new Request('http://localhost/api/projects/1/artifacts', {
			method: 'POST',
			body: JSON.stringify({ schemaVersion: 1, dataBlob: { ok: true } }),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(POST({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 401
		});
	});

	it('creates artifact when authenticated', async () => {
		const created = {
			id: 10,
			projectId: 1,
			schemaVersion: 1,
			dataBlob: { ok: true },
			isPublished: true
		};
		const db = createDbForPost({ id: 1, isPublished: true }, created);
		asAuth('user_123');
		const request = new Request('http://localhost/api/projects/1/artifacts', {
			method: 'POST',
			body: JSON.stringify({ schemaVersion: 1, dataBlob: { ok: true }, isPublished: true }),
			headers: { 'Content-Type': 'application/json' }
		});

		const response = await POST({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(created);
	});
});

describe('OPTIONS /api/projects/:id/artifacts', () => {
	it('returns 200', async () => {
		const response = await OPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
