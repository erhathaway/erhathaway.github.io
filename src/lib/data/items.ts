export type Category = 'wood' | 'food' | 'other';
export type GridSize = 'regular' | 'wide' | 'tall' | 'featured';

export interface PortfolioItem {
  id: number;
  name: string;
  category: Category;
  subcategory: string;
  description: string;
  metadata: Record<string, string>;
  image?: string;
  gridSize?: GridSize;
  gradientColors: string;
}

export const items: PortfolioItem[] = [
  {
    id: 1,
    name: 'Cinnamon Buns',
    category: 'food',
    subcategory: 'Baking',
    description: 'Soft, pillowy rolls with a brown sugar cinnamon swirl and cream cheese frosting. Weekend morning ritual.',
    metadata: { 'Time': '3 hours', 'Yield': '12 buns' },
    gridSize: 'featured',
    gradientColors: 'from-amber-800 via-amber-700 to-amber-900'
  },
  {
    id: 2,
    name: 'Duxelle',
    category: 'food',
    subcategory: 'Cooking',
    description: 'Finely minced mushrooms, shallots, and thyme cooked down to an intense, earthy paste. Essential for Beef Wellington.',
    metadata: { 'Time': '45 min', 'Base': 'Cremini' },
    gridSize: 'regular',
    gradientColors: 'from-stone-700 via-stone-600 to-stone-800'
  },
  {
    id: 3,
    name: 'Side Table',
    category: 'wood',
    subcategory: 'Furniture',
    description: 'Minimalist bedside table with a single floating drawer. Mortise and tenon joinery throughout.',
    metadata: { 'Material': 'White Oak', 'Finish': 'Osmo Oil' },
    gridSize: 'tall',
    gradientColors: 'from-amber-900 via-yellow-800 to-amber-950'
  },
  {
    id: 4,
    name: 'Dining Room Table',
    category: 'wood',
    subcategory: 'Furniture',
    description: "8-foot live edge walnut slab with hand-turned legs. Seats 8 comfortably. Our family's gathering place.",
    metadata: { 'Material': 'Black Walnut', 'Size': '8\' × 42"' },
    gridSize: 'regular',
    gradientColors: 'from-stone-800 via-stone-700 to-stone-900'
  },
  {
    id: 5,
    name: 'Sourdough Loaf',
    category: 'food',
    subcategory: 'Baking',
    description: 'Country-style sourdough with an open crumb and blistered crust. 24-hour cold ferment for flavor development.',
    metadata: { 'Hydration': '78%', 'Starter': '5 years old' },
    gridSize: 'regular',
    gradientColors: 'from-amber-700 via-orange-700 to-amber-800'
  },
  {
    id: 6,
    name: 'Floating Shelves',
    category: 'wood',
    subcategory: 'Home',
    description: 'Set of three asymmetric shelves with hidden French cleat mounting. Clean lines, no visible hardware.',
    metadata: { 'Material': 'Maple', 'Depth': '10"' },
    gridSize: 'wide',
    gradientColors: 'from-yellow-700 via-amber-600 to-yellow-800'
  },
  {
    id: 7,
    name: 'Walnut Cutting Board',
    category: 'wood',
    subcategory: 'Kitchen',
    description: 'End-grain cutting board with juice groove. Gentle on knife edges, self-healing surface.',
    metadata: { 'Material': 'Black Walnut', 'Size': '18" × 24"' },
    gridSize: 'regular',
    gradientColors: 'from-stone-900 via-stone-800 to-neutral-900'
  },
  {
    id: 8,
    name: 'Beef Wellington',
    category: 'food',
    subcategory: 'Cooking',
    description: 'Seared tenderloin wrapped in duxelle, prosciutto, and golden puff pastry. Christmas dinner centerpiece.',
    metadata: { 'Serves': '6-8', 'Temp': 'Medium-rare' },
    gridSize: 'regular',
    gradientColors: 'from-red-900 via-red-800 to-stone-900'
  },
  {
    id: 9,
    name: 'Entry Bench',
    category: 'wood',
    subcategory: 'Furniture',
    description: 'Simple Shaker-style bench for the entryway. Tapered legs with through-tenon construction.',
    metadata: { 'Material': 'Cherry', 'Width': '48"' },
    gridSize: 'regular',
    gradientColors: 'from-rose-900 via-red-900 to-stone-900'
  },
  {
    id: 10,
    name: 'Croissants',
    category: 'food',
    subcategory: 'Baking',
    description: 'Classic French croissants with 27 layers of laminated dough. Three-day process, worth every fold.',
    metadata: { 'Butter': 'Plugrá', 'Yield': '12 pastries' },
    gridSize: 'tall',
    gradientColors: 'from-amber-600 via-yellow-600 to-amber-700'
  },
  {
    id: 11,
    name: 'Picture Frame',
    category: 'wood',
    subcategory: 'Home',
    description: 'Simple mitered frame with splined corners for strength. Made to fit a favorite print.',
    metadata: { 'Material': 'White Ash', 'Size': '16" × 20"' },
    gridSize: 'regular',
    gradientColors: 'from-neutral-700 via-stone-600 to-neutral-800'
  },
  {
    id: 12,
    name: 'Leather Wallet',
    category: 'other',
    subcategory: 'Leather',
    description: 'Bifold wallet hand-stitched with waxed thread. Vegetable-tanned leather that ages beautifully.',
    metadata: { 'Leather': 'Horween', 'Thread': 'Tiger Thread' },
    gridSize: 'regular',
    gradientColors: 'from-amber-950 via-stone-800 to-amber-900'
  }
];