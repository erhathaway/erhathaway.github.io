export const enlargeV1Schema = {
	name: 'enlarge-v1',
	label: 'Enlarge',
	description: 'Makes the next image in order render wider than normal.'
} as const;

export type EnlargeV1Align = 'left' | 'center' | 'right';
export type EnlargeV1Width = 25 | 50 | 75 | 100;

export type EnlargeV1Data = {
	widthPercent: EnlargeV1Width;
	align: EnlargeV1Align;
};

const VALID_WIDTHS: EnlargeV1Width[] = [25, 50, 75, 100];
const VALID_ALIGNS: EnlargeV1Align[] = ['left', 'center', 'right'];

export const createEnlargeV1Draft = (): EnlargeV1Data => ({ widthPercent: 50, align: 'center' });

export type EnlargeV1ValidationResult =
	| { ok: true; value: EnlargeV1Data }
	| { ok: false; errors: string[] };

export const validateEnlargeV1 = (payload: unknown): EnlargeV1ValidationResult => {
	if (payload === null || payload === undefined || typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = payload as Record<string, unknown>;
	const widthPercent = data.widthPercent;
	const align = data.align;

	if (typeof widthPercent !== 'number' || !VALID_WIDTHS.includes(widthPercent as EnlargeV1Width)) {
		return { ok: false, errors: ['widthPercent must be 25, 50, 75, or 100'] };
	}

	if (typeof align !== 'string' || !VALID_ALIGNS.includes(align as EnlargeV1Align)) {
		return { ok: false, errors: ['align must be left, center, or right'] };
	}

	return {
		ok: true,
		value: { widthPercent: widthPercent as EnlargeV1Width, align: align as EnlargeV1Align }
	};
};
