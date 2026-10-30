export interface NamecardImageSetting {
	imageUrl: string;
	positionX: number;
	positionY: number;
	zoom: number;
	imageFormats?: string[];
}

export interface NamecardVariant extends NamecardImageSetting {
	recipe?: NamecardRecipe;
	id: string;
	name: string;
	createdAt: string;
}

export interface NamecardBackground {
	imageUrl: string;
	imageFormats?: string[];
}

export interface NamecardRecipe {
	version: 1;
	design: import('$lib/utils/namecard').NamecardDesign;
	background: NamecardBackground | null;
}
