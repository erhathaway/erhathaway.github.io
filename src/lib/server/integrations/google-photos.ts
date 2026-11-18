import { and, eq, sql } from 'drizzle-orm';
import { error, isHttpError } from '@sveltejs/kit';
import { integrations } from '../db/schema';
import type { Db } from '../db';

type GoogleEnv = {
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GOOGLE_TOKEN_ENCRYPTION_KEY: string;
};

function requireReconnect(): never {
	error(409, {
		code: 'GOOGLE_PHOTOS_RECONNECT_REQUIRED',
		message: 'Your Google Photos connection has expired or was revoked. Reconnect Google Photos to continue.'
	});
}

// --- Types ---

export type GoogleTokens = {
	access_token: string;
	refresh_token: string;
	expires_at: number; // Unix timestamp in ms
};

export type PickerSession = {
	id: string;
	pickerUri: string;
	mediaItemsSet: boolean;
	expireTime: string;
	pollingConfig?: {
		pollInterval?: string;
		timeoutIn?: string;
	};
};

export type PickedMediaItem = {
	id: string;
	createTime: string;
	type: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
	mediaFile: {
		baseUrl: string;
		mimeType: string;
		filename: string;
		mediaFileMetadata: {
			width?: number;
			height?: number;
			cameraMake?: string;
			cameraModel?: string;
			photoMetadata?: {
				focalLength?: number;
				apertureFNumber?: number;
				isoEquivalent?: number;
				exposureTime?: string;
			};
			videoMetadata?: {
				fps?: number;
				processingStatus?: 'PROCESSING' | 'READY' | 'FAILED';
			};
		};
	};
};

export type ArtifactMetadataBlob = {
	cameraMake?: string;
	cameraModel?: string;
	width?: number;
	height?: number;
	focalLength?: number;
	apertureFNumber?: number;
	isoEquivalent?: number;
	exposureTime?: string;
	fps?: number;
	processingStatus?: string;
	dateTaken?: string;
	googlePhotosMediaItemId?: string;
	originalFilename?: string;
};

// --- Token Encryption ---

async function deriveKey(hexKey: string): Promise<CryptoKey> {
	if (!/^[0-9a-f]{64}$/i.test(hexKey)) throw new Error('Invalid Google token encryption key');
	const raw = hexToBuffer(hexKey);
	return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function hexToBuffer(hex: string): ArrayBuffer {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes.buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

export async function encryptTokens(tokens: GoogleTokens, encryptionKey: string): Promise<string> {
	const key = await deriveKey(encryptionKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = new TextEncoder().encode(JSON.stringify(tokens));

	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

	return JSON.stringify({
		iv: bufferToBase64(iv.buffer),
		ct: bufferToBase64(ciphertext)
	});
}

export async function decryptTokens(
	encrypted: string,
	encryptionKey: string
): Promise<GoogleTokens> {
	const key = await deriveKey(encryptionKey);
	const { iv, ct } = JSON.parse(encrypted);

	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(iv)) },
		key,
		base64ToBuffer(ct)
	);

	return JSON.parse(new TextDecoder().decode(decrypted));
}

// --- Token Storage ---

export async function getStoredTokens(
	db: Db,
	encryptionKey: string
): Promise<GoogleTokens | null> {
	const row = await db
		.select()
		.from(integrations)
		.where(eq(integrations.provider, 'google-photos'))
		.get();

	if (!row) return null;

	return decryptTokens(row.tokens, encryptionKey);
}

export async function storeTokens(
	db: Db,
	userId: string,
	tokens: GoogleTokens,
	encryptionKey: string
): Promise<void> {
	const encrypted = await encryptTokens(tokens, encryptionKey);

	await db.insert(integrations).values({
		provider: 'google-photos',
		userId,
		tokens: encrypted
	}).onConflictDoUpdate({
		target: integrations.provider,
		set: { userId, tokens: encrypted, createdAt: sql`(datetime('now'))`, updatedAt: sql`(datetime('now'))` }
	});
}

export async function deleteStoredTokens(db: Db): Promise<void> {
	await db.delete(integrations).where(eq(integrations.provider, 'google-photos'));
}

