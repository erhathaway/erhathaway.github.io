import posthog from 'posthog-js';
import { browser } from '$app/environment';

const INTERNAL_EMAIL = 'erhathaway@gmail.com';

export function initPostHog(apiKey: string) {
	if (!browser || !apiKey) return;
	posthog.init(apiKey, {
		api_host: 'https://us.i.posthog.com',
		person_profiles: 'identified_only',
		// Private photo previews must never be included in session recordings.
		disable_session_recording: true,
		before_send: (event) => {
			let path: string;
			try { path = decodeURIComponent(window.location.pathname); } catch { return null; }
			if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/')) return null;
			return event;
		},
		capture_pageview: 'history_change',
		capture_pageleave: 'if_capture_pageview'
	});
}

export function identifyPostHogUser(email: string | undefined) {
	if (!browser || !email) return;
	posthog.identify(email, { email, is_internal: email === INTERNAL_EMAIL });
}
