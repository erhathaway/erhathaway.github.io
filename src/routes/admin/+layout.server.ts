import { dev } from '$app/environment';

export const load = ({ platform }) => ({
	isDev: dev || platform?.env?.ENVIRONMENT === 'development'
});
