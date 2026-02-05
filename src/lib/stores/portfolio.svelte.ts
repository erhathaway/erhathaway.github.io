import { items, type Category, type PortfolioItem } from '$lib/data/items';
import { ProjectsAPI, type Project } from '$lib/api/projects';

class PortfolioStore {
  selectedCategory = $state<Category | 'all'>('all');
  hoveredItemId = $state<number | null>(null);
  hoverLockId = $state<number | null>(null);
  projects = $state<Project[]>([]);
  loading = $state(false);

  // Convert API projects to portfolio items format
  // Offset IDs to avoid collisions with static items (ids 1-24)
  apiItems = $derived.by(() => {
    return this.projects.map(project => ({
      id: (project.id || 0) + 100_000,
      name: project.name,
      category: project.category,
      subcategory: project.subcategory,
      description: project.description,
      metadata: project.metadata,
      image: project.image,
      gridSize: project.gridSize || 'regular'
    } as PortfolioItem));
  });

  // Combine static items with API items
  allItems = $derived.by(() => {
    return [...items, ...this.apiItems];
  });

  filteredItems = $derived.by(() => {
    if (this.selectedCategory === 'all') {
      return this.allItems;
    }
    return this.allItems.filter(item => item.category === this.selectedCategory);
  });

  hoveredItem = $derived.by(() => {
    if (!this.hoveredItemId) return null;
    return this.allItems.find(item => item.id === this.hoveredItemId);
  });

  setCategory(category: Category | 'all') {
    this.selectedCategory = category;
  }

  setHoveredItem(id: number | null) {
    if (this.hoverLockId !== null) {
      this.hoverLockId = null;
    }
    this.hoveredItemId = id;
  }

  lockHover(id: number) {
    this.hoverLockId = id;
    this.hoveredItemId = id;
  }

  async loadProjects() {
    this.loading = true;
    try {
      this.projects = await ProjectsAPI.getAll();
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      this.loading = false;
    }
  }

  async uploadImage(itemId: number, file: File): Promise<void> {
    try {
      // Create a local URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);

      // Find the item and update its image property
      const item = this.allItems.find(item => item.id === itemId);
      if (item) {
        item.image = imageUrl;
      }

      // In a real app, you'd upload to a server here
      console.log(`Uploaded image for item ${itemId}:`, file.name);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }
}

export const portfolio = new PortfolioStore();
