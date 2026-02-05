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
};

class AdminStore {
	categories = $state<AdminCategory[]>([]);
	categoriesLoaded = $state(false);
	projects = $state<AdminProject[]>([]);
	projectsLoaded = $state(false);
}

export const adminStore = new AdminStore();
