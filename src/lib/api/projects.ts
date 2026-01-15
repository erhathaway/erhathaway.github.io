interface Project {
	id?: number;
	name: string;
	category: 'wood' | 'food' | 'other';
	subcategory: string;
	description?: string | null;
	metadata: Record<string, string>;
	image?: string;
	gridSize?: 'regular' | 'wide' | 'tall' | 'featured';
	isPublic: boolean;
}

const API_BASE = '/api';

export class ProjectsAPI {
	static async getAll(token?: string): Promise<Project[]> {
		const response = await fetch(`${API_BASE}/projects`, {
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		});

		if (!response.ok) {
			throw new Error('Failed to fetch projects');
		}

		return response.json();
	}

	static async create(project: Omit<Project, 'id'>, token: string): Promise<Project> {
		const response = await fetch(`${API_BASE}/projects`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(project)
		});

		if (!response.ok) {
			throw new Error('Failed to create project');
		}

		return response.json();
	}

	static async update(id: number, project: Partial<Project>, token: string): Promise<Project> {
		const response = await fetch(`${API_BASE}/projects/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(project)
		});

		if (!response.ok) {
			throw new Error('Failed to update project');
		}

		return response.json();
	}

	static async delete(id: number, token: string): Promise<void> {
		const response = await fetch(`${API_BASE}/projects/${id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			throw new Error('Failed to delete project');
		}
	}
}

export type { Project };
