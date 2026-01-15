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
    gradientColors: 'from-[#E8D5B7] via-[#F4E4C1] to-[#E3C8A8]'
  },
  {
    id: 2,
    name: 'Duxelle',
    category: 'food',
    subcategory: 'Cooking',
    description: 'Finely minced mushrooms, shallots, and thyme cooked down to an intense, earthy paste. Essential for Beef Wellington.',
    metadata: { 'Time': '45 min', 'Base': 'Cremini' },
    gridSize: 'regular',
    gradientColors: 'from-[#C7D2D8] via-[#B8C5CE] to-[#D0DAE0]'
  },
  {
    id: 3,
    name: 'Side Table',
    category: 'wood',
    subcategory: 'Furniture',
    description: 'Minimalist bedside table with a single floating drawer. Mortise and tenon joinery throughout.',
    metadata: { 'Material': 'White Oak', 'Finish': 'Osmo Oil' },
    gridSize: 'tall',
    gradientColors: 'from-[#B5C7C3] via-[#C8D5CC] to-[#A7B8B2]'
  },
  {
    id: 4,
    name: 'Dining Room Table',
    category: 'wood',
    subcategory: 'Furniture',
    description: "8-foot live edge walnut slab with hand-turned legs. Seats 8 comfortably. Our family's gathering place.",
    metadata: { 'Material': 'Black Walnut', 'Size': '8\' × 42"' },
    gridSize: 'regular',
    gradientColors: 'from-[#A8B8C8] via-[#B5C4D2] to-[#9FAFC0]'
  },
  {
    id: 5,
    name: 'Sourdough Loaf',
    category: 'food',
    subcategory: 'Baking',
    description: 'Country-style sourdough with an open crumb and blistered crust. 24-hour cold ferment for flavor development.',
    metadata: { 'Hydration': '78%', 'Starter': '5 years old' },
    gridSize: 'regular',
    gradientColors: 'from-[#F5E6D3] via-[#E8D4B1] to-[#DFC8A3]'
  },
  {
    id: 6,
    name: 'Floating Shelves',
    category: 'wood',
    subcategory: 'Home',
    description: 'Set of three asymmetric shelves with hidden French cleat mounting. Clean lines, no visible hardware.',
    metadata: { 'Material': 'Maple', 'Depth': '10"' },
    gridSize: 'wide',
    gradientColors: 'from-[#E4D7C5] via-[#D9C8B2] to-[#F0E2D0]'
  },
  {
    id: 7,
    name: 'Walnut Cutting Board',
    category: 'wood',
    subcategory: 'Kitchen',
    description: 'End-grain cutting board with juice groove. Gentle on knife edges, self-healing surface.',
    metadata: { 'Material': 'Black Walnut', 'Size': '18" × 24"' },
    gridSize: 'regular',
    gradientColors: 'from-[#B8CAD6] via-[#A5B8C8] to-[#C5D5E0]'
  },
  {
    id: 8,
    name: 'Beef Wellington',
    category: 'food',
    subcategory: 'Cooking',
    description: 'Seared tenderloin wrapped in duxelle, prosciutto, and golden puff pastry. Christmas dinner centerpiece.',
    metadata: { 'Serves': '6-8', 'Temp': 'Medium-rare' },
    gridSize: 'regular',
    gradientColors: 'from-[#D9B5A0] via-[#E5C4B1] to-[#C8A590]'
  },
  {
    id: 9,
    name: 'Entry Bench',
    category: 'wood',
    subcategory: 'Furniture',
    description: 'Simple Shaker-style bench for the entryway. Tapered legs with through-tenon construction.',
    metadata: { 'Material': 'Cherry', 'Width': '48"' },
    gridSize: 'regular',
    gradientColors: 'from-[#E5C9B5] via-[#D8B5A0] to-[#F0D7C5]'
  },
  {
    id: 10,
    name: 'Croissants',
    category: 'food',
    subcategory: 'Baking',
    description: 'Classic French croissants with 27 layers of laminated dough. Three-day process, worth every fold.',
    metadata: { 'Butter': 'Plugrá', 'Yield': '12 pastries' },
    gridSize: 'tall',
    gradientColors: 'from-[#F9E9C8] via-[#F5DEB3] to-[#EDD5A6]'
  },
  {
    id: 11,
    name: 'Picture Frame',
    category: 'wood',
    subcategory: 'Home',
    description: 'Simple mitered frame with splined corners for strength. Made to fit a favorite print.',
    metadata: { 'Material': 'White Ash', 'Size': '16" × 20"' },
    gridSize: 'regular',
    gradientColors: 'from-[#C0D0DC] via-[#B2C3D2] to-[#D0DDE6]'
  },
  {
    id: 12,
    name: 'Leather Wallet',
    category: 'other',
    subcategory: 'Leather',
    description: 'Bifold wallet hand-stitched with waxed thread. Vegetable-tanned leather that ages beautifully.',
    metadata: { 'Leather': 'Horween', 'Thread': 'Tiger Thread' },
    gridSize: 'regular',
    gradientColors: 'from-[#CCB5A0] via-[#D9C4B0] to-[#BFA590]'
  },
  {
    id: 13,
    name: 'Bookcase',
    category: 'wood',
    subcategory: 'Furniture',
    description: 'Floor-to-ceiling bookcase with adjustable shelves. Dadoes and rabbets for strength.',
    metadata: { 'Material': 'Pine', 'Height': '7 feet' },
    gridSize: 'tall',
    gradientColors: 'from-[#D4C4B0] via-[#E0D0BC] to-[#C8B8A4]'
  },
  {
    id: 14,
    name: 'Focaccia',
    category: 'food',
    subcategory: 'Baking',
    description: 'Dimpled Italian flatbread with rosemary and sea salt. High hydration for an airy crumb.',
    metadata: { 'Hydration': '85%', 'Time': '24 hours' },
    gridSize: 'wide',
    gradientColors: 'from-[#E8DCC8] via-[#F0E4D0] to-[#DFD3BF]'
  },
  {
    id: 15,
    name: 'Jewelry Box',
    category: 'wood',
    subcategory: 'Home',
    description: 'Small keepsake box with felt-lined compartments. Dovetailed corners and hidden hinges.',
    metadata: { 'Material': 'Mahogany', 'Size': '8" × 6"' },
    gridSize: 'regular',
    gradientColors: 'from-[#C8A890] via-[#D4B49C] to-[#BC9C84]'
  },
  {
    id: 16,
    name: 'Ramen Broth',
    category: 'food',
    subcategory: 'Cooking',
    description: 'Rich tonkotsu broth simmered for 18 hours. Creamy, collagen-packed liquid gold.',
    metadata: { 'Bones': 'Pork femur', 'Time': '18 hours' },
    gridSize: 'regular',
    gradientColors: 'from-[#F5E5D0] via-[#EDD9C3] to-[#F8ECD8]'
  },
  {
    id: 17,
    name: 'Coffee Table',
    category: 'wood',
    subcategory: 'Furniture',
    description: 'Mid-century inspired coffee table with tapered legs. Book-matched walnut top with breadboard ends.',
    metadata: { 'Material': 'Walnut', 'Size': '48" × 24"' },
    gridSize: 'featured',
    gradientColors: 'from-[#B0A090] via-[#C0B0A0] to-[#A09080]'
  },
  {
    id: 18,
    name: 'Bagels',
    category: 'food',
    subcategory: 'Baking',
    description: 'New York-style bagels, boiled then baked. Dense, chewy interior with a glossy crust.',
    metadata: { 'Malt': 'Barley', 'Yield': '8 bagels' },
    gridSize: 'regular',
    gradientColors: 'from-[#E5D5C5] via-[#D8C8B8] to-[#F0E0D0]'
  },
  {
    id: 19,
    name: 'Spice Rack',
    category: 'wood',
    subcategory: 'Kitchen',
    description: 'Wall-mounted spice rack with angled shelves. Holds 24 jars at the perfect viewing angle.',
    metadata: { 'Material': 'Bamboo', 'Capacity': '24 jars' },
    gridSize: 'regular',
    gradientColors: 'from-[#E8D8C0] via-[#F0E0C8] to-[#DFD0B8]'
  },
  {
    id: 20,
    name: 'Pasta',
    category: 'food',
    subcategory: 'Cooking',
    description: 'Hand-rolled pasta made with tipo 00 flour. Silky sheets perfect for ravioli or fettuccine.',
    metadata: { 'Flour': 'Tipo 00', 'Eggs': 'Farm fresh' },
    gridSize: 'wide',
    gradientColors: 'from-[#F8E8D0] via-[#F0DFC8] to-[#E8D8C0]'
  },
  {
    id: 21,
    name: 'Desk Organizer',
    category: 'wood',
    subcategory: 'Office',
    description: 'Desktop organizer with compartments for pens, papers, and small items. Clean, functional design.',
    metadata: { 'Material': 'Birch', 'Finish': 'Natural' },
    gridSize: 'regular',
    gradientColors: 'from-[#D8D0C8] via-[#E5DDD5] to-[#CCC4BC]'
  },
  {
    id: 22,
    name: 'Macarons',
    category: 'food',
    subcategory: 'Baking',
    description: 'Delicate French cookies with smooth tops and ruffled feet. Filled with ganache and buttercream.',
    metadata: { 'Technique': 'Italian meringue', 'Yield': '24 cookies' },
    gridSize: 'regular',
    gradientColors: 'from-[#F5C8D8] via-[#FFD0E0] to-[#E8BBD0]'
  },
  {
    id: 23,
    name: 'Plant Stand',
    category: 'wood',
    subcategory: 'Home',
    description: 'Three-tier plant stand for the corner. Graduated platforms to display succulents and herbs.',
    metadata: { 'Material': 'Cedar', 'Height': '42"' },
    gridSize: 'tall',
    gradientColors: 'from-[#C8B8A8] via-[#D5C5B5] to-[#BCB0A0]'
  },
  {
    id: 24,
    name: 'Kimchi',
    category: 'food',
    subcategory: 'Fermentation',
    description: 'Traditional Korean fermented cabbage. Spicy, sour, umami-packed. Two-week fermentation process.',
    metadata: { 'Fermentation': '2 weeks', 'Spice': 'Gochugaru' },
    gridSize: 'regular',
    gradientColors: 'from-[#E8C0B0] via-[#F0C8B8] to-[#DFB8A8]'
  }
];