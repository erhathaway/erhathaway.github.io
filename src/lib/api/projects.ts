interface Project {
	id: number;
	name: string;
	displayName: string;
	description: string | null;
	isPublished: boolean;
	coverImageUrl: string | null;
	categories: string[];
	navAttributes: Array<{ name: string; value: string }>;
}

export class ProjectsAPI {
	static async getAll(): Promise<Project[]> {
		const response = await fetch('/api/projects');

		if (!response.ok) {
			throw new Error('Failed to fetch projects');
		}

		return response.json();
	}
}

export type { Project };
