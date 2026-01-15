import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
	const { userId } = locals.auth();

	if (!userId) {
		throw redirect(307, '/admin/sign-in');
	}

	return {
		userId,
		projectId: params.id
	};
};
