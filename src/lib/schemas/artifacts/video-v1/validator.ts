export const videoV1Schema = {
	name: 'video-v1',
	label: 'Video',
	description: 'A video file with optional thumbnail and description.'
} as const;

export type VideoV1Data = {
	videoUrl: string;
	thumbnailUrl?: string;
	description?: string;
};

export const createVideoV1Draft = (): VideoV1Data => ({
	videoUrl: '',
	thumbnailUrl: '',
	description: ''
});

export type VideoV1ValidationResult =
	| { ok: true; value: VideoV1Data }
	| { ok: false; errors: string[] };

export const validateVideoV1 = (payload: unknown): VideoV1ValidationResult => {
	const errors: string[] = [];
	if (!payload || typeof payload !== 'object') {
		return { ok: false, errors: ['dataBlob must be an object'] };
	}

	const data = payload as Record<string, unknown>;
	const videoUrl = data.videoUrl;
	if (typeof videoUrl !== 'string' || videoUrl.trim().length === 0) {
		errors.push('video is required');
	}

	const thumbnailUrl = data.thumbnailUrl;
	if (thumbnailUrl !== undefined && typeof thumbnailUrl !== 'string') {
		errors.push('thumbnailUrl must be a string');
	}

	const description = data.description;
	if (description !== undefined && typeof description !== 'string') {
		errors.push('description must be a string');
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			videoUrl: (videoUrl as string).trim(),
			thumbnailUrl:
				typeof thumbnailUrl === 'string' ? thumbnailUrl.trim() || undefined : undefined,
			description: typeof description === 'string' ? description.trim() || undefined : undefined
		}
	};
};
