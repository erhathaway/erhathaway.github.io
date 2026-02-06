import type { Component } from 'svelte';
import type { ArtifactComponentContext, ArtifactComponentMap } from './types';
import {
	imageV1Schema,
	validateImageV1,
	createImageV1Draft,
	type ImageV1Data,
	type ImageV1ValidationResult
} from './image-v1/validator';
import { imageV1Components } from './image-v1/components';

export type { ArtifactComponentContext, ArtifactComponentMap } from './types';

export type ArtifactSchemaName = 'image-v1';

export type ArtifactSchemaDefinition<TSchema extends string, TData> = {
	name: TSchema;
	label: string;
	description: string;
	validate: (payload: unknown) => { ok: true; value: TData } | { ok: false; errors: string[] };
	createDraft: () => TData;
};

export type ArtifactDataBySchema = {
	'image-v1': ImageV1Data;
};

export const imageV1Definition: ArtifactSchemaDefinition<'image-v1', ImageV1Data> = {
	...imageV1Schema,
	validate: validateImageV1,
	createDraft: createImageV1Draft
};

export const artifactSchemas = [imageV1Definition] as const;

export const getArtifactSchema = (schema: string) => {
	return artifactSchemas.find((definition) => definition.name === schema) ?? null;
};

export type ArtifactValidationResult =
	| ImageV1ValidationResult
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

// Registry mapping schema name → context → component
export const artifactComponentRegistry: Record<ArtifactSchemaName, ArtifactComponentMap> = {
	'image-v1': imageV1Components
};

// Typed resolver
export function getArtifactComponent(schema: string, context: ArtifactComponentContext): Component<any> | null {
	const components = artifactComponentRegistry[schema as ArtifactSchemaName];
	return components?.[context] ?? null;
}
