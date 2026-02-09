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
- **Data:** Cloudflare D1 (SQLite) via Drizzle ORM

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

## Environment Files

- `.env`: local dev vars (`DATABASE_URL`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- `.env.local` (wrangler dev): leave `PUBLIC_R2_BASE_URL` empty to use proxy URLs
- `.env.remote` (wrangler dev --remote): set `PUBLIC_R2_BASE_URL` to the preview bucket public URL
- `.env.test`: test vars (same Clerk dev keys + `DATABASE_URL` as `.env`)
- `.env.template`: scaffold for new envs; includes `E2E_BASE_URL` and `CLERK_TEST_TOKEN` for integration tests

Example `.env.local`:

```env
DATABASE_URL=file:local.db
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key
PUBLIC_R2_BASE_URL=
```

Example `.env.remote`:

```env
DATABASE_URL=file:local.db
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key
PUBLIC_R2_BASE_URL=https://<account-id>.r2.cloudflarestorage.com/portfolio-artifacts-22-dev
```

## Cloudflare D1 Notes

- D1 binding is `DB` in `wrangler.toml`
- Access database via `event.platform.env.DB` and `getDb` in `src/lib/server/db/index.ts`
- `event.locals.db` is set in `src/hooks.server.ts`
- Use `bunx wrangler dev` for local dev with D1 (Vite dev does not provide `platform.env`)
- Generate migrations with `bun run db:generate`, apply with `bunx wrangler d1 execute portfolio-db --file=./drizzle/<migration>.sql`

## Admin Route Auth

Every page route under `src/routes/admin/` must have a `+page.server.ts` with a Clerk auth guard that redirects unauthenticated users:

```typescript
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const { userId } = locals.auth();
	if (!userId) {
		throw redirect(307, '/admin/sign-in');
	}
	return {};
};
```

When adding a new admin page route, always create this `+page.server.ts` alongside the `+page.svelte`.

## API Notes

- Client API calls should use same-origin `/api` endpoints.
- `/api/projects` endpoints are available for CRUD; reads are public for published items.

## View Transitions API

View transitions are enabled for home↔project navigation in `src/routes/+layout.svelte` via the `onNavigate` hook and `document.startViewTransition()`. CSS rules live in the `@supports (view-transition-name: none)` block in `src/app.css`.

### How it works

`startViewTransition()` captures the **entire document** as screenshots, hides the real DOM, updates it, then swaps back. Elements with a `view-transition-name` are extracted into their own transition group and animated independently. Everything else falls into the `root` group.

### Key problems and solutions

**1. Named groups render above root — fixed elements get covered**

Named transition groups (like `project-image`) stack above the `root` group by default. This means fixed UI elements (social links, category pills) that are part of `root` get hidden behind the morphing image during the transition.

**Fix:** Give persistent fixed elements their own `view-transition-name` and set `z-index: 99` on their `::view-transition-group` so they render above the morphing content.

**2. `animation: none` on groups breaks positioning**

Setting `animation: none !important` on a `::view-transition-group` removes the browser's positioning transform, sending the element to (0, 0) — the top-left corner.

**Fix:** Use `animation-duration: 0s !important` instead. This lets the positioning transform resolve instantly without removing it.

**3. Fixed elements lose `position: fixed` during transitions**

When a `position: fixed` element gets a `view-transition-name`, the browser extracts it into an absolutely-positioned pseudo-element relative to the viewport container. The `fixed` behavior is lost.

**Fix:** This isn't an issue as long as positioning resolves correctly (see point 2). The `::view-transition-group` is positioned within a viewport-covering container, so absolute positioning gives the same result as fixed.

**4. Old root snapshot causes flash on persistent elements**

Both old and new root screenshots at `opacity: 1` causes a visible swap frame on elements that shouldn't change.

**Fix:** Set `::view-transition-old(root)` to `opacity: 0` so only the new state renders. Persistent elements appear instantly in their new (identical) state.

### Pattern for persistent fixed UI elements

To keep a fixed element stable during transitions:

```svelte
<!-- In the template -->
<div class="fixed ..." style="view-transition-name: my-element">
```

```css
/* In app.css inside @supports (view-transition-name: none) */
::view-transition-group(my-element) {
  animation-duration: 0s !important;
  z-index: 99;
}
::view-transition-old(my-element) {
  animation: none !important;
  opacity: 0;
}
::view-transition-new(my-element) {
  animation: none !important;
  opacity: 1;
}
```

### Pattern for morphing elements (e.g., category pill → back button)

To morph one element into another across pages:

1. Give both elements the same `view-transition-name`
2. Let the group animate position/size (don't set `animation-duration: 0s`)
3. Set `z-index: 99` on the group if it needs to stay above the morphing image
4. Hide old content instantly, show new content instantly (avoids crossfade flicker)

```css
::view-transition-group(category-back) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 99;
}
::view-transition-old(category-back) {
  animation: none !important;
  opacity: 0;
}
::view-transition-new(category-back) {
  animation: none !important;
  opacity: 1;
}
```

### Current named transition groups

| Name | Element | Behavior |
|------|---------|----------|
| `social-links` | Social links footer | Static, z-index 99 |
| `bottom-bar` | Category pills / back button container | Static, z-index 99 |
| `category-back` | Active category pill ↔ back button | Morphs over 0.4s, z-index 99 |
| `main-content` | Main scrollable content area | Old hidden instantly, new shown instantly |
| `project-image-{id}` | Gallery item ↔ project hero image | Position/size morph over 0.6s |
| `hover-info-*` | Hover info text blocks | Position morph over 0.6s |

### Scope

View transitions only run for home→project and project→home navigation. Project→project and all other routes use standard SvelteKit client-side navigation with no view transition.

## Image Optimization & Responsive Images

Images use a two-layer optimization strategy:

1. **Format optimization (build-time):** On upload, images are converted to AVIF and WebP via Cloudflare Image Resizing and stored in R2. The `imageFormats` field on artifacts (e.g. `['avif', 'webp']`) tracks available formats, rendered as `<picture>` elements with `<source>` per format.

2. **Dimension optimization (runtime):** Cloudflare Image Resizing serves images at 400w, 800w, and 1200w via `/cdn-cgi/image/` URLs in `srcset` attributes. The browser picks the best size based on the `sizes` attribute.

### Key constraint: AVIF cannot be an Image Resizing source

Cloudflare Image Resizing returns HTTP 415 (error 9520) when AVIF is used as the input image. All resizing requests use the **WebP variant** as the source, with `format=auto` (or explicit `format=avif`/`format=webp` for `<source>` elements) to control the output format.

### Environment gating

Responsive srcset URLs only work where Cloudflare Image Resizing is available (production). The feature is gated behind `PUBLIC_CF_IMAGE_RESIZING=true`, set as a Cloudflare secret (not in `wrangler.toml` `[vars]`, which would enable it in local dev too).

When disabled, `getResponsiveSrcset()` returns `undefined` and components fall back to plain `src` URLs. Svelte omits attributes set to `undefined`, so no broken `srcset` is emitted.

### Utility file: `src/lib/utils/image-formats.ts`

| Function | Purpose |
|----------|---------|
| `isResizingEnabled()` | Checks `PUBLIC_CF_IMAGE_RESIZING` env var |
| `getResponsiveSrcset(url)` | Returns `/cdn-cgi/image/width=W,quality=80,format=auto/...` srcset string, or `undefined` when disabled |
| `getImageSources(url, formats, sizes)` | Returns `<source>` data for `<picture>` elements; uses responsive srcsets when resizing is enabled |
| `replaceExtension(url, ext)` | Swaps file extension on a URL path |
| `GALLERY_SIZES` | `'(max-width: 899px) 50vw, 33vw'` — for gallery grid images |

### `sizes` values by rendering context

| Context | `sizes` value | Rationale |
|---------|---------------|-----------|
| Gallery grid (home page) | `(max-width: 899px) 50vw, 33vw` | 2 cols below 900px, 3 cols above |
| Project page cover | `(max-width: 767px) 100vw, calc(100vw - 320px)` | Full width on mobile, minus left panel on desktop |
| Artifact Viewer/Cover | `(max-width: 767px) 100vw, calc(100vw - 320px)` | Same as project cover |

The 767px breakpoint matches the left panel overlay point (`md:` = 768px). The 899px breakpoint matches the gallery column switch (2 → 3 columns at 900px).

### Components using responsive images

- `GalleryItem.svelte` — primary + hover images with `GALLERY_SIZES`
- `GalleryGrid.svelte` — namecard image with `GALLERY_SIZES`
- `project/[id]/+page.svelte` — project cover image
- `image-v1/Viewer.svelte` — artifact viewer on project detail page
- `image-v1/Cover.svelte` — artifact cover component

## Artifact Schema System

Projects contain **artifacts** — typed content blocks (images, videos, etc.) that are rendered differently depending on context. The system is built around a registry that maps schema names to Svelte components for each rendering context.

### Core concepts

- **Schema definition** (`ArtifactSchemaDefinition`): a name, label, description, validator, and draft factory. Defined in `src/lib/schemas/artifacts/index.ts`.
- **Component map** (`ArtifactComponentMap`): maps each of the 5 rendering contexts to a Svelte component. Defined per-schema (e.g. `src/lib/schemas/artifacts/image-v1/components.ts`).
- **Component registry** (`artifactComponentRegistry`): top-level record mapping schema names to their component maps. Lives in `src/lib/schemas/artifacts/index.ts`.

### Rendering contexts

Each schema provides a component for every context:

| Context | Purpose | Typical props |
|---------|---------|---------------|
| `adminEditor` | Editable form for creating/updating an artifact | `value`, `onChange`, `onUpload`, `onUploadStateChange` |
| `adminList` | Compact read-only card in admin project artifact list | `data` |
| `adminProjectCover` | Cover image display in admin project view | `data`, `className` |
| `publicViewLandingPage` | Gallery rendering on the public landing page | `data` |
| `publicViewProjectPage` | Detail rendering on a public project page | `data` |

### Key files

```
src/lib/schemas/artifacts/
├── index.ts              # Registry, schema list, getArtifactSchema(), getArtifactComponent()
├── types.ts              # ArtifactComponentContext, ArtifactComponentMap
└── image-v1/
    ├── validator.ts      # ImageV1Data type, validation, draft factory
    ├── components.ts     # Maps contexts → Editor/Viewer/AdminList/Cover components
    ├── Editor.svelte     # adminEditor component
    ├── Viewer.svelte     # publicViewLandingPage & publicViewProjectPage component
    ├── AdminList.svelte  # adminList component
    └── Cover.svelte      # adminProjectCover component
```

### Adding a new schema

1. Create a new directory under `src/lib/schemas/artifacts/` (e.g. `video-v1/`)
2. Add a `validator.ts` with the data type, validation function, and draft factory
3. Create Svelte components for each of the 5 contexts
4. Add a `components.ts` that exports an `ArtifactComponentMap`
5. In `src/lib/schemas/artifacts/index.ts`:
   - Add the schema name to the `ArtifactSchemaName` union type
   - Create and export the schema definition
   - Add it to the `artifactSchemas` array
   - Add its component map to `artifactComponentRegistry`

### Schema preview page

The admin has a preview page at `/admin/schemas/[name]` that renders all 5 contexts for a given schema side-by-side with sample placeholder data. This is useful for visually verifying how each component looks without needing real project data.

- Route: `src/routes/admin/schemas/[name]/+page.svelte`
- Auth-gated via `+page.server.ts` (redirects to sign-in)
- Linked from the "Schemas" section in the admin left nav (`src/routes/admin/+layout.svelte`)
- The nav section is auto-generated from the `artifactSchemas` array, so new schemas appear automatically

## Deployment

The site deploys to Cloudflare Workers via Wrangler. The build and deploy are a single command:

```bash
bun run deploy        # or: bunx wrangler deploy
```

This runs `vite build` (configured in `wrangler.toml [build]`), then uploads the Worker + static assets to Cloudflare.

- **Production URL:** `erhathaway.com`
- **Route:** `erhathaway.com/*` (defined in `wrangler.toml`)

### Secrets (set via `wrangler secret put <NAME>`)

- `CLERK_SECRET_KEY` — Clerk authentication
- `GOOGLE_CLIENT_SECRET` — Google Photos OAuth
- `GOOGLE_TOKEN_ENCRYPTION_KEY` — AES-GCM key for encrypting stored Google tokens
- `PUBLIC_CF_IMAGE_RESIZING` — set to `true` in production only (enables responsive srcset URLs)

### Database migrations

After schema changes, generate and apply migrations before deploying:

```bash
bun run db:generate                    # generate migration SQL
bun run db:migrate:remote              # apply to production D1
bun run deploy                         # deploy the Worker
```
