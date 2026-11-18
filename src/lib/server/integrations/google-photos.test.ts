import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getDb, type Db } from '../db';
import { integrations } from '../db/schema';
import {
	decryptTokens, exchangeCodeForTokens, getIntegrationStatus, getStoredTokens,
	getValidAccessToken, storeTokens, type GoogleTokens
} from './google-photos';
import { POST as createSession } from '../../../routes/api/admin/integrations/google-photos/sessions/+server';
import { GET as status } from '../../../routes/api/admin/integrations/google-photos/status/+server';
import { GET as callback } from '../../../routes/api/integrations/google-photos/callback/+server';

vi.mock('../db', () => ({ getDb: vi.fn() }));

const env = {
	GOOGLE_CLIENT_ID: 'test-client',
	GOOGLE_CLIENT_SECRET: 'test-secret',
	GOOGLE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32)
};
const expired: GoogleTokens = {
	access_token: 'old-access', refresh_token: 'saved-refresh', expires_at: 1
};
let client: Client;
let db: Db;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
	client = createClient({ url: ':memory:' });
	await client.execute(`CREATE TABLE integrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL UNIQUE,
		user_id TEXT NOT NULL, tokens TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`);
	db = drizzle(client) as unknown as Db;
	vi.mocked(getDb).mockReturnValue(db);
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	client.close();
	vi.unstubAllGlobals();
});

const save = (tokens = expired) => storeTokens(db, 'admin-user', tokens, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
const invalidGrant = () => Response.json({ error: 'invalid_grant', error_description: 'Bad Request' }, { status: 400 });
const event = { platform: { env: { ...env, DB: {} } } };

describe('Google Photos connection recovery', () => {
	it('reports no saved connection without contacting Google', async () => {
		expect(await getIntegrationStatus(db, env)).toEqual({ connected: false });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('keeps an unexpired connection without an unnecessary refresh', async () => {
		await save({ ...expired, expires_at: Date.now() + 3_600_000 });
		expect(await getIntegrationStatus(db, env)).toMatchObject({ connected: true });
		expect(await getValidAccessToken(db, env)).toBe('old-access');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refreshes expired credentials and preserves the refresh token, owner and connection date', async () => {
		await save();
		const before = await db.select().from(integrations).get();
		fetchMock.mockResolvedValueOnce(Response.json({ access_token: 'new-access', expires_in: 3600 }));
		expect(await getIntegrationStatus(db, env)).toEqual({ connected: true, connectedAt: before?.createdAt });
		const after = await db.select().from(integrations).get();
		expect(after).toMatchObject({ id: before?.id, userId: 'admin-user', createdAt: before?.createdAt });
		expect(await getStoredTokens(db, env.GOOGLE_TOKEN_ENCRYPTION_KEY)).toMatchObject({
			access_token: 'new-access', refresh_token: 'saved-refresh'
		});
		const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
		expect(body.get('grant_type')).toBe('refresh_token');
		expect(body.get('refresh_token')).toBe('saved-refresh');
	});

	it('returns reconnect required instead of Connected for the reported invalid_grant', async () => {
		await save();
		fetchMock.mockResolvedValueOnce(invalidGrant());
		const response = await status(event as unknown as Parameters<typeof status>[0]);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(await response.json()).toMatchObject({ connected: false, reconnectRequired: true });
		expect(await getStoredTokens(db, env.GOOGLE_TOKEN_ENCRYPTION_KEY)).toEqual(expired);
	});

	it('passes a structured reconnect error through the picker session endpoint', async () => {
		await save();
		fetchMock.mockResolvedValueOnce(invalidGrant());
		await expect(createSession(event as unknown as Parameters<typeof createSession>[0])).rejects.toMatchObject({
			status: 409,
			body: { code: 'GOOGLE_PHOTOS_RECONNECT_REQUIRED', message: expect.stringContaining('Reconnect Google Photos') }
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([503, 429, 401])('keeps temporary or configuration errors (%s) distinct from reconnect errors', async (httpStatus) => {
		await save();
		fetchMock.mockResolvedValueOnce(Response.json({ error: 'unavailable' }, { status: httpStatus }));
		await expect(getIntegrationStatus(db, env)).rejects.toThrow('Please try again later');
		expect(await getStoredTokens(db, env.GOOGLE_TOKEN_ENCRYPTION_KEY)).toEqual(expired);
	});

	it('retains credentials when Google cannot be reached', async () => {
		await save();
		fetchMock.mockRejectedValueOnce(new Error('Network unavailable'));
		await expect(getIntegrationStatus(db, env)).rejects.toThrow('Network unavailable');
		expect(await getStoredTokens(db, env.GOOGLE_TOKEN_ENCRYPTION_KEY)).toEqual(expired);
	});

	it('does not overwrite a newer connection when an earlier refresh finishes', async () => {
		await save();
		const reconnected = { access_token: 'reconnected-access', refresh_token: 'reconnected-refresh', expires_at: Date.now() + 3_600_000 };
		fetchMock.mockImplementationOnce(async () => {
			await storeTokens(db, 'new-owner', reconnected, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
			return Response.json({ access_token: 'stale-refresh-result', expires_in: 3600 });
		});
		await getValidAccessToken(db, env);
		const row = await db.select().from(integrations).get();
		expect(row?.userId).toBe('new-owner');
		expect(await decryptTokens(row!.tokens, env.GOOGLE_TOKEN_ENCRYPTION_KEY)).toEqual(reconnected);
	});

	it('restores the connection after a new Google consent grant is saved', async () => {
		await save();
		fetchMock.mockResolvedValueOnce(invalidGrant());
		expect(await getIntegrationStatus(db, env)).toMatchObject({ reconnectRequired: true });
		fetchMock.mockResolvedValueOnce(Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }));
		const fresh = await exchangeCodeForTokens('new-code', 'https://example.test/callback', env);
		await save(fresh);
		expect(await getIntegrationStatus(db, env)).toMatchObject({ connected: true });
		expect(await getValidAccessToken(db, env)).toBe('new-access');
		expect(await db.select().from(integrations)).toHaveLength(1);
	});

	it('requires reconnect for legacy credentials that have no refresh token', async () => {
		await save({ ...expired, refresh_token: '' });
		expect(await getIntegrationStatus(db, env)).toMatchObject({ connected: false, reconnectRequired: true });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('does not store a new grant without offline access', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ access_token: 'access-only', expires_in: 3600 }));
		await expect(exchangeCodeForTokens('test-code', 'https://example.test/callback', env)).rejects.toThrow('offline access');
	});

	it('shows a useful callback error when Google consent is declined without a code', async () => {
		await expect(callback({ url: new URL('https://example.test/callback?error=access_denied') } as Parameters<typeof callback>[0]))
			.rejects.toMatchObject({ status: 302, location: expect.stringContaining('error=Google%20Photos%20access') });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
