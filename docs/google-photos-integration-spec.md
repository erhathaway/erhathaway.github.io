# Google Photos Integration — Spec

## Overview

Add the ability to import images from Google Photos as project artifacts. This involves:

1. **Admin integration page** — Connect/disconnect Google Photos, view connection status
2. **Add artifact flow** — Transform the "Add artifact" card into a source picker (file upload vs. Google Photos)
3. **Google Photos picker** — Browse albums/photos and import selected images as artifacts

---

## 1. Google OAuth Setup

### How it works

Google Photos API requires OAuth 2.0 with the `https://www.googleapis.com/auth/photoslibrary.readonly` scope. The flow:

1. Admin clicks "Connect Google Photos" on the integration page
2. Server redirects to Google's OAuth consent screen
3. Google redirects back with an authorization code
4. Server exchanges code for access + refresh tokens
5. Tokens are stored in D1 (encrypted at rest)
6. Access tokens are refreshed automatically when expired

### Environment variables

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...          # Cloudflare secret (wrangler secret put)
GOOGLE_REDIRECT_URI=https://erhathaway.com/api/integrations/google-photos/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=...   # Cloudflare secret, 32-byte key for AES-GCM
```

### Token storage

New D1 table:

```sql
CREATE TABLE integrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  provider   TEXT NOT NULL UNIQUE,            -- 'google-photos'
  user_id    TEXT NOT NULL,                   -- Clerk user ID who connected
  tokens     TEXT NOT NULL,                   -- AES-GCM encrypted JSON { access_token, refresh_token, expires_at }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Drizzle schema addition in `src/lib/server/db/schema.ts`:

```typescript
export const integrations = sqliteTable('integrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull().unique(),
  userId: text('user_id').notNull(),
  tokens: text('tokens').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
});
```

Only one row per provider — this is a single-user admin system so we don't need multi-tenant token storage.

---

## 2. API Routes

### OAuth flow

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/connect` | `GET` | Generate OAuth URL, redirect to Google |
| `/api/integrations/google-photos/callback` | `GET` | Handle OAuth callback, exchange code for tokens, store, redirect to admin |
| `/api/integrations/google-photos/disconnect` | `POST` | Revoke token, delete row from `integrations` |
| `/api/integrations/google-photos/status` | `GET` | Return `{ connected: boolean, connectedAt?: string }` |

### Google Photos browsing

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/albums` | `GET` | List albums (paginated). Returns `{ albums: [...], nextPageToken? }` |
| `/api/integrations/google-photos/search` | `POST` | Search/list media items. Body: `{ albumId?, pageToken?, pageSize? }`. Returns `{ mediaItems: [...], nextPageToken? }` |

### Import

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/import` | `POST` | Import selected photo(s) as artifact(s). Body: `{ projectId, items: [{ mediaItemId, baseUrl, filename }] }` |

**Import flow detail:**
1. For each selected media item, fetch the full-resolution image from `baseUrl=w{maxWidth}-h{maxHeight}` (Google Photos base URLs require size params)
2. Upload the image bytes to R2 (same pattern as existing file upload in `/api/uploads/artifacts`)
3. Create a `projectArtifacts` row with schema `image-v1` and `dataBlob: { imageUrl, description }` where description defaults to the Google Photos filename
4. Return the created artifact(s)

This means Google Photos images are **copied to R2**, not hotlinked. The baseUrl from Google is temporary (~60 min) so we must copy at import time.

---

## 3. Admin Integration Page

### Route

`/admin/integrations/google-photos` — new SvelteKit page

### Left nav addition

Add a new section in the admin sidebar below the Categories/Projects lists:

```
─── Integrations ───
  Google Photos        [connected] / [not connected]
