import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, OPTIONS, POST } from './[id]/categories/+server';
import { categories, projectCategories, projects } from '$lib/server/db/schema';

vi.mock('$lib/server/auth', () => ({
	verifyClerkAuth: vi.fn()
}));

import { verifyClerkAuth } from '$lib/server/auth';

const asAuth = (value: string | null) => {
	vi.mocked(verifyClerkAuth).mockResolvedValue(value);
};

const createDbForGet = (projectRow: any, categoryRows: any[]) => {
	return {
		select: () => ({
			from: (table: unknown) => {
				if (table === projects) {
					return {
						where: async () => (projectRow ? [projectRow] : [])
					};
				}
				if (table === projectCategories) {
					return {
						innerJoin: () => ({
							where: async () => categoryRows
						})
					};
				}
				return {
					where: async () => []
				};
			}
		})
	} as any;
};

const createInsertDb = () => {
	return {
		insert: () => ({
			values: () => ({
				onConflictDoNothing: async () => ({})
			})
		})
	} as any;
};

const createDeleteDb = () => {
	return {
		delete: () => ({
			where: async () => ({})
		})
	} as any;
};

beforeEach(() => {
	vi.mocked(verifyClerkAuth).mockResolvedValue(null);
});

describe('GET /api/projects/:id/categories', () => {
	it('returns 404 when project is not published and unauthenticated', async () => {
		const db = createDbForGet({ id: 1, isPublished: false }, []);
		const request = new Request('http://localhost/api/projects/1/categories');

		await expect(GET({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 404
		});
	});

	it('returns categories for authenticated user', async () => {
		const db = createDbForGet(
			{ id: 1, isPublished: false },
			[{ id: 10, name: 'wood', displayName: 'Wood', isPublished: false }]
		);

		asAuth('user_123');
		const request = new Request('http://localhost/api/projects/1/categories');
		const response = await GET({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual([{ id: 10, name: 'wood', displayName: 'Wood', isPublished: false }]);
	});
});

describe('POST /api/projects/:id/categories', () => {
	it('requires authentication', async () => {
		const db = createInsertDb();
		const request = new Request('http://localhost/api/projects/1/categories', {
			method: 'POST',
			body: JSON.stringify({ category_ids: [1] }),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(POST({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 401
		});
	});

	it('adds categories when authenticated', async () => {
		const db = createInsertDb();
		asAuth('user_123');
		const request = new Request('http://localhost/api/projects/1/categories', {
			method: 'POST',
			body: JSON.stringify({ category_ids: [1, 2] }),
			headers: { 'Content-Type': 'application/json' }
		});

		const response = await POST({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual({ success: true });
	});
});

describe('DELETE /api/projects/:id/categories', () => {
	it('requires authentication', async () => {
		const db = createDeleteDb();
		const request = new Request('http://localhost/api/projects/1/categories', {
			method: 'DELETE',
			body: JSON.stringify({ category_ids: [1] }),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(DELETE({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 401
		});
	});

	it('removes categories when authenticated', async () => {
		const db = createDeleteDb();
		asAuth('user_123');
		const request = new Request('http://localhost/api/projects/1/categories', {
			method: 'DELETE',
			body: JSON.stringify({ category_ids: [1, 2] }),
			headers: { 'Content-Type': 'application/json' }
		});

		const response = await DELETE({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual({ success: true });
	});
});

describe('OPTIONS /api/projects/:id/categories', () => {
	it('returns 200', async () => {
		const response = await OPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
