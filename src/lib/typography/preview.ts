import { createContext } from 'svelte';
import type { TypographyTheme } from './index';

export interface TypographyPreview {
	draft: TypographyTheme | null;
	review?: TypographyReviewDraft | null;
	hoverItemId?: number | null;
	keepHoverOpen?: boolean;
	baseline: string;
	enabled: boolean;
}

// Owned by the root layout: isolated per browser and per SSR request.
export const [getTypographyPreview, setTypographyPreview] = createContext<TypographyPreview>();

const HANDOFF_KEY = 'typography-preview-review-v1';
export interface TypographyReviewDraft {
	draft: TypographyTheme;
	baseline: string;
	roleId?: string;
}

// Keep the handoff until explicitly saved/discarded: route transitions may
// mount the editor more than once, and authentication may reload the page.
export function storeReviewDraft(value: TypographyReviewDraft) {
	try {
		sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(value));
	} catch {
		/* In-memory context remains available. */
	}
}
export function readReviewDraft(): TypographyReviewDraft | null {
	try {
		const value = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
		if (
			value &&
			typeof value.baseline === 'string' &&
			typeof value.draft?.id === 'string' &&
			typeof value.draft?.name === 'string' &&
			value.draft?.roles &&
			typeof value.draft.roles === 'object'
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
