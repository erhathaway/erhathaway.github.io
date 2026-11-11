import { describe, expect, it } from 'vitest';
import { GET, OPTIONS, POST, PUT } from '../admin/projects/[id]/attributes/+server';
import { projectAttributes, projects } from '$lib/server/db/schema';

const createDbForGet = (projectRow: any, attributeRows: any[]) => {
	return {
		select: (selection?: unknown) => ({
			from: (table: unknown) => ({
				where: async () => {
					if (table === projects) {
						return projectRow ? [projectRow] : [];
					}
					if (table === projectAttributes) {
						return attributeRows;
					}
					return [];
				}
			})
		})
	} as any;
};

const createDbForPost = (projectRow: any, created: any[]) => {
	return {
		select: () => ({
			from: () => ({
				where: async () => (projectRow ? [projectRow] : [])
			})
		}),
		insert: () => ({
			values: () => ({
				returning: async () => created
			})
		})
	} as any;
};

const createDbForPut = (projectRow: any, existingRows: any[], finalRows: any[]) => {
	return {
		select: (selection?: unknown) => ({
			from: (table: unknown) => ({
				where: async () => {
					if (table === projects) {
						return projectRow ? [projectRow] : [];
					}
					if (table === projectAttributes) {
						const keyCount =
							selection && typeof selection === 'object'
								? Object.keys(selection as Record<string, unknown>).length
								: 0;
						return keyCount <= 1 ? existingRows : finalRows;
					}
					return [];
				}
			})
		}),
		update: () => ({
			set: () => ({
				where: async () => ({})
			})
		}),
		insert: () => ({
			values: async () => ({})
		}),
		delete: () => ({
			where: async () => ({})
		})
	} as any;
};

describe('GET /api/admin/projects/:id/attributes', () => {
	it('returns 404 when the project does not exist', async () => {
		const db = createDbForGet(null, []);
		const request = new Request('http://localhost/api/projects/1/attributes');

		await expect(GET({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
			status: 404
		});
	});

	it('returns attributes', async () => {
		const db = createDbForGet(
			{ id: 1, isPublished: false },
			[{ id: 10, name: 'Material', value: 'Walnut', showInNav: true, isPublished: false }]
		);
		const request = new Request('http://localhost/api/projects/1/attributes');
		const response = await GET({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual([
			{ id: 10, name: 'Material', value: 'Walnut', showInNav: true, isPublished: false }
		]);
	});
});

describe('POST /api/admin/projects/:id/attributes', () => {
	it('creates attributes', async () => {
		const created = [
			{ id: 10, projectId: 1, name: 'Material', value: 'Walnut', showInNav: true, isPublished: true }
		];
		const db = createDbForPost({ id: 1, isPublished: true }, created);
		const request = new Request('http://localhost/api/projects/1/attributes', {
			method: 'POST',
			body: JSON.stringify({ attributes: [{ name: 'Material', value: 'Walnut', showInNav: true, isPublished: true }] }),
			headers: { 'Content-Type': 'application/json' }
		});
		const response = await POST({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(created);
	});
});

describe('PUT /api/admin/projects/:id/attributes', () => {
	it('updates attributes', async () => {
		const existing = [{ id: 10 }];
		const final = [
			{ id: 10, name: 'Material', value: 'Walnut', showInNav: true, isPublished: true },
			{ id: 11, name: 'Finish', value: 'Oil', showInNav: false, isPublished: false }
		];
		const db = createDbForPut({ id: 1, isPublished: true }, existing, final);
		const request = new Request('http://localhost/api/projects/1/attributes', {
			method: 'PUT',
			body: JSON.stringify({
				attributes: [
					{ id: 10, name: 'Material', value: 'Walnut', showInNav: true, isPublished: true },
					{ name: 'Finish', value: 'Oil', showInNav: false, isPublished: false }
				]
			}),
			headers: { 'Content-Type': 'application/json' }
		});
		const response = await PUT({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(final);
	});
});

describe('OPTIONS /api/admin/projects/:id/attributes', () => {
	it('returns 200', async () => {
		const response = await OPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
