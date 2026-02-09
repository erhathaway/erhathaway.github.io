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
import {
	dividerV1Schema,
	validateDividerV1,
	createDividerV1Draft,
	type DividerV1Data,
	type DividerV1ValidationResult
} from './divider-v1/validator';
import { dividerV1Components } from './divider-v1/components';
import {
	sectionTitleV1Schema,
	validateSectionTitleV1,
	createSectionTitleV1Draft,
	type SectionTitleV1Data,
	type SectionTitleV1ValidationResult
} from './section-title-v1/validator';
import { sectionTitleV1Components } from './section-title-v1/components';
import {
	narrativeV1Schema,
	validateNarrativeV1,
	createNarrativeV1Draft,
	type NarrativeV1Data,
	type NarrativeV1ValidationResult
} from './narrative-v1/validator';
import { narrativeV1Components } from './narrative-v1/components';
import {
	denseSectionV1Schema,
	validateDenseSectionV1,
	createDenseSectionV1Draft,
	type DenseSectionV1Data,
	type DenseSectionV1ValidationResult
} from './dense-section-v1/validator';
import { denseSectionV1Components } from './dense-section-v1/components';

export type { ArtifactComponentContext, ArtifactComponentMap } from './types';

export type ArtifactSchemaName = 'image-v1' | 'divider-v1' | 'section-title-v1' | 'narrative-v1' | 'dense-section-v1';

export type ArtifactSchemaDefinition<TSchema extends string, TData> = {
	name: TSchema;
	label: string;
	description: string;
	validate: (payload: unknown) => { ok: true; value: TData } | { ok: false; errors: string[] };
	createDraft: () => TData;
};

export type ArtifactDataBySchema = {
	'image-v1': ImageV1Data;
	'divider-v1': DividerV1Data;
	'section-title-v1': SectionTitleV1Data;
	'narrative-v1': NarrativeV1Data;
	'dense-section-v1': DenseSectionV1Data;
};

export const imageV1Definition: ArtifactSchemaDefinition<'image-v1', ImageV1Data> = {
	...imageV1Schema,
	validate: validateImageV1,
	createDraft: createImageV1Draft
};

export const dividerV1Definition: ArtifactSchemaDefinition<'divider-v1', DividerV1Data> = {
	...dividerV1Schema,
	validate: validateDividerV1,
	createDraft: createDividerV1Draft
};

export const sectionTitleV1Definition: ArtifactSchemaDefinition<'section-title-v1', SectionTitleV1Data> = {
	...sectionTitleV1Schema,
	validate: validateSectionTitleV1,
	createDraft: createSectionTitleV1Draft
};

export const narrativeV1Definition: ArtifactSchemaDefinition<'narrative-v1', NarrativeV1Data> = {
	...narrativeV1Schema,
	validate: validateNarrativeV1,
	createDraft: createNarrativeV1Draft
};

export const denseSectionV1Definition: ArtifactSchemaDefinition<'dense-section-v1', DenseSectionV1Data> = {
	...denseSectionV1Schema,
	validate: validateDenseSectionV1,
	createDraft: createDenseSectionV1Draft
};

export const artifactSchemas = [imageV1Definition, dividerV1Definition, sectionTitleV1Definition, narrativeV1Definition, denseSectionV1Definition] as const;

export const getArtifactSchema = (schema: string) => {
	return artifactSchemas.find((definition) => definition.name === schema) ?? null;
};

export type ArtifactValidationResult =
	| ImageV1ValidationResult
	| DividerV1ValidationResult
	| SectionTitleV1ValidationResult
	| NarrativeV1ValidationResult
	| DenseSectionV1ValidationResult
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
	'image-v1': imageV1Components,
	'divider-v1': dividerV1Components,
	'section-title-v1': sectionTitleV1Components,
	'narrative-v1': narrativeV1Components,
	'dense-section-v1': denseSectionV1Components
};

// Typed resolver
export function getArtifactComponent(schema: string, context: ArtifactComponentContext): Component<any> | null {
	const components = artifactComponentRegistry[schema as ArtifactSchemaName];
	return components?.[context] ?? null;
}