```

This is a simple `<a>` link styled like the existing project links, with a status indicator dot (green = connected, gray = disconnected).

### Page states

**Disconnected state:**
- Heading: "Google Photos"
- Description text explaining what connecting does
- "Connect Google Photos" button → redirects to OAuth flow
- No albums/photos shown

**Connected state:**
- Heading: "Google Photos"
- Status: "Connected as [email if available] on [date]"
- "Disconnect" button (with confirmation) → calls `/disconnect` then refreshes
- Optional: preview of recent albums (not required for v1)

---

## 4. Add Artifact Card Transformation

### Current behavior

The "Add artifact" card in the project editor (`/admin/projects/[id]`) has:
- A schema selector dropdown (`image-v1`)
- A "+" icon
- "Add artifact" label
- Clicking opens the create artifact modal directly

### New behavior

Clicking the "Add artifact" card **transforms in-place** into a source picker. No modal yet — the card itself changes content.

**Step 1 — Source picker (replaces card content):**

The dashed card animates its content to show two options side by side:

```
┌─────────────────────────────────┐
│  ┌───────────┐  ┌───────────┐  │
│  │  📁       │  │  📷       │  │
│  │  Upload   │  │  Google   │  │
│  │  File     │  │  Photos   │  │
│  └───────────┘  └───────────┘  │
│              ← Back            │
└─────────────────────────────────┘
```

- **Upload File** — opens the existing create artifact modal (current behavior)
- **Google Photos** — opens the Google Photos picker modal (new)
- **Back** — returns to the original "Add artifact" card state
- If Google Photos is not connected, the Google Photos option shows as disabled with "Not connected" text and a link to the integration page

**Implementation:**

Add a `addArtifactStep` state variable to the project page:

```typescript
let addArtifactStep = $state<'idle' | 'pick-source'>('idle');
```

- `idle` → shows the current "Add artifact" card
- `pick-source` → shows the two source options

Clicking the card sets `addArtifactStep = 'pick-source'`.
Clicking "Upload File" sets `addArtifactStep = 'idle'` and opens `showCreateArtifactModal = true`.
Clicking "Google Photos" opens a new `showGooglePhotosPickerModal = true`.
Clicking "Back" returns to `addArtifactStep = 'idle'`.

The schema selector dropdown remains in both states (above the source options).

---

## 5. Google Photos Picker Modal

### Layout

Full-screen-ish modal (same pattern as existing modals: backdrop blur, centered white card).

```
┌──────────────────────────────────────────────────┐
│  Google Photos                              ✕    │
│──────────────────────────────────────────────────│
│  [All Photos]  [Album: Woodworking]  [Album: …]  │  ← album tabs/pills
│──────────────────────────────────────────────────│
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ img │ │ img │ │ img │ │ img │ │ img │       │  ← thumbnail grid
│  │  ☑  │ │     │ │  ☑  │ │     │ │     │       │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ img │ │ img │ │ img │ │ img │  Load more…   │
│  │     │ │     │ │     │ │     │               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│──────────────────────────────────────────────────│
│  2 selected                    [Import Selected] │
└──────────────────────────────────────────────────┘
```

### Behavior

1. **On open**: Fetch albums list (`/api/.../albums`) + initial media items (`/api/.../search` with no albumId for "All Photos")
2. **Album pills**: Click an album → fetch its media items. "All Photos" shows everything.
3. **Thumbnail grid**:
   - Show `baseUrl=w256-h256-c` (cropped thumbnail) for each media item
   - Click to toggle selection (checkbox overlay)
   - Infinite scroll or "Load more" button using `nextPageToken`
4. **Import button**:
   - Disabled when nothing selected
   - Shows count: "Import 3 photos"
   - On click: POST to `/api/.../import` with selected items
   - Shows progress (importing 1/3, 2/3, 3/3…)
   - On complete: close modal, refresh artifacts list, show success message
5. **Selection limit**: Cap at 20 items per import to avoid long-running requests

### Component

New component: `src/lib/components/GooglePhotosPickerModal.svelte`

Props:
```typescript
type Props = {
  projectId: number;
  artifactSchema: string;
  isPublished: boolean;
  onImported: (artifacts: ProjectArtifact[]) => void;
  onClose: () => void;
};
```

---

## 6. New Artifact Schema Consideration

Google Photos imports still use the existing `image-v1` schema. The `dataBlob` stores:

```json
{
  "imageUrl": "https://r2-url/artifacts/uuid.jpg",
  "description": "IMG_1234.jpg"
}
```

No new schema needed — the image is copied to R2 so it behaves identically to a file upload artifact. The source (upload vs. Google Photos) is not tracked in the artifact itself since the R2 copy is the canonical version.

If we later want to track provenance, we could add an optional `source` field to `image-v1` data:
```json
{
  "imageUrl": "...",
  "description": "...",
  "source": { "provider": "google-photos", "mediaItemId": "..." }
}
```
This is **not in scope for v1** but the schema validation would accept unknown extra fields gracefully.

---

## 7. File Structure

New files:

```
src/
├── lib/
│   ├── components/
│   │   └── GooglePhotosPickerModal.svelte        # Photo browser + selector modal
│   └── server/
│       └── integrations/
│           └── google-photos.ts                   # Token encrypt/decrypt, API helpers, refresh logic
├── routes/
│   ├── admin/
│   │   └── integrations/
│   │       └── google-photos/
│   │           └── +page.svelte                   # Integration management page
│   └── api/
│       └── integrations/
│           └── google-photos/
│               ├── connect/+server.ts             # OAuth redirect
│               ├── callback/+server.ts            # OAuth callback
│               ├── disconnect/+server.ts          # Revoke + delete
│               ├── status/+server.ts              # Connection status check
│               ├── albums/+server.ts              # List albums
│               ├── search/+server.ts              # List/search media items
│               └── import/+server.ts              # Import photos → R2 → artifacts
drizzle/
│   └── XXXX_add_integrations_table.sql            # Migration
```

Modified files:

```
src/lib/server/db/schema.ts                        # Add integrations table
src/routes/admin/+layout.svelte                    # Add Integrations nav section
src/routes/admin/projects/[id]/+page.svelte        # Transform add artifact card
wrangler.toml                                      # Add env vars (public ones only)
.env.template                                      # Add Google env vars
```

---

## 8. Security Considerations

- **Token encryption**: Access/refresh tokens stored AES-GCM encrypted in D1. Encryption key is a Cloudflare secret, never in source.
- **Auth gating**: All `/api/integrations/*` routes require Clerk auth (same pattern as existing admin endpoints).
- **Token refresh**: Access tokens expire after ~1 hour. The server-side helpers auto-refresh using the refresh token before making Google API calls. If refresh fails (revoked), mark integration as disconnected.
- **R2 copy**: Images are copied to R2 at import time. No dependency on Google after import — if user disconnects Google Photos, existing artifacts are unaffected.
- **CORS**: Google Photos API calls happen server-side only. No client-side Google API access needed.
- **Scope**: Request `photoslibrary.readonly` only — no write access to user's Google Photos.

---

## 9. Implementation Order

1. **DB migration** — Add `integrations` table
2. **Server helpers** — Token encryption, Google API client, refresh logic (`src/lib/server/integrations/google-photos.ts`)
3. **OAuth routes** — `/connect`, `/callback`, `/disconnect`, `/status`
4. **Admin integration page** — `/admin/integrations/google-photos`
5. **Admin nav update** — Add "Integrations" section with Google Photos link
6. **Browse routes** — `/albums`, `/search`
7. **Import route** — `/import` (fetch from Google → upload to R2 → create artifact)
8. **Google Photos picker modal** — `GooglePhotosPickerModal.svelte`
9. **Add artifact card transformation** — Source picker step in project editor
10. **Testing & polish** — Error states, loading states, edge cases

---

## 10. Open Questions

1. **Google Cloud project**: Do you already have a Google Cloud project with Photos Library API enabled, or do we need to set that up?
2. **Batch import size**: Capped at 20 per import — is that reasonable, or do you want more/fewer?
3. **Album creation**: Should we support creating albums in Google Photos from the admin, or is read-only browsing sufficient?
4. **Video support**: Google Photos also stores videos. Should we filter to images only, or allow video items too?
5. **Metadata preservation**: Should we pull EXIF/Google Photos metadata (date taken, camera, etc.) into the artifact description or a future attribute?
