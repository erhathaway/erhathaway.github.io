import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listGET, POST as listPOST, OPTIONS as listOPTIONS } from './+server';
import {
	DELETE as itemDELETE,
	GET as itemGET,
	OPTIONS as itemOPTIONS,
	PUT as itemPUT
} from './[id]/+server';

vi.mock('$lib/server/auth', () => ({
	verifyClerkAuth: vi.fn()
}));

import { verifyClerkAuth } from '$lib/server/auth';

const asAuth = (value: string | null) => {
	vi.mocked(verifyClerkAuth).mockResolvedValue(value);
};

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
	return new Request('http://localhost/api/projects', {
		method: body === undefined ? 'GET' : 'POST',
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
};

beforeEach(() => {
	vi.mocked(verifyClerkAuth).mockResolvedValue(null);
});

describe('GET /api/projects', () => {
	it('returns only published projects when unauthenticated', async () => {
		const rows = [
			{ id: 1, name: 'table', displayName: 'Table', description: 'Wood', isPublished: true }
		];
		const { db, getWhereCalled } = createListDb(rows);

		const request = makeRequest();
		const response = await listGET({ request, locals: { db } } as any);
		const body = await response.json();

		expect(getWhereCalled()).toBe(true);
		expect(body).toEqual(rows);
	});

	it('returns all projects when authenticated', async () => {
		const rows = [
			{ id: 1, name: 'table', displayName: 'Table', description: 'Wood', isPublished: false }
		];
		const db = {
			select: () => ({
				from: async () => rows
			})
		} as any;

		asAuth('user_123');
		const request = makeRequest(undefined, 'token');
		const response = await listGET({ request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(rows);
	});
});

describe('POST /api/projects', () => {
	it('requires authentication', async () => {
		const db = createInsertDb({ id: 1 });
		const request = makeRequest({ name: 'table', description: 'Wood' });

		await expect(listPOST({ request, locals: { db } } as any)).rejects.toMatchObject({
			status: 401
		});
	});

	it('creates a project when authenticated', async () => {
		const created = {
			id: 1,
			name: 'table',
			displayName: 'Table',
			description: 'Wood',
			isPublished: true
		};
		const db = createInsertDb(created);

		asAuth('user_123');
		const request = makeRequest(
			{ name: 'table', displayName: 'Table', description: 'Wood', isPublished: true },
			'token'
		);
		const response = await listPOST({ request, locals: { db } } as any);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(created);
	});

	it('validates required fields', async () => {
		const db = createInsertDb({ id: 1 });
		asAuth('user_123');
		const request = makeRequest({ name: '' }, 'token');

		await expect(listPOST({ request, locals: { db } } as any)).rejects.toMatchObject({
			status: 400
		});
	});
});

describe('GET /api/projects/:id', () => {
	it('returns 404 for unpublished when unauthenticated', async () => {
		const { db } = createItemDb([]);
		const request = makeRequest();

		await expect(
			itemGET({ params: { id: '1' }, request, locals: { db } } as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns item when authenticated', async () => {
		const rows = [
			{ id: 1, name: 'table', displayName: 'Table', description: 'Wood', isPublished: false }
		];
		const { db } = createItemDb(rows);
		asAuth('user_123');
		const request = makeRequest(undefined, 'token');

		const response = await itemGET({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(rows[0]);
	});
});

describe('PUT /api/projects/:id', () => {
	it('requires authentication', async () => {
		const db = createUpdateDb({ id: 1 });
		const request = makeRequest({ name: 'table', description: 'Wood' });

		await expect(
			itemPUT({ params: { id: '1' }, request, locals: { db } } as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('updates a project when authenticated', async () => {
		const updated = {
			id: 1,
			name: 'table',
			displayName: 'Table',
			description: 'Wood',
			isPublished: false
		};
		const db = createUpdateDb(updated);
		asAuth('user_123');
		const request = makeRequest({ name: 'table', displayName: 'Table', description: 'Wood' }, 'token');

		const response = await itemPUT({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual(updated);
	});
});

describe('DELETE /api/projects/:id', () => {
	it('requires authentication', async () => {
		const db = createDeleteDb({ id: 1 });
		const request = makeRequest();

		await expect(
			itemDELETE({ params: { id: '1' }, request, locals: { db } } as any)
		).rejects.toMatchObject({ status: 401 });
	});

	it('deletes a project when authenticated', async () => {
		const db = createDeleteDb({ id: 1 });
		asAuth('user_123');
		const request = makeRequest(undefined, 'token');

		const response = await itemDELETE({ params: { id: '1' }, request, locals: { db } } as any);
		const body = await response.json();

		expect(body).toEqual({ success: true });
	});
});

describe('OPTIONS /api/projects', () => {
	it('returns 200 for list endpoint', async () => {
		const response = await listOPTIONS({} as any);
		expect(response.status).toBe(200);
	});

	it('returns 200 for item endpoint', async () => {
		const response = await itemOPTIONS({} as any);
		expect(response.status).toBe(200);
	});
});
