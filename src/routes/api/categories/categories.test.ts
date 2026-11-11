import { describe, expect, it } from 'vitest';
import { GET as listGET, OPTIONS as listOPTIONS } from './+server';
import { GET as adminListGET, POST as listPOST } from '../admin/categories/+server';
import {
	GET as itemGET,
	PUT as itemPUT,
	DELETE as itemDELETE,
	OPTIONS as itemOPTIONS
} from '../admin/categories/[id]/+server';

const createListDb = (rows: any[]) => {
	let whereCalled = false;
	const db = {
		select: () => ({
			from: () => ({
				where: async () => {
					whereCalled = true;
					return rows;
				}
			})
		})
	} as any;

	return { db, getWhereCalled: () => whereCalled };
};

const createItemDb = (rows: any[]) => {
	let whereCalled = false;
	const db = {
		select: () => ({
			from: () => ({
				where: async () => {
					whereCalled = true;
					return rows;
				}
			})
		})
	} as any;

	return { db, getWhereCalled: () => whereCalled };
};

const createInsertDb = (created: any) => {
	return {
		insert: () => ({
			values: () => ({
				returning: async () => [created]
			})
		})
	} as any;
};

const createUpdateDb = (updated: any) => {
	return {
		update: () => ({
			set: () => ({
				where: () => ({
					returning: async () => (updated ? [updated] : [])
				})
			})
		})
	} as any;
};

const createDeleteDb = (deleted: any) => {
	return {
		delete: () => ({
			where: () => ({
				returning: async () => (deleted ? [deleted] : [])
			})
		})
	} as any;
};

const makeRequest = (body?: unknown, token?: string) => {
	const headers = new Headers();
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}
	if (body !== undefined) {
		headers.set('Content-Type', 'application/json');
	}
	return new Request('http://localhost/api/categories', {
		method: body === undefined ? 'GET' : 'POST',
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
};

describe('GET /api/categories', () => {
	it('returns only published categories', async () => {
		const rows = [
			{ id: 1, name: 'wood', displayName: 'Wood', isPublished: true },
			{ id: 2, name: 'food', displayName: 'Food', isPublished: true }
		];
		const { db, getWhereCalled } = createListDb(rows);

		const request = makeRequest();
		const response = await listGET({ request, locals: { db } } as any);
		const body = await response.json();

		expect(getWhereCalled()).toBe(true);
		expect(body).toEqual(rows);
	});

	it('returns all categories from the admin endpoint', async () => {
		const rows = [
			{ id: 1, name: 'wood', displayName: 'Wood', isPublished: false },
			{ id: 2, name: 'food', displayName: 'Food', isPublished: true }
		];
		const db = {
			select: () => ({
				from: async () => rows
			})
		} as any;

		const request = makeRequest(undefined, 'token');
		const response = await adminListGET({ request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(rows);
	});
});

describe('POST /api/admin/categories', () => {
	it('creates a category', async () => {
		const created = { id: 1, name: 'wood', displayName: 'Wood', isPublished: true };
		const db = createInsertDb(created);

		const request = makeRequest({ name: 'wood', displayName: 'Wood', isPublished: true }, 'token');
		const response = await listPOST({ request, locals: { db } } as any);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(created);
	});

	it('validates required fields', async () => {
		const db = createInsertDb({ id: 1 });
		const request = makeRequest({ name: '' }, 'token');

		await expect(listPOST({ request, locals: { db } } as any)).rejects.toMatchObject({
			status: 400
		});
	});
});

describe('GET /api/admin/categories/:id', () => {
	it('returns 404 when the category does not exist', async () => {
		const { db } = createItemDb([]);
		const request = makeRequest();

		await expect(
			itemGET({ params: { id: '1' }, request, locals: { db } } as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns item', async () => {
		const rows = [{ id: 1, name: 'wood', displayName: 'Wood', isPublished: false }];
		const { db } = createItemDb(rows);
		const request = makeRequest(undefined, 'token');

		const response = await itemGET({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(rows[0]);
	});
});

describe('PUT /api/admin/categories/:id', () => {
	it('updates a category', async () => {
		const updated = { id: 1, name: 'wood', displayName: 'Wood', isPublished: false };
		const db = createUpdateDb(updated);
		const request = makeRequest({ name: 'wood', displayName: 'Wood' }, 'token');

		const response = await itemPUT({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(updated);
	});
});

describe('DELETE /api/admin/categories/:id', () => {
	it('deletes a category', async () => {
		const db = createDeleteDb({ id: 1 });
		const request = makeRequest(undefined, 'token');

		const response = await itemDELETE({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual({ success: true });
	});
});

describe('OPTIONS /api/categories', () => {
	it('returns 200 for list endpoint', async () => {
		const response = await listOPTIONS({} as any);
		expect(response.status).toBe(200);
	});

	it('returns 200 for item endpoint', async () => {
		const response = await itemOPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
