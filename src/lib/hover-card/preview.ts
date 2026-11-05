import { createContext } from 'svelte';
import type { HoverCardTheme } from './index';

export interface HoverCardReviewDraft {
	draft: HoverCardTheme;
	baseline: string;
}
export interface HoverCardPreview {
	draft: HoverCardTheme | null;
	review?: HoverCardReviewDraft | null;
	baseline: string;
	enabled: boolean;
	hoverItemId?: number | null;
	keepHoverOpen?: boolean;
}

// Owned by the root layout: isolated per browser and per SSR request.
export const [getHoverCardPreview, setHoverCardPreview] = createContext<HoverCardPreview>();

const HANDOFF_KEY = 'hover-card-preview-review-v1';

// Keep the handoff until explicitly saved/discarded: route transitions may
// mount the editor more than once, and authentication may reload the page.
export function storeReviewDraft(value: HoverCardReviewDraft) {
	try {
		sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(value));
	} catch {
		/* In-memory context remains available. */
	}
}
export function readReviewDraft(): HoverCardReviewDraft | null {
	try {
		const value = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
		if (
			value &&
			typeof value.baseline === 'string' &&
			typeof value.draft?.id === 'string' &&
			typeof value.draft?.name === 'string' &&
			typeof value.draft?.shape === 'string'
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
