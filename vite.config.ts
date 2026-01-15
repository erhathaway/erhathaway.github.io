import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

const browserEnabled = process.env.VITEST_BROWSER === '1';

const clientProject = {
	name: 'client',
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],

	test: {
		browser: {
			enabled: browserEnabled,
			provider: playwright(),
			instances: [{ browser: 'chromium', headless: true }]
		},

		include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
		exclude: ['src/lib/server/**']
	}
};

const serverProject = {
	name: 'server',
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],

	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
	}
};

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],

	test: {
		expect: { requireAssertions: true },

		projects: browserEnabled ? [clientProject, serverProject] : [serverProject]
	}
});
