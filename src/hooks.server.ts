import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { getDb } from '$lib/server/db';
import { adminAuthHandle } from '$lib/server/auth';

const clerkHandle = withClerkHandler({
	authorizedParties: ['https://erhathaway.com', 'http://localhost:5173', 'http://127.0.0.1:5173']
});

const dbHandle: Handle = async ({ event, resolve }) => {
	const db = event.platform?.env?.DB;
	if (db) {
		event.locals.db = getDb(db);
	}
	return resolve(event);
};

const securityHeadersHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// HSTS — force HTTPS (1 year, include subdomains, preload-ready)
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

	response.headers.set('X-Content-Type-Options', 'nosniff');

	// Prevent clickjacking
	response.headers.set('X-Frame-Options', 'DENY');

	// Isolate top-level window from cross-origin documents
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	// CSP — 'unsafe-inline' needed because Cloudflare injects Web Analytics
	// scripts without nonces, which breaks nonce-based CSP.
	// Clerk's dev instance runs on *.clerk.accounts.dev; the production instance on clerk.erhathaway.com.
	response.headers.set('Content-Security-Policy', [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://*.clerk.accounts.dev https://clerk.erhathaway.com https://cdn.protect.clerk.com https://us.i.posthog.com https://us-assets.i.posthog.com",
		"worker-src 'self' blob:",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https://img.clerk.com",
		"connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://api.clerk.com https://*.clerk.accounts.dev https://clerk.erhathaway.com https://accounts.google.com https://oauth2.googleapis.com https://photospicker.googleapis.com https://static.cloudflareinsights.com",
		"frame-src 'self' https://accounts.google.com https://*.clerk.accounts.dev https://clerk.erhathaway.com https://accounts.erhathaway.com",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	].join('; '));

	return response;
};

export const handle = sequence(clerkHandle, dbHandle, adminAuthHandle, securityHeadersHandle);
