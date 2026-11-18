import { error, type Cookies } from '@sveltejs/kit';

const cookieName = (url: URL) => url.protocol === 'https:' ? '__Host-google-photos-oauth' : 'google-photos-oauth';
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
	.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

export async function beginGoogleOAuth(cookies: Cookies, url: URL, userId: string) {
	const state = randomToken();
	const verifier = randomToken();
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
	cookies.set(cookieName(url), JSON.stringify({ state, verifier, userId, expires: Date.now() + 600_000 }), {
		path: '/', httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', maxAge: 600
	});
	return { state, challenge };
}

export function consumeGoogleOAuth(cookies: Cookies, url: URL, userId: string): string {
	const saved = cookies.get(cookieName(url));
	cookies.delete(cookieName(url), { path: '/' });
	let flow;
	try { flow = JSON.parse(saved ?? 'null'); } catch { /* Invalid cookie fails closed. */ }
	if (!flow || !url.searchParams.get('state') || flow.state !== url.searchParams.get('state') ||
		flow.userId !== userId || typeof flow.expires !== 'number' || flow.expires < Date.now() ||
		typeof flow.verifier !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier)) {
		error(400, 'Google Photos connection expired or could not be verified. Start Connect again.');
	}
	return flow.verifier;
}
