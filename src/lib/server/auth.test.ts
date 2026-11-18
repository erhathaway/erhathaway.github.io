import { describe, expect, it, vi } from 'vitest';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { readdirSync } from 'node:fs';
import { adminAuthHandle, isAdmin } from './auth';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
const owner = 'user_owner';
const routes = readdirSync('src/routes', { recursive: true, encoding: 'utf8' })
	.filter((file) => /\+(?:page|server)\.(?:svelte|ts)$/.test(file) &&
		(file.startsWith('admin/') || file.startsWith('api/admin/')))
	.map((file) => '/' + file.substring(0, file.lastIndexOf('/')));
const protectedRoutes = [...new Set([...routes, '/api/integrations/google-photos/callback'])];

function event(route: string, userId: string | null, method = 'GET', headers: Record<string, string> = {}) {
	const url = new URL(`https://erhathaway.com${route}`);
	return {
		url, request: new Request(url, { method, headers }), route: { id: route },
		locals: { auth: () => ({ userId }) }, platform: { env: { ADMIN_CLERK_USER_ID: owner } }
	} as unknown as RequestEvent;
}
const run = (request: RequestEvent, resolve = vi.fn(async () => new Response('ok'))) =>
	adminAuthHandle({ event: request, resolve } as Parameters<Handle>[0]);

describe('owner-only server boundary', () => {
	it.each(protectedRoutes)('denies another signed-in account at %s', async (route) => {
		const resolve = vi.fn();
		await expect(run(event(route, 'user_someone_else'), resolve)).rejects.toMatchObject({ status: 403 });
		expect(resolve).not.toHaveBeenCalled();
	});
	it.each(protectedRoutes.filter((route) => route.startsWith('/api/')))('denies anonymous access at %s', async (route) => {
		await expect(run(event(route, null))).rejects.toMatchObject({ status: 401 });
	});
	it('does not trust an arbitrary bearer token or a spoofed resizing header', async () => {
		await expect(run(event('/api/admin/integrations/google-photos/sessions/[sessionId]', null, 'GET', {
			Authorization: 'Bearer unverified-token', Via: 'image-resizing'
		}))).rejects.toMatchObject({ status: 401 });
	});
	it('uses resolved routes for encoded paths and SvelteKit data requests', async () => {
		const request = event('/api/admin/projects', 'user_someone_else');
		request.url = new URL('https://erhathaway.com/api/%61dmin/projects');
		await expect(run(request)).rejects.toMatchObject({ status: 403 });
		const data = event('/admin/projects/[id]', 'user_someone_else');
		data.url = new URL('https://erhathaway.com/admin/projects/1/__data.json');
		await expect(run(data)).rejects.toMatchObject({ status: 403 });
	});
	it('fails closed when no owner is configured', () => {
		expect(isAdmin(event('/admin', owner).locals, {})).toBe(false);
	});
	it('allows the owner, prevents shared caching, and removes wildcard CORS', async () => {
		const resolve = vi.fn(async () => new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public' } }));
		const result = await run(event('/api/admin/integrations/google-photos/sessions/[sessionId]', owner), resolve);
		expect(await result.text()).toBe('ok');
		expect(result.headers.get('Cache-Control')).toBe('private, no-store');
		expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});
	it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('denies cross-origin %s even for the owner', async (method) => {
		await expect(run(event('/api/admin/projects', owner, method, { origin: 'https://attacker.test' })))
			.rejects.toMatchObject({ status: 403 });
	});
	it('allows same-origin changes and public portfolio reads', async () => {
		expect((await run(event('/api/admin/projects', owner, 'POST', { origin: 'https://erhathaway.com' }))).status).toBe(200);
		expect((await run(event('/api/projects', null))).status).toBe(200);
	});
	it('sends signed-out admin page visitors to the public sign-in entry point', async () => {
		await expect(run(event('/admin', null))).rejects.toMatchObject({ status: 307, location: '/' });
	});
});
