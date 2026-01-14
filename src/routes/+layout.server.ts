import { buildClerkProps } from 'svelte-clerk/server';

export const load = ({ locals }) => ({
	...buildClerkProps(locals.auth())
});