export const narrativeV1Schema = {
	name: 'narrative-v1',
	label: 'Narrative',
	description: 'Full-width narrative text to tell the story between images.'
} as const;

export type NarrativeV1Align = 'left' | 'center' | 'right';

export type NarrativeV1Data = {
	text: string;
	align?: NarrativeV1Align;
};

const VALID_ALIGNS: NarrativeV1Align[] = ['left', 'center', 'right'];

export const createNarrativeV1Draft = (): NarrativeV1Data => ({ text: '', align: 'center' });

export type NarrativeV1ValidationResult =
	| { ok: true; value: NarrativeV1Data }
	| { ok: false; errors: string[] };

export const validateNarrativeV1 = (payload: unknown): NarrativeV1ValidationResult => {
	const errors: string[] = [];
	if (!payload || typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = payload as Record<string, unknown>;

	const text = data.text;
	if (typeof text !== 'string' || text.trim().length === 0) {
		errors.push('text is required');
	}

	const align = data.align;
	if (align !== undefined && (typeof align !== 'string' || !VALID_ALIGNS.includes(align as NarrativeV1Align))) {
		errors.push('align must be left, center, or right');
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			text: (text as string).trim(),
			...(typeof align === 'string' && align !== 'center' ? { align: align as NarrativeV1Align } : {})
		}
	};
};
