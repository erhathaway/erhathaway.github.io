export const denseSectionV1Schema = {
	name: 'dense-section-v1',
	label: 'Dense Section',
	description: 'Pair of markers — images between them render at half width.'
} as const;

export type DenseSectionV1Data = {
	pairId: number;
};

export const createDenseSectionV1Draft = (): DenseSectionV1Data => ({ pairId: 0 });

export type DenseSectionV1ValidationResult =
	| { ok: true; value: DenseSectionV1Data }
	| { ok: false; errors: string[] };

export const validateDenseSectionV1 = (payload: unknown): DenseSectionV1ValidationResult => {
	if (payload === null || payload === undefined || typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = payload as Record<string, unknown>;
	const pairId = data.pairId;

	if (typeof pairId !== 'number' || !Number.isFinite(pairId)) {
		return { ok: false, errors: ['pairId must be a number'] };
	}

	return {
		ok: true,
		value: { pairId }
	};
};
