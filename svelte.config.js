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
		adapter: adapter({
			platformProxy: {
				configPath: './wrangler.toml',
				persist: { path: '.wrangler/state/v3' }
			}
		})
	}
};

export default config;
