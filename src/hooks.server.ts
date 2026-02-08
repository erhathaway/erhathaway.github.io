import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { getDb } from '$lib/server/db';
import { verifyClerkAuth } from '$lib/server/auth';

const clerkHandle = withClerkHandler();

const dbHandle: Handle = async ({ event, resolve }) => {
	const db = event.platform?.env?.DB;
	if (db) {
		event.locals.db = getDb(db);
	}
	return resolve(event);
};

const adminAuthHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/admin/')) {
		const userId = await verifyClerkAuth(event.request, event.platform?.env);
		const authUserId = event.locals.auth?.()?.userId ?? null;
		if (!userId && !authUserId) {
			throw error(401, 'Unauthorized');
		}
	}
	return resolve(event);
};

const securityHeadersHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// HSTS — force HTTPS (1 year, include subdomains, preload-ready)
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

	// Prevent clickjacking
	response.headers.set('X-Frame-Options', 'DENY');

	// Isolate top-level window from cross-origin documents
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	// CSP — 'unsafe-inline' needed because Cloudflare injects Web Analytics
	// scripts without nonces, which breaks nonce-based CSP
	response.headers.set('Content-Security-Policy', [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://*.clerk.accounts.dev https://us.i.posthog.com https://us-assets.i.posthog.com",
		"worker-src 'self' blob:",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https://img.clerk.com",
		"connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://api.clerk.com https://*.clerk.accounts.dev https://accounts.google.com https://oauth2.googleapis.com https://photospicker.googleapis.com https://static.cloudflareinsights.com",
		"frame-src 'self' https://accounts.google.com https://*.clerk.accounts.dev",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	].join('; '));

	return response;
};

export const handle = sequence(clerkHandle, dbHandle, adminAuthHandle, securityHeadersHandle);
