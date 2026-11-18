import { describe, expect, it } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { beginGoogleOAuth, consumeGoogleOAuth } from './google-oauth';
import { buildOAuthUrl } from './google-photos';

export function cookieJar() {
	const values = new Map<string, string>();
	const options = new Map<string, unknown>();
	const cookies = {
		get: (key: string) => values.get(key),
		set: (key: string, value: string, opts: unknown) => { values.set(key, value); options.set(key, opts); },
		delete: (key: string) => values.delete(key)
	} as unknown as Cookies;
	return { cookies, values, options };
}
const url = new URL('https://erhathaway.com/api/integrations/google-photos/callback');

describe('Google OAuth request binding', () => {
	it('sets secure browser state and PKCE, binds to the user, and consumes it once', async () => {
		const jar = cookieJar();
		const flow = await beginGoogleOAuth(jar.cookies, url, 'owner');
		const auth = new URL(buildOAuthUrl({ GOOGLE_CLIENT_ID: 'client' }, url.href, flow));
		expect(auth.searchParams.get('state')).toBe(flow.state);
		expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
		expect(jar.options.get('__Host-google-photos-oauth')).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
		const callback = new URL(url); callback.searchParams.set('state', flow.state);
		const verifier = consumeGoogleOAuth(jar.cookies, callback, 'owner');
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
		expect(Buffer.from(digest).toString('base64url')).toBe(flow.challenge);
		expect(() => consumeGoogleOAuth(jar.cookies, callback, 'owner')).toThrow();
	});
	it.each(['missing-cookie', 'missing-state', 'wrong-state', 'wrong-owner', 'expired', 'malformed'])('rejects %s before exchanging credentials', async (kind) => {
		const jar = cookieJar();
		const flow = await beginGoogleOAuth(jar.cookies, url, 'owner');
		const callback = new URL(url); callback.searchParams.set('state', flow.state);
		if (kind === 'missing-cookie') jar.values.clear();
		if (kind === 'missing-state') callback.searchParams.delete('state');
		if (kind === 'wrong-state') callback.searchParams.set('state', 'attacker');
		if (kind === 'expired') {
			const value = JSON.parse(jar.values.get('__Host-google-photos-oauth')!);
			jar.values.set('__Host-google-photos-oauth', JSON.stringify({ ...value, expires: 1 }));
		}
		if (kind === 'malformed') jar.values.set('__Host-google-photos-oauth', '{bad');
		expect(() => consumeGoogleOAuth(jar.cookies, callback, kind === 'wrong-owner' ? 'someone-else' : 'owner')).toThrow();
	});
});
