export const dividerV1Schema = {
	name: 'divider-v1',
	label: 'Divider',
	description: 'Horizontal rule that breaks the layout and starts a new row.'
} as const;

export type DividerV1Data = {
	showLine?: boolean;
};

export const createDividerV1Draft = (): DividerV1Data => ({ showLine: true });

export type DividerV1ValidationResult =
	| { ok: true; value: DividerV1Data }
	| { ok: false; errors: string[] };

export const validateDividerV1 = (payload: unknown): DividerV1ValidationResult => {
	if (payload !== null && payload !== undefined && typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = (payload ?? {}) as Record<string, unknown>;
	const showLine = data.showLine;

	if (showLine !== undefined && typeof showLine !== 'boolean') {
		return { ok: false, errors: ['showLine must be a boolean'] };
	}

	return {
		ok: true,
		value: {
			...(showLine ? { showLine: true } : {})
		}
	};
};
