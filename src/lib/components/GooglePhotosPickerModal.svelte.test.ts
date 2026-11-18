import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import GooglePhotosPickerModal from './GooglePhotosPickerModal.svelte';

const props = { projectId: 1, getToken: async () => 'test-session', onImported: vi.fn(), onClose: vi.fn() };
afterEach(() => vi.restoreAllMocks());

describe('Google Photos picker connection errors', () => {
	it('offers reconnect with a readable message when the saved Google grant expires', async () => {
		vi.spyOn(window, 'fetch').mockResolvedValue(Response.json({
			code: 'GOOGLE_PHOTOS_RECONNECT_REQUIRED',
			message: 'Your Google Photos connection has expired or was revoked. Reconnect Google Photos to continue.'
		}, { status: 409 }));
		render(GooglePhotosPickerModal, props);
		const reconnect = page.getByRole('link', { name: 'Reconnect Google Photos' });
		await expect.element(reconnect).toBeVisible();
		await expect.element(reconnect).toHaveAttribute('href', '/api/admin/integrations/google-photos/connect');
		await expect.element(page.getByText('Your Google Photos connection has expired or was revoked. Reconnect Google Photos to continue.')).toBeVisible();
	});

	it('shows temporary failures as readable errors without asking for new authorization', async () => {
		vi.spyOn(window, 'fetch').mockResolvedValue(Response.json({ message: 'Google Photos is temporarily unavailable.' }, { status: 502 }));
		render(GooglePhotosPickerModal, props);
		await expect.element(page.getByText('Google Photos is temporarily unavailable.')).toBeVisible();
		await expect.element(page.getByRole('link', { name: 'Reconnect Google Photos' })).not.toBeInTheDocument();
	});
});
