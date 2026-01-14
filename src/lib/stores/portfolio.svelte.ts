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

  async uploadImage(itemId: number, file: File): Promise<void> {
    try {
      // Create a local URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);

      // Find the item and update its image property
      const item = items.find(item => item.id === itemId);
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