import { createContext } from 'svelte';
import type { SpacingTheme } from './index';

export interface SpacingPreview {
	draft: SpacingTheme | null;
	review?: SpacingReviewDraft | null;
	baseline: string;
	enabled: boolean;
}

// Owned by the root layout: isolated per browser and per SSR request.
export const [getSpacingPreview, setSpacingPreview] = createContext<SpacingPreview>();

const HANDOFF_KEY = 'spacing-preview-review-v1';
export interface SpacingReviewDraft {
	draft: SpacingTheme;
	baseline: string;
}

// Keep the handoff until explicitly saved/discarded: route transitions may
// mount the editor more than once, and authentication may reload the page.
export function storeReviewDraft(value: SpacingReviewDraft) {
	try {
		sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(value));
	} catch {
		/* In-memory context remains available. */
	}
}
export function readReviewDraft(): SpacingReviewDraft | null {
	try {
		const value = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
		if (
			value &&
			typeof value.baseline === 'string' &&
			typeof value.draft?.id === 'string' &&
			typeof value.draft?.name === 'string' &&
			value.draft?.values &&
			typeof value.draft.values === 'object'
		)
			return value;
	} catch {
		/* No recoverable draft. */
	}
	return null;
}
export function clearReviewDraft() {
	try {
		sessionStorage.removeItem(HANDOFF_KEY);
	} catch {
		/* Storage may be disabled. */
	}
}
