export type GridSize = 'regular' | 'wide' | 'tall' | 'featured';

export interface PortfolioItem {
  id: number;
  slug: string;
  name: string;
  categories: string[];
  description: string;
  metadata: Record<string, string>;
  image?: string;
  hoverImage?: string;
  imageFormats?: string[];
  hoverImageFormats?: string[];
  gridSize?: GridSize;
  gradientColors: string;
  coverPosition?: { x: number; y: number; zoom: number };
}
