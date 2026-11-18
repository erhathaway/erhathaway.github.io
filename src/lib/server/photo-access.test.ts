import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getDb, type Db } from './db';
import { GET as image } from '../../routes/artifacts/[...path]/+server';
import { GET as legacyImage } from '../../routes/api/uploads/artifacts/+server';
import { GET as publicProjects } from '../../routes/api/projects/+server';
import { transformToModernFormats } from './image-transform';

vi.mock('./db', () => ({ getDb: vi.fn() }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
let client: Client;
let db: Db;
const bucket = {
	get: vi.fn(async () => ({ body: new Response('private image bytes').body, httpMetadata: { contentType: 'image/jpeg' } })),
	put: vi.fn(), delete: vi.fn()
};
const uuid = '12345678-abcd-abcd-abcd-123456789012';
const path = `${uuid}.jpg`;

beforeEach(async () => {
	client = createClient({ url: ':memory:' });
	await client.executeMultiple(`
		CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, display_name TEXT, description TEXT, is_published INTEGER, sort_order INTEGER DEFAULT 0);
		CREATE TABLE project_artifacts (id INTEGER PRIMARY KEY, project_id INTEGER, schema TEXT, data_blob TEXT, is_published INTEGER, sort_order INTEGER DEFAULT 0);
		CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
		CREATE TABLE project_cover_artifact (project_id INTEGER, artifact_id INTEGER, position_x REAL, position_y REAL, zoom REAL);
		CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, display_name TEXT, is_published INTEGER);
		CREATE TABLE project_categories (project_id INTEGER, category_id INTEGER);
		CREATE TABLE project_attributes (id INTEGER, project_id INTEGER, name TEXT, value TEXT, show_in_nav INTEGER, is_published INTEGER);
		INSERT INTO projects (id, name, display_name, is_published) VALUES (1, 'draft', 'Draft', 0);
		INSERT INTO project_cover_artifact (project_id, artifact_id) VALUES (1, 1);
	`);
	await client.execute({ sql: 'INSERT INTO project_artifacts (id, project_id, schema, data_blob, is_published) VALUES (1, 1, ?, ?, 0)', args: ['image-v1', JSON.stringify({ imageUrl: `/artifacts/${path}` })] });
	db = drizzle(client) as unknown as Db;
	vi.mocked(getDb).mockReturnValue(db);
	vi.clearAllMocks();
});
afterEach(() => { client.close(); vi.unstubAllGlobals(); });

function event(userId: string | null = null, headers: Record<string, string> = {}, filename = path) {
	return {
		params: { path: filename }, request: new Request(`https://erhathaway.com/artifacts/${filename}`, { headers }),
		locals: { auth: () => ({ userId }), db },
		platform: { env: { DB: {}, ARTIFACTS: bucket, ADMIN_CLERK_USER_ID: 'owner' } }
	} as unknown as Parameters<typeof image>[0];
}

describe('private and published images', () => {
	it.each([null, 'someone-else'])('denies draft bytes to %s, including spoofed resizing requests', async (userId) => {
		for (const headers of [{}, { Via: 'image-resizing' }] as Record<string, string>[]) {
			await expect(image(event(userId, headers))).rejects.toMatchObject({ status: 404 });
		}
		expect(bucket.get).not.toHaveBeenCalled();
	});
	it('lets only the owner read drafts, without shared or browser caching', async () => {
		const response = await image(event('owner'));
		expect(await response.text()).toBe('private image bytes');
		expect(response.headers.get('Cache-Control')).toBe('private, no-store');
		expect(response.headers.get('Vary')).toBe('Cookie, Authorization');
	});
	it('requires both project and artifact publication for originals and format variants', async () => {
		await client.execute('UPDATE project_artifacts SET is_published = 1');
		await expect(image(event())).rejects.toMatchObject({ status: 404 });
		await client.execute('UPDATE projects SET is_published = 1');
		for (const filename of [path, `${uuid}.webp`, `${uuid}.avif`]) {
			const response = await image(event(null, {}, filename));
			expect(response.status).toBe(200);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
		}
		await client.execute('UPDATE project_artifacts SET is_published = 0');
		await expect(image(event())).rejects.toMatchObject({ status: 404 });
	});
	it('keeps preview namecards private while serving active public namecards', async () => {
		await client.execute({ sql: 'INSERT INTO site_settings (key, value) VALUES (?, ?)', args: ['preview_namecard_image', JSON.stringify({ imageUrl: `/artifacts/${path}` })] });
		await expect(image(event())).rejects.toMatchObject({ status: 404 });
		await client.execute("UPDATE site_settings SET key = 'namecard_image'");
		expect((await image(event())).status).toBe(200);
	});
	it('routes legacy URLs through the same protection and rejects arbitrary bucket keys', async () => {
		await expect(legacyImage({ url: new URL(`https://erhathaway.com/api/uploads/artifacts?key=artifacts/${path}`) } as Parameters<typeof legacyImage>[0]))
			.rejects.toMatchObject({ status: 307, location: `/artifacts/${path}` });
		await expect(image(event())).rejects.toMatchObject({ status: 404 });
		for (const key of ['secret', '../secret', 'artifacts/../secret', 'artifacts/a.jpg?bypass=true']) {
			await expect(legacyImage({ url: new URL(`https://erhathaway.com/api/uploads/artifacts?key=${encodeURIComponent(key)}`) } as Parameters<typeof legacyImage>[0]))
				.rejects.toMatchObject({ status: 400 });
		}
		expect(bucket.get).not.toHaveBeenCalled();
	});
	it('does not expose unpublished cover URLs through the public project listing', async () => {
		await client.execute('UPDATE projects SET is_published = 1');
		const response = await publicProjects({ locals: { db } } as Parameters<typeof publicProjects>[0]);
		expect(await response.json()).toEqual([expect.objectContaining({ coverImageUrl: null, coverHoverImageUrl: null })]);
		await client.execute('UPDATE project_artifacts SET is_published = 1');
		const published = await publicProjects({ locals: { db } } as Parameters<typeof publicProjects>[0]);
		expect(await published.json()).toEqual([expect.objectContaining({ coverImageUrl: `/artifacts/${path}` })]);
	});
});

describe('private image optimization', () => {
	it('transforms R2 streams without making a public fetch or deleting a shared original', async () => {
		const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
		const output = vi.fn(async ({ format }: { format: string }) => ({ response: () => new Response('optimized', { headers: { 'Content-Type': format } }) }));
		const images = { input: vi.fn(() => ({ output })) };
		const result = await transformToModernFormats(bucket as never, `artifacts/${path}`, images as never, true);
		expect(result).toMatchObject({ ok: true, formats: ['avif', 'webp'] });
		expect(images.input).toHaveBeenCalledTimes(2);
		expect(bucket.put).toHaveBeenCalledTimes(2);
		expect(bucket.delete).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it('preserves the original if the binding is unavailable or fails', async () => {
		expect((await transformToModernFormats(bucket as never, `artifacts/${path}`, undefined)).ok).toBe(false);
		const images = { input: () => ({ output: async () => { throw new Error('Unavailable'); } }) };
		expect((await transformToModernFormats(bucket as never, `artifacts/${path}`, images as never)).ok).toBe(false);
		expect(bucket.delete).not.toHaveBeenCalled();
	});
});
