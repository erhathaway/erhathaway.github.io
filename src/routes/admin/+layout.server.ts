import { dev } from '$app/environment';
import { buildClerkProps } from 'svelte-clerk/server';

export const load = ({ locals, platform }) => ({
	...buildClerkProps(locals.auth()),
	isDev: dev || platform?.env?.ENVIRONMENT === 'development'
});
