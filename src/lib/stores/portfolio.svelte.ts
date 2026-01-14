import { items, type Category, type PortfolioItem } from '$lib/data/items';

class PortfolioStore {
  selectedCategory = $state<Category | 'all'>('all');
  hoveredItemId = $state<number | null>(null);

  filteredItems = $derived.by(() => {
    if (this.selectedCategory === 'all') {
      return items;
    }
    return items.filter(item => item.category === this.selectedCategory);
  });

  hoveredItem = $derived.by(() => {
    if (!this.hoveredItemId) return null;
    return items.find(item => item.id === this.hoveredItemId);
  });

  setCategory(category: Category | 'all') {
    this.selectedCategory = category;
  }

  setHoveredItem(id: number | null) {
    this.hoveredItemId = id;
  }
}

export const portfolio = new PortfolioStore();