export async function getIntegrationStatus(
	db: Db,
	env: GoogleEnv
): Promise<{ connected: boolean; connectedAt?: string; reconnectRequired?: boolean; message?: string }> {
	const row = await db
		.select({ createdAt: integrations.createdAt })
		.from(integrations)
		.where(eq(integrations.provider, 'google-photos'))
		.get();

	if (!row) return { connected: false };
	try {
		// Refresh expired access tokens before claiming this connection is usable.
		await getValidAccessToken(db, env);
	} catch (err) {
		if (isHttpError(err, 409) && err.body.code === 'GOOGLE_PHOTOS_RECONNECT_REQUIRED') {
			return { connected: false, reconnectRequired: true, message: err.body.message };
		}
		throw err;
	}
	return { connected: true, connectedAt: row.createdAt };
}

// --- Token Refresh ---

export async function getValidAccessToken(
	db: Db,
	env: GoogleEnv
): Promise<string> {
	const row = await db.select().from(integrations)
		.where(eq(integrations.provider, 'google-photos')).get();
	if (!row) requireReconnect();
	const tokens = await decryptTokens(row.tokens, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
	if (!tokens.refresh_token) requireReconnect();

	// If token expires in less than 5 minutes, refresh
	if (tokens.expires_at < Date.now() + 5 * 60 * 1000) {
		const refreshed = await refreshAccessToken(tokens.refresh_token, env);
		const encrypted = await encryptTokens(refreshed, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
		// A slow refresh must not overwrite credentials from a concurrent reconnect.
		await db.update(integrations).set({ tokens: encrypted, updatedAt: sql`(datetime('now'))` })
			.where(and(eq(integrations.id, row.id), eq(integrations.tokens, row.tokens)));
		return refreshed.access_token;
	}

	return tokens.access_token;
}

async function refreshAccessToken(
	refreshToken: string,
	env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string }
): Promise<GoogleTokens> {
	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			refresh_token: refreshToken,
			grant_type: 'refresh_token'
		})
	});

	if (!response.ok) {
		const failure = await response.json().catch(() => null) as { error?: string } | null;
		if (response.status === 400 && failure?.error === 'invalid_grant') requireReconnect();
		throw new Error(`Google Photos could not refresh the connection (${response.status}). Please try again later.`);
	}

	const data = (await response.json()) as {
		access_token: string;
		expires_in: number;
		refresh_token?: string;
	};

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token ?? refreshToken,
		expires_at: Date.now() + data.expires_in * 1000
	};
}

// --- OAuth Helpers ---

