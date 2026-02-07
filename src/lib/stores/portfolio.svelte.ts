import { type PortfolioItem } from '$lib/data/items';
import { ProjectsAPI, type Project } from '$lib/api/projects';

export interface CategoryInfo {
  name: string;
  displayName: string;
}

class PortfolioStore {
  selectedCategory = $state<string | 'all'>('all');
  hoveredItemId = $state<number | null>(null);
  hoverLockId = $state<number | null>(null);
  hoverUpdatesSuppressed = $state(false);
  projects = $state<Project[]>([]);
  categories = $state<CategoryInfo[]>([]);
  loading = $state(false);

  allItems = $derived.by(() => {
    return this.projects.map(project => {
      const metadata: Record<string, string> = {};
      for (const attr of project.navAttributes) {
        metadata[attr.name] = attr.value;
      }
      return {
        id: project.id,
        name: project.displayName,
        categories: project.categories,
        description: project.description ?? '',
        metadata,
        image: project.coverImageUrl ?? undefined,
        gridSize: 'regular',
        gradientColors: 'from-[#C7D2D8] via-[#B8C5CE] to-[#D0DAE0]',
        coverPosition: { x: project.coverPositionX ?? 50, y: project.coverPositionY ?? 50, zoom: project.coverZoom ?? 1 }
      } satisfies PortfolioItem;
    });
  });

  filteredItems = $derived.by(() => {
    if (this.selectedCategory === 'all') {
      return this.allItems;
    }
    return this.allItems.filter(item => item.categories.includes(this.selectedCategory));
  });

  hoveredItem = $derived.by(() => {
    if (!this.hoveredItemId) return null;
    return this.allItems.find(item => item.id === this.hoveredItemId);
  });

  setCategory(category: string | 'all') {
    this.selectedCategory = category;
  }

  setHoveredItem(id: number | null) {
    if (this.hoverUpdatesSuppressed) {
      return;
    }
    if (this.hoverLockId !== null) {
      this.hoverLockId = null;
    }
    this.hoveredItemId = id;
  }

  lockHover(id: number) {
    this.hoverLockId = id;
    this.hoveredItemId = id;
  }

  setHoverUpdatesSuppressed(suppressed: boolean) {
    this.hoverUpdatesSuppressed = suppressed;
  }

  async loadProjects() {
    this.loading = true;
    try {
      const [projects, catRes] = await Promise.all([
        ProjectsAPI.getAll(),
        fetch('/api/categories').then(r => r.ok ? r.json() : [])
      ]);
      this.projects = projects;
      this.categories = catRes;
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      this.loading = false;
    }
  }

}

export const portfolio = new PortfolioStore();
