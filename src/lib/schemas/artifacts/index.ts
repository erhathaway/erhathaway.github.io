import {
	imageV1Schema,
	validateImageV1,
	type ImageV1Data,
	type ImageV1ValidationResult
} from './image-v1';

export type ArtifactSchemaName = typeof imageV1Schema.name;

export type ArtifactSchemaDefinition<TSchema extends ArtifactSchemaName, TData> = {
	name: TSchema;
	label: string;
	description: string;
	validate: (payload: unknown) => { ok: true; value: TData } | { ok: false; errors: string[] };
};

export type ArtifactDataBySchema = {
	'image-v1': ImageV1Data;
};

export const imageV1Definition: ArtifactSchemaDefinition<'image-v1', ImageV1Data> = {
	...imageV1Schema,
	validate: validateImageV1
};

export const artifactSchemas = [imageV1Definition] as const;

export const getArtifactSchema = (schema: string) => {
	return artifactSchemas.find((definition) => definition.name === schema) ?? null;
};

export const validateArtifactData = (
	schema: string,
	payload: unknown
): ImageV1ValidationResult | { ok: false; errors: string[] } => {
	const definition = getArtifactSchema(schema);
	if (!definition) {
		return { ok: false, errors: [`Unknown schema: ${schema}`] };
	}
	return definition.validate(payload);
};