export function buildOAuthUrl(
	env: { GOOGLE_CLIENT_ID: string }, redirectUri: string, flow: { state: string; challenge: string }
): string {
	const params = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
		access_type: 'offline',
		prompt: 'consent',
		state: flow.state,
		code_challenge: flow.challenge,
		code_challenge_method: 'S256'
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
	code: string,
	redirectUri: string,
	env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string },
	verifier?: string
): Promise<GoogleTokens> {
	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
			...(verifier ? { code_verifier: verifier } : {})
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Token exchange failed: ${response.status} ${text}`);
	}

	const data = (await response.json()) as {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	};

	if (!data.refresh_token) {
		throw new Error('Google did not grant offline access. Reconnect Google Photos and allow access.');
	}

	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_at: Date.now() + data.expires_in * 1000
	};
}

export async function revokeToken(token: string): Promise<void> {
	await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	});
}

// --- Picker API ---

const PICKER_BASE = 'https://photospicker.googleapis.com/v1';

export async function createPickerSession(
	accessToken: string,
	maxItemCount?: number
): Promise<PickerSession> {
	const body: Record<string, unknown> = {};
	if (maxItemCount) {
		body.pickingConfig = { maxItemCount };
	}

	const response = await fetch(`${PICKER_BASE}/sessions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to create picker session: ${response.status} ${text}`);
	}

	return response.json() as Promise<PickerSession>;
}

export async function getPickerSession(
	accessToken: string,
	sessionId: string
): Promise<PickerSession> {
	const response = await fetch(`${PICKER_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to get picker session: ${response.status} ${text}`);
	}

	return response.json() as Promise<PickerSession>;
}

export async function deletePickerSession(
	accessToken: string,
	sessionId: string
): Promise<void> {
	await fetch(`${PICKER_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${accessToken}` }
	});
}

export async function listPickedMediaItems(
	accessToken: string,
	sessionId: string,
	pageToken?: string,
	pageSize = 100
): Promise<{ mediaItems: PickedMediaItem[]; nextPageToken?: string }> {
	const params = new URLSearchParams({
		sessionId,
		pageSize: String(pageSize)
	});
	if (pageToken) params.set('pageToken', pageToken);

	const response = await fetch(`${PICKER_BASE}/mediaItems?${params.toString()}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to list media items: ${response.status} ${text}`);
	}

	return response.json() as Promise<{ mediaItems: PickedMediaItem[]; nextPageToken?: string }>;
}

export async function listAllPickedMediaItems(
	accessToken: string,
	sessionId: string
): Promise<PickedMediaItem[]> {
	const allItems: PickedMediaItem[] = [];
	let pageToken: string | undefined;

	do {
		const result = await listPickedMediaItems(accessToken, sessionId, pageToken);
		if (result.mediaItems) {
			allItems.push(...result.mediaItems);
		}
		pageToken = result.nextPageToken;
	} while (pageToken);

	return allItems;
}

// --- Media Download ---

export function validateGoogleMediaUrl(baseUrl: string): void {
	let url: URL;
	try { url = new URL(baseUrl); } catch { error(400, 'Invalid Google Photos media URL'); }
	if (url.protocol !== 'https:' || !url.hostname.endsWith('.googleusercontent.com') ||
		url.username || url.password || url.port || url.search || url.hash) {
		error(400, 'Invalid Google Photos media URL');
	}
}

export async function fetchGoogleMedia(accessToken: string, baseUrl: string, suffix: string): Promise<Response> {
	validateGoogleMediaUrl(baseUrl);
	// Never follow a redirect that could send the Google bearer token to another service.
	const response = await fetch(`${baseUrl}${suffix}`, {
		headers: { Authorization: `Bearer ${accessToken}` }, redirect: 'error'
	});
	if (!response.ok) error(502, 'Failed to download Google Photos media');
	const contentType = response.headers.get('Content-Type')?.split(';')[0];
	if (!contentType || !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
		'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'].includes(contentType)) {
		error(502, 'Unexpected Google Photos media type');
	}
	return response;
}

export async function downloadMedia(
	accessToken: string,
	baseUrl: string,
	type: 'PHOTO' | 'VIDEO',
	maxDimension?: number
): Promise<Response> {
	const suffix = type === 'VIDEO' ? '=dv' : maxDimension ? `=w${maxDimension}-h${maxDimension}` : '=d';
	return fetchGoogleMedia(accessToken, baseUrl, suffix);
}

export async function downloadThumbnail(accessToken: string, baseUrl: string): Promise<Response> {
	return fetchGoogleMedia(accessToken, baseUrl, '=w512-h512-no');
}

// --- Metadata Extraction ---

export function extractMetadata(item: PickedMediaItem): ArtifactMetadataBlob {
	const meta = item.mediaFile.mediaFileMetadata;
	const blob: ArtifactMetadataBlob = {
		googlePhotosMediaItemId: item.id,
		originalFilename: item.mediaFile.filename,
		dateTaken: item.createTime
	};

	if (meta.cameraMake) blob.cameraMake = meta.cameraMake;
	if (meta.cameraModel) blob.cameraModel = meta.cameraModel;
	if (meta.width) blob.width = meta.width;
	if (meta.height) blob.height = meta.height;

	if (meta.photoMetadata) {
		if (meta.photoMetadata.focalLength) blob.focalLength = meta.photoMetadata.focalLength;
		if (meta.photoMetadata.apertureFNumber)
			blob.apertureFNumber = meta.photoMetadata.apertureFNumber;
		if (meta.photoMetadata.isoEquivalent) blob.isoEquivalent = meta.photoMetadata.isoEquivalent;
		if (meta.photoMetadata.exposureTime) blob.exposureTime = meta.photoMetadata.exposureTime;
	}

	if (meta.videoMetadata) {
		if (meta.videoMetadata.fps) blob.fps = meta.videoMetadata.fps;
		if (meta.videoMetadata.processingStatus)
			blob.processingStatus = meta.videoMetadata.processingStatus;
	}

	return blob;
}

// --- Helpers ---

export function mimeToExtension(mimeType: string): string {
	const map: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/webp': 'webp',
		'image/gif': 'gif',
		'image/heic': 'heic',
		'image/heif': 'heif',
		'video/mp4': 'mp4',
		'video/quicktime': 'mov',
		'video/x-msvideo': 'avi',
		'video/webm': 'webm'
	};
	return map[mimeType.toLowerCase()] ?? 'bin';
}
