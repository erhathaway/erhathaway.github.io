/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { GET as listGET, OPTIONS as listOPTIONS } from './+server';
import { GET as adminListGET, POST as listPOST } from '../admin/projects/+server';
import {
	DELETE as itemDELETE,
	GET as itemGET,
	OPTIONS as itemOPTIONS,
	PUT as itemPUT
} from '../admin/projects/[id]/+server';
import {
	projectArtifacts,
	projectAttributes,
	projectCategories,
	projects
} from '$lib/server/db/schema';
import { mockDb } from '../test-db';

const table = { id: 1, name: 'table', displayName: 'Table', description: null, isPublished: true };

/** A project row as the list and item queries select it, joined to its cover. */
const joined = (project: typeof table, cover = false) => ({
	...project,
	coverArtifactDataBlob: cover
		? { imageUrl: '/artifacts/cover.jpg', hoverImageUrl: '/artifacts/hover.jpg' }
		: null,
	coverPositionX: cover ? 20 : null,
	coverPositionY: cover ? 30 : null,
	coverZoom: cover ? 1.5 : null
});

const withoutCover = {
	coverImageUrl: null,
	coverHoverImageUrl: null,
	coverPositionX: 50,
	coverPositionY: 50,
	coverZoom: 1
};

const makeRequest = (body?: unknown) =>
	new Request('http://localhost/api/projects', {
		method: body === undefined ? 'GET' : 'POST',
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});

describe('GET /api/projects', () => {
	it('returns published projects with their cover, categories and nav attributes', async () => {
		const { db, steps } = mockDb([
			[projects, [joined(table, true)]],
			[projectCategories, [{ projectId: 1, categoryName: 'Wood' }]],
			[projectAttributes, [{ projectId: 1, name: 'Material', value: 'Walnut' }]]
		]);

		const response = await listGET({ request: makeRequest(), locals: { db } } as any);

		expect(steps.get(projects)).toContain('where');
		expect(await response.json()).toEqual([
			{
				...table,
				coverImageUrl: '/artifacts/cover.jpg',
				coverHoverImageUrl: '/artifacts/hover.jpg',
				coverPositionX: 20,
				coverPositionY: 30,
				coverZoom: 1.5,
				categories: ['Wood'],
				navAttributes: [{ name: 'Material', value: 'Walnut' }]
			}
		]);
	});
});

describe('GET /api/admin/projects', () => {
	it('returns every project, published or not', async () => {
		const draft = { ...table, isPublished: false };
		const { db, steps } = mockDb([[projects, [joined(draft)]]]);

		const response = await adminListGET({ request: makeRequest(), locals: { db } } as any);

		expect(steps.get(projects)).not.toContain('where');
		expect(await response.json()).toEqual([
			{ ...draft, ...withoutCover, categories: [], navAttributes: [] }
		]);
	});
});

describe('POST /api/admin/projects', () => {
	it('creates a project', async () => {
		const { db } = mockDb([[projects, [{ maxOrder: 3 }]]], { inserted: [table] });
		const request = makeRequest({ name: 'table', displayName: 'Table', isPublished: true });

		const response = await listPOST({ request, locals: { db } } as any);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual(table);
	});

	it('validates required fields', async () => {
		const { db } = mockDb();
		const request = makeRequest({ name: '' });

		await expect(listPOST({ request, locals: { db } } as any)).rejects.toMatchObject({
			status: 400
		});
	});
});

describe('GET /api/admin/projects/:id', () => {
	it('returns 404 when the project does not exist', async () => {
		const { db } = mockDb();

		await expect(
			itemGET({ params: { id: '1' }, request: makeRequest(), locals: { db } } as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('returns an unpublished project', async () => {
		const draft = { ...table, isPublished: false };
		const { db } = mockDb([
			[projects, [joined(draft)]],
			[projectCategories, [{ categoryName: 'Wood' }]],
			[projectAttributes, [{ name: 'Material', value: 'Walnut' }]]
		]);

		const response = await itemGET({
			params: { id: '1' },
			request: makeRequest(),
			locals: { db }
		} as any);

		expect(await response.json()).toEqual({
			...draft,
			...withoutCover,
			categories: ['Wood'],
			navAttributes: [{ name: 'Material', value: 'Walnut' }]
		});
	});
});

describe('PUT /api/admin/projects/:id', () => {
	it('updates a project', async () => {
		const updated = { ...table, isPublished: false };
		const { db } = mockDb([], { updated: [updated] });
		const request = makeRequest({ name: 'table', displayName: 'Table' });

		const response = await itemPUT({ params: { id: '1' }, request, locals: { db } } as any);

		expect(await response.json()).toEqual(updated);
	});

	it('returns 404 when the project does not exist', async () => {
		const { db } = mockDb();
		const request = makeRequest({ name: 'table' });

		await expect(
			itemPUT({ params: { id: '1' }, request, locals: { db } } as any)
		).rejects.toMatchObject({ status: 404 });
	});
});

describe('DELETE /api/admin/projects/:id', () => {
	it('deletes a project', async () => {
		const { db } = mockDb([[projectArtifacts, []]], { deleted: [{ id: 1 }] });

		const response = await itemDELETE({
			params: { id: '1' },
			request: makeRequest(),
			locals: { db }
		} as any);

		expect(await response.json()).toEqual({ success: true });
	});

	it('returns 404 when the project does not exist', async () => {
		const { db } = mockDb();

		await expect(
			itemDELETE({ params: { id: '1' }, request: makeRequest(), locals: { db } } as any)
		).rejects.toMatchObject({ status: 404 });
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
