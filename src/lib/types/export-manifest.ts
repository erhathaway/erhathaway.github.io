export interface ExportManifest {
	version: 1;
	exportedAt: string;
	categories: ExportCategory[];
	projects: ExportProject[];
	siteSettings?: ExportSiteSettings;
}

export interface ExportSiteSettings {
	namecardImage?: {
		imageUrl: string;
		positionX: number;
		positionY: number;
		zoom: number;
		imageHash?: string;
		_localImagePath?: string;
	};
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
	id?: number;
	imageHash?: string;
	schema: string;
	dataBlob: Record<string, unknown>;
	isPublished: boolean;
	isCover?: boolean;
	coverPositionX?: number;
	coverPositionY?: number;
	coverZoom?: number;
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
	artifactsSkipped: number;
	imagesUploaded: number;
	warnings: string[];
}
