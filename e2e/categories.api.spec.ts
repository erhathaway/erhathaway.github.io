import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL;
const token = process.env.CLERK_TEST_TOKEN;

const hasEnv = Boolean(baseURL && token);

test.describe('categories api (integration)', () => {
	test.skip(!hasEnv, 'E2E_BASE_URL and CLERK_TEST_TOKEN are required');

	test('auth can read unpublished; public cannot', async ({ request }) => {
		const api = await request.newContext({ baseURL });
		const name = `e2e-cat-${Date.now()}`;

		const create = await api.post('/api/categories', {
			headers: { Authorization: `Bearer ${token}` },
			data: { name, displayName: 'E2E Category', isPublished: false }
		});
		expect(create.ok()).toBe(true);
		const created = await create.json();

		const publicList = await api.get('/api/categories');
		expect(publicList.ok()).toBe(true);
		const publicItems = await publicList.json();
		expect(publicItems.find((item: any) => item.id === created.id)).toBeUndefined();

		const authedList = await api.get('/api/categories', {
			headers: { Authorization: `Bearer ${token}` }
		});
		expect(authedList.ok()).toBe(true);
		const authedItems = await authedList.json();
		expect(authedItems.find((item: any) => item.id === created.id)).toBeTruthy();

		const cleanup = await api.delete(`/api/categories/${created.id}`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		expect(cleanup.ok()).toBe(true);
	});
});
