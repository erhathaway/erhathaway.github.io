export interface ExportManifest {
	version: 1;
	exportedAt: string;
	categories: ExportCategory[];
	projects: ExportProject[];
}

export interface ExportCategory {
	name: string;
	displayName: string;
	isPublished: boolean;
}

export interface ExportProject {
	name: string;
	displayName: string;
	description: string | null;
	isPublished: boolean;
	categories: string[];
	attributes: ExportAttribute[];
	artifacts: ExportArtifact[];
}

export interface ExportAttribute {
	name: string;
	value: string;
	showInNav: boolean;
	isPublished: boolean;
}

export interface ExportArtifact {
	schema: string;
	dataBlob: Record<string, unknown>;
	isPublished: boolean;
	_localImagePath?: string;
}

export type ConflictResolution = 'clobber' | 'merge' | 'skip';

export interface ImportConflicts {
	defaultResolution: ConflictResolution;
	perProject: Record<string, ConflictResolution>;
	perCategory: Record<string, ConflictResolution>;
}

export interface ImportSummary {
	categoriesCreated: number;
	categoriesUpdated: number;
	categoriesSkipped: number;
	projectsCreated: number;
	projectsClobbered: number;
	projectsMerged: number;
	projectsSkipped: number;
	artifactsCreated: number;
	imagesUploaded: number;
	warnings: string[];
}
