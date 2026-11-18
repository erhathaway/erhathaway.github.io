import { error, redirect, type Handle } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

type AdminEnv = { ADMIN_CLERK_USER_ID?: string };

// Only Clerk middleware's verified identity is trusted. Never accept a raw bearer token
// or an email address supplied by the browser as proof of ownership.
export function isAdmin(locals: App.Locals, env?: AdminEnv): boolean {
	const ownerId = env?.ADMIN_CLERK_USER_ID ?? privateEnv.ADMIN_CLERK_USER_ID;
	return !!ownerId && locals.auth?.()?.userId === ownerId;
}

export function requireAdmin(locals: App.Locals, env?: AdminEnv): string {
	const userId = locals.auth?.()?.userId;
	if (!userId) error(401, 'Sign in to continue');
	if (!isAdmin(locals, env)) error(403, 'This area is private');
	return userId;
}

export const adminAuthHandle: Handle = async ({ event, resolve }) => {
	// Match the resolved route, so encoded paths and SvelteKit data requests cannot
	// bypass authorization. Every admin page, API and the external callback is covered.
	const route = event.route.id ?? '';
	const adminPage = route === '/admin' || route.startsWith('/admin/');
	const protectedRoute = adminPage || route.startsWith('/api/admin/') ||
		route === '/api/integrations/google-photos/callback';
	if (!protectedRoute) return resolve(event);

	if (adminPage && !event.locals.auth?.()?.userId) redirect(307, '/');
	requireAdmin(event.locals, event.platform?.env);
	const origin = event.request.headers.get('origin');
	if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
		((origin && origin !== event.url.origin) ||
		 event.request.headers.get('sec-fetch-site') === 'cross-site')) {
		error(403, 'Cross-origin requests are not allowed');
	}
	const response = await resolve(event);
	response.headers.set('Cache-Control', 'private, no-store');
	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.delete('Access-Control-Allow-Origin');
	return response;
};
