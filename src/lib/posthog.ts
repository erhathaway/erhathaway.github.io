import posthog from 'posthog-js';
import { browser } from '$app/environment';

export function initPostHog(apiKey: string) {
	if (!browser || !apiKey) return;
	posthog.init(apiKey, {
		api_host: 'https://us.i.posthog.com',
		person_profiles: 'identified_only',
		capture_pageview: 'history_change',
		capture_pageleave: 'if_capture_pageview'
	});
}
