import { createContext } from 'svelte';
import type { EmptyCardTheme } from './index';

export interface EmptyCardReviewDraft {
	draft: EmptyCardTheme;
	baseline: string;
}
export interface EmptyCardPreview {
	draft: EmptyCardTheme | null;
	review?: EmptyCardReviewDraft | null;
	baseline: string;
	enabled: boolean;
}

// Owned by the root layout: isolated per browser and per SSR request.
export const [getEmptyCardPreview, setEmptyCardPreview] = createContext<EmptyCardPreview>();

const HANDOFF_KEY = 'empty-card-preview-review-v1';

// Keep the handoff until explicitly saved/discarded: route transitions may
// mount the editor more than once, and authentication may reload the page.
export function storeReviewDraft(value: EmptyCardReviewDraft) {
	try {
		sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(value));
	} catch {
		/* In-memory context remains available. */
	}
}
export function readReviewDraft(): EmptyCardReviewDraft | null {
	try {
		const value = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
		if (
			value &&
			typeof value.baseline === 'string' &&
			typeof value.draft?.id === 'string' &&
			typeof value.draft?.name === 'string' &&
			typeof value.draft?.fill?.type === 'string'
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
