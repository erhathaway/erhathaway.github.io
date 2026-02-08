export const imageV1Schema = {
	name: 'image-v1',
	label: 'Image v1',
	description: 'Single image with optional description.'
} as const;

export type ImageV1Data = {
	imageUrl: string;
	description?: string;
	positionX?: number;
	positionY?: number;
	zoom?: number;
	hoverImageUrl?: string;
	imageFormats?: string[];
	hoverImageFormats?: string[];
};

export const createImageV1Draft = (): ImageV1Data => ({
	imageUrl: '',
	description: ''
});

export type ImageV1ValidationResult =
	| { ok: true; value: ImageV1Data }
	| { ok: false; errors: string[] };

export const validateImageV1 = (payload: unknown): ImageV1ValidationResult => {
	const errors: string[] = [];
	if (!payload || typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = payload as Record<string, unknown>;
	const imageUrl = data.imageUrl;
	if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
		errors.push('image is required');
	}

	const description = data.description;
	if (description !== undefined && typeof description !== 'string') {
		errors.push('description must be a string');
	}

	const positionX = data.positionX;
	if (positionX !== undefined && typeof positionX !== 'number') {
		errors.push('positionX must be a number');
	}

	const positionY = data.positionY;
	if (positionY !== undefined && typeof positionY !== 'number') {
		errors.push('positionY must be a number');
	}

	const zoom = data.zoom;
	if (zoom !== undefined && typeof zoom !== 'number') {
		errors.push('zoom must be a number');
	}

	const hoverImageUrl = data.hoverImageUrl;
	if (hoverImageUrl !== undefined && typeof hoverImageUrl !== 'string') {
		errors.push('hoverImageUrl must be a string');
	}

	const imageFormats = data.imageFormats;
	if (imageFormats !== undefined && (!Array.isArray(imageFormats) || !imageFormats.every((f: unknown) => typeof f === 'string'))) {
		errors.push('imageFormats must be an array of strings');
	}

	const hoverImageFormats = data.hoverImageFormats;
	if (hoverImageFormats !== undefined && (!Array.isArray(hoverImageFormats) || !hoverImageFormats.every((f: unknown) => typeof f === 'string'))) {
		errors.push('hoverImageFormats must be an array of strings');
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			imageUrl: imageUrl.trim(),
			description: typeof description === 'string' ? description.trim() || undefined : undefined,
			...(typeof positionX === 'number' ? { positionX } : {}),
			...(typeof positionY === 'number' ? { positionY } : {}),
			...(typeof zoom === 'number' ? { zoom } : {}),
			...(typeof hoverImageUrl === 'string' && hoverImageUrl.trim() ? { hoverImageUrl: hoverImageUrl.trim() } : {}),
			...(Array.isArray(imageFormats) && imageFormats.length > 0 ? { imageFormats } : {}),
			...(Array.isArray(hoverImageFormats) && hoverImageFormats.length > 0 ? { hoverImageFormats } : {})
		}
	};
};
