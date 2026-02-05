import {
	imageV1Schema,
	validateImageV1,
	type ImageV1Data,
	type ImageV1ValidationResult
} from './image-v1/validator';

import {
	videoV1Schema,
	validateVideoV1,
	type VideoV1Data,
	type VideoV1ValidationResult
} from './video-v1/validator';

export type ArtifactSchemaName = typeof imageV1Schema.name | typeof videoV1Schema.name;

export type ArtifactSchemaDefinition<TSchema extends string, TData> = {
	name: TSchema;
	label: string;
	description: string;
	validate: (payload: unknown) => { ok: true; value: TData } | { ok: false; errors: string[] };
};

export type ArtifactDataBySchema = {
	'image-v1': ImageV1Data;
	'video-v1': VideoV1Data;
};

export const imageV1Definition: ArtifactSchemaDefinition<'image-v1', ImageV1Data> = {
	...imageV1Schema,
	validate: validateImageV1
};

export const videoV1Definition: ArtifactSchemaDefinition<'video-v1', VideoV1Data> = {
	...videoV1Schema,
	validate: validateVideoV1
};

export const artifactSchemas = [imageV1Definition, videoV1Definition] as const;

export const getArtifactSchema = (schema: string) => {
	return artifactSchemas.find((definition) => definition.name === schema) ?? null;
};

export type ArtifactValidationResult =
	| ImageV1ValidationResult
	| VideoV1ValidationResult
	| { ok: false; errors: string[] };

export const validateArtifactData = (
	schema: string,
	payload: unknown
): ArtifactValidationResult => {
	const definition = getArtifactSchema(schema);
	if (!definition) {
		return { ok: false, errors: [`Unknown schema: ${schema}`] };
	}
	return definition.validate(payload);
};
