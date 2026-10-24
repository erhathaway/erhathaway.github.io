/** Let the server verify the session cookie while Clerk's client token is loading. */
export async function fetchNamecardAdmin(
	getToken: () => Promise<string | null>,
	path: string,
	init: RequestInit = {}
): Promise<Response> {
	const token = await getToken().catch(() => null);
	const headers = new Headers(init.headers);
	if (token) headers.set('Authorization', `Bearer ${token}`);
	const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
	if (response.status === 401) {
		throw new Error('Your session could not be verified. Sign in again and retry.');
	}
	return response;
}
