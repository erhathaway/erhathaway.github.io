import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNamecardAdmin } from './namecard-request';

afterEach(() => vi.unstubAllGlobals());

describe('name card session authentication', () => {
	it('allows a signed-in cookie session to load when the client token is not ready', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('[]'));
		vi.stubGlobal('fetch', fetchMock);
		const response = await fetchNamecardAdmin(async () => null, '/api/admin/namecards/variants');
		expect(await response.json()).toEqual([]);
		const [path, init] = fetchMock.mock.calls[0];
		expect(path).toBe('/api/admin/namecards/variants');
		expect(init.credentials).toBe('same-origin');
		expect(init.headers.has('Authorization')).toBe(false);
	});

	it('preserves request bodies and adds the token when available', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
		vi.stubGlobal('fetch', fetchMock);
		await fetchNamecardAdmin(async () => 'ready-token', '/api/admin/namecards/variants', {
			method: 'POST', body: '{"name":"Paper"}', headers: { 'Content-Type': 'application/json' }
		});
		const init = fetchMock.mock.calls[0][1];
		expect(init.method).toBe('POST');
		expect(init.body).toBe('{"name":"Paper"}');
		expect(init.headers.get('Authorization')).toBe('Bearer ready-token');
		expect(init.headers.get('Content-Type')).toBe('application/json');
	});

	it('tries the cookie session if client token retrieval fails', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
		vi.stubGlobal('fetch', fetchMock);
		await fetchNamecardAdmin(async () => { throw new Error('Clerk is still loading'); }, '/api/admin/images');
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
	});

	it('reports a sign-in error when the server rejects the session', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));
		await expect(fetchNamecardAdmin(async () => null, '/api/admin/namecards/variants')).rejects.toThrow('Your session could not be verified');
	});
});
