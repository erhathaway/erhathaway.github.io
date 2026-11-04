import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const buildOutDir = process.env.BUILD_OUT_DIR;

const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		outDir: buildOutDir ?? '.svelte-kit',
		csrf: {
			checkOrigin: false
		},
		paths: {
			relative: false
		},
adapter: adapter({
			config: buildOutDir ? `${buildOutDir}/wrangler.toml` : undefined,
			platformProxy: {
				configPath: './wrangler.toml',
				persist: { path: '.wrangler/state/v3' }
			}
		})
	}
};

export default config;
