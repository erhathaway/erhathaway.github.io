# Artifact Schema Rendering System — Spec Discussion

## Goal

Create a system to dynamically resolve and render the correct schema-specific component for each artifact in every rendering context, replacing manual `if/else` chains.

---

## Current State

Each schema (`image-v1`, `video-v1`) has these components in `src/lib/schemas/artifacts/<schema>/`:

| Component | Exists for image-v1 | Exists for video-v1 |
|-----------|---------------------|---------------------|
| `Editor.svelte` | Yes | Yes |
| `Viewer.svelte` | Yes | Yes |
| `AdminList.svelte` | Yes | Yes |
| `Cover.svelte` | Yes | **No** |

There's also a generic `ArtifactView.svelte` dispatcher in `src/lib/components/artifacts/` but it's unused.

The admin page (`/admin/projects/[id]`) uses manual `if/else` chains to pick the right component, and **editing is hardcoded to image-v1 only** — video-v1 artifacts can't be edited.

---

## Proposed Rendering Contexts

| Context Name | Current Component | Notes |
|-----------|-------------------|-------|
| Public display | `Viewer.svelte` | Used on project detail page |
| Public enlarged display | None? | Lightbox/modal view? |
| Admin project cover | `Cover.svelte` | Missing for video-v1 |
| Admin artifact display | `AdminList.svelte` | Thumbnail in admin grid |
| Admin artifact edit display | `Editor.svelte` | Only schema-specific content |
| Admin artifact enlarged display | None | Expanded preview in admin? |

---

## Editor Interface Contract

The Editor should only handle schema-specific content (e.g., image + description for image-v1). Generic concerns like schema name display, draft/cover toggles, and save buttons live in the parent wrapper.

Current `Editor.svelte` props:

```typescript
{
  value?: SchemaData;
  onChange?: (value: SchemaData) => void;
  onUpload?: (file: File) => Promise<string>;
  onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
}
```

### Interface question

Should all rendering contexts share a common minimal interface, or should each context define its own? For example:
- **Editors** need `value`, `onChange`, `onUpload`
- **Viewers/displays** only need `data` (read-only)
- **Cover** only needs `data` + maybe `className`

---

## Registry Pattern

Replace all `if/else schema === 'image-v1'` chains with a central registry:

```typescript
const registry = {
  'image-v1': {
    editor: ImageEditor,
    viewer: ImageViewer,
    adminList: ImageAdminList,
    cover: ImageCover,
    // ...
  },
  'video-v1': {
    editor: VideoEditor,
    viewer: VideoViewer,
    adminList: VideoAdminList,
    // cover: missing — fallback?
  }
}
```

Then resolver components per context, e.g.:

```svelte
<ArtifactEditor schema="image-v1" {value} {onChange} />
<ArtifactViewer schema="image-v1" {data} />
<ArtifactCover schema="image-v1" {data} />
```

---

## Open Questions

1. **Public display vs public enlarged display** — What's the distinction? Is "public display" the gallery grid item on the home page, and "enlarged" is when you click into the project detail? Or is "enlarged" a lightbox/modal overlay?

2. **Admin enlarged display** — Is this a full-preview modal in the admin? Like clicking an artifact in the admin grid to see it larger without entering edit mode?

3. **Fallbacks** — When a schema doesn't implement a context (like video-v1 missing Cover), should there be a generic fallback component, or should it be an error?

4. **Interface per context** — One shared interface for all contexts, or separate interfaces per context type (editor vs read-only)?

---

## File Reference

### Schema definitions
- `src/lib/schemas/artifacts/index.ts` — Central registry
- `src/lib/schemas/artifacts/image-v1/validator.ts`
- `src/lib/schemas/artifacts/video-v1/validator.ts`

### Components (image-v1)
- `src/lib/schemas/artifacts/image-v1/Editor.svelte`
- `src/lib/schemas/artifacts/image-v1/Viewer.svelte`
- `src/lib/schemas/artifacts/image-v1/AdminList.svelte`
- `src/lib/schemas/artifacts/image-v1/Cover.svelte`

### Components (video-v1)
- `src/lib/schemas/artifacts/video-v1/Editor.svelte`
- `src/lib/schemas/artifacts/video-v1/Viewer.svelte`
- `src/lib/schemas/artifacts/video-v1/AdminList.svelte`
- **Missing:** `Cover.svelte`

### Generic dispatcher (unused)
- `src/lib/components/artifacts/ArtifactView.svelte`

### Admin integration
- `src/routes/admin/projects/[id]/+page.svelte`

### Database
- `src/lib/server/db/schema.ts` — Tables: `projects`, `project_artifacts`, `project_cover_artifact`
