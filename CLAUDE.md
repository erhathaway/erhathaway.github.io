----------------------
Background:
----------------------

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

----------------------
About this codebase:
----------------------

# Ethan Hathaway - Personal Portfolio

## Project Overview

A personal portfolio website for Ethan Hathaway showcasing things I make — woodworking, baking, cooking, and other crafts.

## Tech Stack

- **Framework:** Svelte 5 (using runes and new Svelte 5 syntax)
- **Styling:** Tailwind CSS (installed via bun, not CDN)
- **Build Tool:** Vite
- **Package Manager:** bun

## Design Requirements

### Layout

Two-panel fixed layout that fills the viewport:

- **Left Panel** (~320px fixed width): Navigation, item list, and hover info area
- **Right Panel** (flexible, fills remaining space): Scrollable image gallery grid

### Left Panel Components

1. **Header**
   - Name: "Ethan Hathaway" (personal site, not a business)
   - Tagline: "Things I Make"

2. **Category Pills**
   - Horizontal row of filter buttons
   - Categories: All, Wood, Food, Other
   - Active state styling
   - Clicking filters both the item list and gallery grid

3. **Item List**
   - Scrollable list of specific items (not high-level categories)
   - Example items: Cinnamon Buns, Duxelle, Side Table, Dining Room Table, Sourdough Loaf, Floating Shelves, etc.
   - Each item is hoverable and linked to corresponding gallery image

4. **Hover Info Area** (bottom of left panel)
   - Shows details when hovering over an item in the list OR an image in the gallery
   - Displays: Category tag, item title, description, and relevant metadata
   - Metadata varies by category (e.g., Material/Finish for wood, Time/Yield for food)
   - Default state shows prompt text when nothing is hovered

5. **Footer**
   - Social links: GitHub, Instagram, Contact

### Right Panel Components

1. **Gallery Grid**
   - CSS Grid layout (3 columns on desktop)
   - Mixed item sizes: regular (1x1), wide (2x1), tall (1x2), featured (2x2)
   - Minimal gap between items
   - Hover effects: subtle zoom, overlay, item number reveal

### Interactions

- Hovering gallery image → shows info in left panel
- Hovering list item → shows info in left panel  
- Clicking category pill → filters both list and gallery
- Smooth transitions on all hover/filter states

## Typography

- **Display Font:** Cormorant Garamond (serif) — for headings, titles, numbers
- **Body Font:** DM Sans (sans-serif) — for body text, labels, navigation

## Color Palette

```
cream: #F5F1EB (left panel background)
walnut: #2C2218 (primary text)
copper: #B87333 (accent, active states)
ash: #8A8078 (secondary text)
charcoal: #1A1714 (right panel background)
```

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── LeftPanel.svelte
│   │   ├── CategoryPills.svelte
│   │   ├── ItemList.svelte
│   │   ├── HoverInfo.svelte
│   │   ├── GalleryGrid.svelte
│   │   └── GalleryItem.svelte
│   ├── data/
│   │   └── items.ts
│   └── stores/
│       └── portfolio.svelte.ts
├── routes/
│   └── +page.svelte
├── app.css
└── app.html
```

## Data Structure

```typescript
interface PortfolioItem {
  id: number;
  name: string;
  category: 'wood' | 'food' | 'other';
  subcategory: string; // e.g., "Baking", "Furniture", "Leather"
  description: string;
  metadata: Record<string, string>; // e.g., { Material: "Black Walnut", Size: "8' × 42\"" }
  image?: string;
  gridSize?: 'regular' | 'wide' | 'tall' | 'featured';
}
```

## Svelte 5 Notes

- Use `$state()` for reactive state
- Use `$derived()` for computed values
- Use `$effect()` for side effects
- Use `$props()` for component props
- Use `{#snippet}` and `{@render}` for reusable template fragments
- Event handlers use `onclick` not `on:click`