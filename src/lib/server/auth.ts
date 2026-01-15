export async function verifyClerkAuth(
	request: Request,
	env?: App.Platform['env']
): Promise<string | null> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.slice('Bearer '.length);
	const secret = env?.CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_KEY;
	if (!secret) {
		return null;
	}

	try {
		const response = await fetch('https://api.clerk.com/v1/sessions/verify', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${secret}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ session_token: token })
		});

		if (!response.ok) {
			return null;
		}

		const session = await response.json();
		return session?.user_id ?? null;
	} catch (err) {
		console.error('Auth verification error:', err);
		return null;
	}
}
