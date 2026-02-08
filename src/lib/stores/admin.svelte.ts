export type AdminCategory = {
	id: number;
	name: string;
	displayName: string;
	isPublished: boolean;
};

export type AdminProject = {
	id: number;
	name: string;
	displayName: string;
	description: string | null;
	isPublished: boolean;
	coverImageUrl: string | null;
	coverPositionX: number | null;
	coverPositionY: number | null;
	coverZoom: number | null;
	categories: string[];
	navAttributes: Array<{ name: string; value: string }>;
};

class AdminStore {
	categories = $state<AdminCategory[]>([]);
	categoriesLoaded = $state(false);
	projects = $state<AdminProject[]>([]);
	projectsLoaded = $state(false);
}

export const adminStore = new AdminStore();
