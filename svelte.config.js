import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		paths: {
			relative: false
		},
		csp: {
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'strict-dynamic', 'unsafe-inline', 'https:', 'http:'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'https://fonts.gstatic.com'],
				'img-src': ['self', 'data:', 'blob:', 'https://img.clerk.com'],
				'connect-src': [
					'self',
					'https://us.i.posthog.com',
					'https://us-assets.i.posthog.com',
					'https://api.clerk.com',
					'https://*.clerk.accounts.dev',
					'https://accounts.google.com',
					'https://oauth2.googleapis.com',
					'https://photospicker.googleapis.com'
				],
				'frame-src': ['self', 'https://accounts.google.com', 'https://*.clerk.accounts.dev'],
				'frame-ancestors': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
		},
		adapter: adapter({
			platformProxy: {
				configPath: './wrangler.toml',
				persist: { path: '.wrangler/state/v3' }
			}
		})
	}
};

export default config;
