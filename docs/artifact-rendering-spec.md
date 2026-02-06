# Artifact Schema Component Registry

## Overview

Each artifact schema (currently only `image-v1`) provides a set of rendering components for different contexts. A central registry maps schema names to their components, replacing manual `if/else` chains.

---

## Architecture

### Schema directory structure

Each schema lives in `src/lib/schemas/artifacts/<schema>/` and exports:

- `validator.ts` — schema metadata, TypeScript type, `createDraft()`, and `validate()` function
- `components.ts` — maps component contexts to Svelte components
- `Editor.svelte`, `Viewer.svelte`, `AdminList.svelte`, `Cover.svelte` — the actual components

### Central registry (`src/lib/schemas/artifacts/index.ts`)

Exports:
- `artifactSchemas` — array of schema definitions (with `name`, `label`, `description`, `validate`, `createDraft`)
- `artifactComponentRegistry` — maps `ArtifactSchemaName → ArtifactComponentContext → Component`
- `getArtifactSchema(name)` — returns the schema definition or `null`
- `getArtifactComponent(schema, context)` — returns the component or `null`
- `validateArtifactData(schema, payload)` — validates data against a schema

### Component contexts

| Context | Component | Usage |
|---------|-----------|-------|
| `adminEditor` | `Editor.svelte` | Admin create/edit modals |
| `adminList` | `AdminList.svelte` | Admin artifact grid cards |
| `adminProjectCover` | `Cover.svelte` | Project cover display in admin |
| `publicViewLandingPage` | `Viewer.svelte` | Public landing page gallery |
| `publicViewProjectPage` | `Viewer.svelte` | Public project detail page |

### Prop interfaces per context

- **adminEditor**: `{ value?: SchemaData; onChange?: (value: SchemaData) => void; onUpload?: (file: File) => Promise<string>; onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void }`
- **adminList**: `{ data: SchemaData; className?: string }`
- **adminProjectCover**: `{ data: SchemaData; className?: string }`
- **publicViewLandingPage**: `{ data: SchemaData; className?: string }`
- **publicViewProjectPage**: `{ data: SchemaData; className?: string }`

---

## Usage

### Rendering a component dynamically

```svelte
{@const ViewerComp = getArtifactComponent(artifact.schema, 'publicViewProjectPage')}
{#if ViewerComp}
  <ViewerComp data={artifact.dataBlob} />
{:else}
  <p>Unsupported schema</p>
{/if}
```

### Creating a draft for a schema

```typescript
const schema = getArtifactSchema('image-v1');
const draft = schema?.createDraft(); // { imageUrl: '', description: '' }
```

### Adding a new schema

1. Create `src/lib/schemas/artifacts/<name>/validator.ts` with schema metadata, type, `createDraft`, and `validate`
2. Create component files: `Editor.svelte`, `Viewer.svelte`, `AdminList.svelte`, `Cover.svelte`
3. Create `src/lib/schemas/artifacts/<name>/components.ts` exporting the component map
4. Add the schema to `src/lib/schemas/artifacts/index.ts`:
   - Import validator + components
   - Add to `ArtifactSchemaName` union
   - Add definition to `artifactSchemas` array
   - Add entry to `artifactComponentRegistry`
   - Add to `ArtifactDataBySchema` type map

No other files need to change — all consumers use the registry.

---

## File reference

| File | Purpose |
|------|---------|
| `src/lib/schemas/artifacts/index.ts` | Central registry, types, resolver functions |
| `src/lib/schemas/artifacts/image-v1/validator.ts` | Schema definition + validation |
| `src/lib/schemas/artifacts/image-v1/components.ts` | Component map for image-v1 |
| `src/lib/schemas/artifacts/image-v1/Editor.svelte` | Editor component |
| `src/lib/schemas/artifacts/image-v1/Viewer.svelte` | Viewer component |
| `src/lib/schemas/artifacts/image-v1/AdminList.svelte` | Admin list card component |
| `src/lib/schemas/artifacts/image-v1/Cover.svelte` | Cover display component |
| `src/lib/components/artifacts/ArtifactView.svelte` | Generic viewer dispatcher |
| `src/routes/admin/projects/[id]/+page.svelte` | Admin project page (uses registry) |
