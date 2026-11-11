import { describe, expect, it } from 'vitest';
import { DELETE, GET, OPTIONS, POST } from '../admin/projects/[id]/categories/+server';
import { projectCategories, projects } from '$lib/server/db/schema';

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

describe('GET /api/admin/projects/:id/categories', () => {
	it('returns 404 when the project does not exist', async () => {
		const db = createDbForGet(null, []);
		const request = new Request('http://localhost/api/projects/1/categories');

		await expect(GET({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 404
		});
	});

	it('returns categories', async () => {
		const db = createDbForGet(
			{ id: 1, isPublished: false },
			[{ id: 10, name: 'wood', displayName: 'Wood', isPublished: false }]
		);

		const request = new Request('http://localhost/api/projects/1/categories');
		const response = await GET({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual([{ id: 10, name: 'wood', displayName: 'Wood', isPublished: false }]);
	});
});

describe('POST /api/admin/projects/:id/categories', () => {
	it('adds categories', async () => {
		const db = createInsertDb();
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

describe('DELETE /api/admin/projects/:id/categories', () => {
	it('removes categories', async () => {
		const db = createDeleteDb();
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

describe('OPTIONS /api/admin/projects/:id/categories', () => {
	it('returns 200', async () => {
		const response = await OPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
