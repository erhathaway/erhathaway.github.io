export const coverImageV1Schema = {
	name: 'cover-image-v1',
	label: 'Cover Image',
	description: 'Displays the current project cover image inline.'
} as const;

export type CoverImageV1Data = Record<string, never>;

export const createCoverImageV1Draft = (): CoverImageV1Data => ({});

export type CoverImageV1ValidationResult =
	| { ok: true; value: CoverImageV1Data }
	| { ok: false; errors: string[] };

export const validateCoverImageV1 = (payload: unknown): CoverImageV1ValidationResult => {
	if (payload !== null && payload !== undefined && typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}
	return { ok: true, value: {} as CoverImageV1Data };
};
