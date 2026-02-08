export const dividerV1Schema = {
	name: 'divider-v1',
	label: 'Divider',
	description: 'Horizontal rule that breaks the layout and starts a new row.'
} as const;

export type DividerV1Data = Record<string, never>;

export const createDividerV1Draft = (): DividerV1Data => ({} as DividerV1Data);

export type DividerV1ValidationResult =
	| { ok: true; value: DividerV1Data }
	| { ok: false; errors: string[] };

export const validateDividerV1 = (payload: unknown): DividerV1ValidationResult => {
	if (payload !== null && payload !== undefined && typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}
	return { ok: true, value: {} as DividerV1Data };
};
