export const sectionTitleV1Schema = {
	name: 'section-title-v1',
	label: 'Section Title',
	description: 'Full-width title card with optional subtitle.'
} as const;

export type SectionTitleV1Data = {
	title: string;
	subtitle?: string;
	/** Draws a line from the card's right edge to the end of the content column. */
	showDivider: boolean;
};

export const createSectionTitleV1Draft = (): SectionTitleV1Data => ({
	title: '',
	subtitle: '',
	showDivider: true
});

export type SectionTitleV1ValidationResult =
	| { ok: true; value: SectionTitleV1Data }
	| { ok: false; errors: string[] };

export const validateSectionTitleV1 = (payload: unknown): SectionTitleV1ValidationResult => {
	const errors: string[] = [];
	if (!payload || typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = payload as Record<string, unknown>;

	const title = data.title;
	if (typeof title !== 'string' || title.trim().length === 0) {
		errors.push('title is required');
	}

	const subtitle = data.subtitle;
	if (subtitle !== undefined && subtitle !== '' && typeof subtitle !== 'string') {
		errors.push('subtitle must be a string');
	}

	const showDivider = data.showDivider;
	if (showDivider !== undefined && typeof showDivider !== 'boolean') {
		errors.push('showDivider must be a boolean');
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			title: (title as string).trim(),
			...(typeof subtitle === 'string' && subtitle.trim()
				? { subtitle: subtitle.trim() }
				: {}),
			showDivider: showDivider !== false
		}
	};
};
