# Google Photos Integration — Spec

## Overview

Add the ability to import images and videos from Google Photos as project artifacts. This involves:

1. **Google Cloud project setup** — Enable Photos Library API, create OAuth credentials
2. **Admin integration page** — Connect/disconnect Google Photos, view connection status
3. **Add artifact flow** — Transform the "Add artifact" card into a source picker (file upload vs. Google Photos)
4. **Google Photos picker** — Browse albums/media and import selected items as artifacts
5. **Metadata storage** — Capture EXIF/Google metadata in a secure, admin-only table separate from public artifact data

---

## 1. Google Cloud Project Setup

### Step-by-step instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one):
   - Click the project dropdown in the top bar → "New Project"
   - Name: `erhathaway-portfolio` (or whatever you prefer)
   - Click "Create"
3. Enable the Photos Library API:
   - Go to **APIs & Services → Library**
   - Search for "Photos Library API"
   - Click it → click **Enable**
4. Configure the OAuth consent screen:
   - Go to **APIs & Services → OAuth consent screen**
   - Choose **External** user type (required for personal Google accounts)
   - Fill in:
     - App name: `Ethan Hathaway Portfolio`
     - User support email: your email
     - Developer contact email: your email
   - Scopes: add `https://www.googleapis.com/auth/photoslibrary.readonly`
   - Test users: add your Google account email (required while app is in "Testing" status)
   - Click through to save
5. Create OAuth credentials:
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Portfolio Admin`
   - Authorized redirect URIs: add both:
     - `http://localhost:8787/api/integrations/google-photos/callback` (local dev)
     - `https://erhathaway.com/api/integrations/google-photos/callback` (production)
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**
6. Store the secrets:
   - Local dev: Add to `.env`:
     ```
     GOOGLE_CLIENT_ID=your-client-id
     GOOGLE_CLIENT_SECRET=your-client-secret
     ```
   - Production: Use Cloudflare secrets:
     ```bash
     bunx wrangler secret put GOOGLE_CLIENT_SECRET
     bunx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY
     ```
     For the encryption key, generate a random 32-byte hex string:
     ```bash
     openssl rand -hex 32
     ```

**Note:** While the app is in "Testing" status on Google Cloud, only the test users you added can authorize. This is fine for a single-user admin system. If you ever want to remove the "unverified app" warning, you'd need to submit for Google verification, but that's unnecessary here.

---

## 2. Google OAuth Setup

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

## 3. Metadata Storage (Secure, Admin-Only)

### Design principle

Metadata from Google Photos (EXIF data, camera info, date taken, GPS coordinates, etc.) is stored in a **separate table** linked to artifacts. This data is:
- **Never included in public API responses** — the public artifact endpoints (`GET /api/projects/[id]/artifacts` without auth) must not join or return metadata
- **Only accessible via authenticated admin endpoints** — a dedicated metadata route returns it for the admin UI
- **Stripped from imported media files** — when copying images/videos to R2, EXIF data is stripped from the file bytes before upload. The raw metadata is preserved only in the DB table.

### New table: `artifact_metadata`

```sql
CREATE TABLE artifact_metadata (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id INTEGER NOT NULL UNIQUE REFERENCES project_artifacts(id) ON DELETE CASCADE,
  metadata    TEXT NOT NULL,  -- JSON blob: { cameraMake, cameraModel, focalLength, aperture, iso, exposureTime, dateTaken, width, height, gpsLatitude, gpsLongitude, ... }
  source      TEXT NOT NULL,  -- 'google-photos' | 'exif-upload' (provenance)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Drizzle schema:

```typescript
export const artifactMetadata = sqliteTable('artifact_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  artifactId: integer('artifact_id')
    .notNull()
    .unique()
    .references(() => projectArtifacts.id, { onDelete: 'cascade' }),
  metadata: text('metadata', { mode: 'json' }).notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
});
```

### Metadata shape

```typescript
type ArtifactMetadataBlob = {
  // From Google Photos mediaItem.mediaMetadata
  cameraMake?: string;
  cameraModel?: string;
  focalLength?: number;
  apertureFNumber?: number;
  isoEquivalent?: number;
  exposureTime?: string;
  dateTaken?: string;          // ISO 8601
  width?: number;
  height?: number;

  // Video-specific
  fps?: number;
  duration?: string;           // e.g. "12.5s"

  // Location (if available)
  gpsLatitude?: number;
  gpsLongitude?: number;

  // Provenance
  googlePhotosMediaItemId?: string;
  originalFilename?: string;
};
```

### EXIF stripping

When importing images from Google Photos (or in future from file upload):
1. Fetch image/video bytes from Google
2. For images: strip EXIF before uploading to R2 (use a lightweight EXIF removal — rewrite JPEG/PNG headers without EXIF segments)
3. For videos: EXIF stripping is not practical for video files, but Google Photos base URLs for video downloads don't embed EXIF in the same way. GPS metadata from Google Photos API is captured in the DB and the video file itself is the download URL output which typically doesn't carry EXIF.
4. Upload the cleaned bytes to R2
5. Store the extracted metadata in `artifact_metadata`

For EXIF stripping on images, we'll implement a minimal server-side function that removes EXIF APP1 segments from JPEG files (the most common format). For PNG/WebP, EXIF is less common but we'll strip known metadata chunks as well.

### API access control

**Public artifact endpoints** (`GET /api/projects/[id]/artifacts` without auth):
- Must **never** join with `artifact_metadata`
- Return only `{ id, schema, dataBlob, isPublished, isCover }` — same as today

**Admin metadata endpoint** (new, auth required):
- `GET /api/projects/[id]/artifacts/[artifactId]/metadata` → returns `{ metadata, source, createdAt }` or 404 if none
- Only callable with valid Clerk auth token
- Used by the admin artifact edit modal to show metadata below the image

### Admin UI for metadata

In the existing artifact edit modal, add a collapsible "Metadata" section at the bottom (only shown if metadata exists for that artifact):

```
▸ Metadata
  Camera: Canon EOS R5
  Lens: 85mm f/1.4
  Settings: f/2.8 · 1/250s · ISO 400
  Date taken: Jan 15, 2025, 3:42 PM
  Dimensions: 8192 × 5464
  Source: Google Photos
```

Read-only display. No editing.

---

## 4. API Routes

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
| `/api/integrations/google-photos/search` | `POST` | Search/list media items. Body: `{ albumId?, pageToken?, pageSize?, mediaType? }`. Returns `{ mediaItems: [...], nextPageToken? }`. `mediaType` filter: `ALL_MEDIA` (default), `PHOTO`, `VIDEO` |

### Import

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/import` | `POST` | Import selected media as artifact(s). Body below. |

**Import request body:**
```typescript
{
  projectId: number;
  items: Array<{
    mediaItemId: string;
    baseUrl: string;
    filename: string;
    mimeType: string;
    mediaMetadata: {          // From Google Photos API response
      width?: string;
      height?: string;
      creationTime?: string;
      photo?: { cameraMake, cameraModel, focalLength, apertureFNumber, isoEquivalent, exposureTime };
      video?: { fps, status, cameraMake, cameraModel };
    };
  }>;
  isPublished?: boolean;      // Default false
}
```

**Import flow detail:**
1. For each selected media item:
   a. Determine if photo or video based on `mimeType`
   b. Fetch full-resolution content:
      - Photos: `baseUrl=d` (download original) or `baseUrl=w{maxWidth}-h{maxHeight}`
      - Videos: `baseUrl=dv` (download video)
   c. For photos: strip EXIF from image bytes
   d. Upload cleaned bytes to R2 (`artifacts/{uuid}.{ext}`)
   e. Create `projectArtifacts` row:
      - Photos: schema `image-v1`, dataBlob `{ imageUrl, description }`
      - Videos: schema `video-v1`, dataBlob `{ videoUrl, thumbnailUrl?, description }`
   f. Create `artifact_metadata` row with extracted Google metadata
2. Return the created artifact(s)

This means Google Photos media is **copied to R2**, not hotlinked. The baseUrl from Google is temporary (~60 min) so we must copy at import time.

**Batch size**: Up to **100 items** per import request. The import processes items sequentially server-side to avoid memory pressure on the Cloudflare Worker. Progress is reported to the client via the response after all items complete (not streamed). For very large imports, the client can batch into multiple 100-item requests.

---

## 5. Video Artifact Schema

New schema: `video-v1`

### Data shape

```typescript
type VideoV1Data = {
  videoUrl: string;            // Required: R2 URL to video file
  thumbnailUrl?: string;       // Optional: R2 URL to thumbnail image (extracted or from Google)
  description?: string;        // Optional: caption/description
};
```

### Schema definition

New file: `src/lib/schemas/artifacts/video-v1/validator.ts`

```typescript
export const videoV1Schema = {
  name: 'video-v1' as const,
  label: 'Video',
  description: 'A video file with optional thumbnail and description'
};

export function validateVideoV1(payload: unknown): VideoV1ValidationResult {
  // Validate videoUrl is non-empty string
  // Validate thumbnailUrl is optional string
  // Validate description is optional string
}
```

Register in `src/lib/schemas/artifacts/index.ts`:
```typescript
export const artifactSchemas = [imageV1Definition, videoV1Definition] as const;
```

### Video editor component

New file: `src/lib/schemas/artifacts/video-v1/Editor.svelte`

Similar to the image editor but with:
- Video file upload (drag-and-drop)
- Video preview player (HTML `<video>` element)
- Optional thumbnail upload
- Description textarea

### Video admin list component

New file: `src/lib/schemas/artifacts/video-v1/AdminList.svelte`

Artifact card in the project editor showing:
- Video thumbnail (or generic video icon if no thumbnail)
- Duration badge
- Schema tag: `video-v1`

### Public gallery rendering

On the public-facing gallery, video artifacts render as:
- Thumbnail with a play icon overlay
- Click to play inline or in a lightbox (implementation detail for later)

---

## 6. Admin Integration Page

### Route

`/admin/integrations/google-photos` — new SvelteKit page

### Left nav addition

Add a new section in the admin sidebar below the Categories/Projects lists:

```
─── Integrations ───
  Google Photos        ● / ○
```

This is a simple `<a>` link styled like the existing project links, with a status indicator dot (green = connected, gray = disconnected).

### Page states

**Disconnected state:**
- Heading: "Google Photos"
- Description: "Connect your Google Photos account to import images and videos directly into your projects."
- "Connect Google Photos" button → redirects to OAuth flow
- Note about what permissions are requested (read-only access)

**Connected state:**
- Heading: "Google Photos"
- Status: "Connected on [date]"
- "Disconnect" button (with confirmation) → calls `/disconnect` then refreshes
- Info: "Images and videos imported from Google Photos are copied to your storage. Disconnecting will not affect existing artifacts."

---

## 7. Add Artifact Card Transformation

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
│  │  ↑        │  │  ◩        │  │
│  │  Upload   │  │  Google   │  │
│  │  File     │  │  Photos   │  │
│  └───────────┘  └───────────┘  │
│              ← Back            │
└─────────────────────────────────┘
```

- **Upload File** — opens the existing create artifact modal (current behavior)
- **Google Photos** — opens the Google Photos picker modal (new)
- **Back** — returns to the original "Add artifact" card state
- If Google Photos is not connected, the Google Photos option shows as disabled with "Not connected" text and a small link to `/admin/integrations/google-photos`

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

The schema selector dropdown moves to the create artifact modal (not shown in source picker) since Google Photos import auto-detects schema based on media type.

---

## 8. Google Photos Picker Modal

### Layout

Full-screen-ish modal (same pattern as existing modals: backdrop blur, centered white card).

```
┌──────────────────────────────────────────────────┐
│  Import from Google Photos                  ✕    │
│──────────────────────────────────────────────────│
│  [All]  [Photos]  [Videos]                       │  ← media type filter
│  ─────────────────────────────────────────────── │
│  [All Photos]  [Woodworking]  [Baking]  [...]    │  ← album pills (scrollable)
│──────────────────────────────────────────────────│
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ img │ │ img │ │ 🎬  │ │ img │ │ img │       │  ← thumbnail grid
│  │  ☑  │ │     │ │  ☑  │ │     │ │     │       │     (videos show play icon)
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ img │ │ img │ │ img │ │ img │  Load more…   │
│  │     │ │     │ │     │ │     │               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│──────────────────────────────────────────────────│
│  3 selected                  [Import 3 items]    │
└──────────────────────────────────────────────────┘
```

### Behavior

1. **On open**: Fetch connection status → if not connected, show a message with link to integration page instead of the picker. If connected: fetch albums list + initial media items.
2. **Media type pills**: "All" (default), "Photos", "Videos" — filters the search request's `mediaType` param.
3. **Album pills**: Horizontally scrollable row. Click an album → fetch its media items. "All Photos" shows unfiltered.
4. **Thumbnail grid**:
   - Photos: `baseUrl=w256-h256-c` (cropped thumbnail)
   - Videos: `baseUrl=w256-h256-c` with a play icon overlay (Google Photos returns a video thumbnail at the baseUrl with image size params)
   - Click to toggle selection (checkmark overlay in top-right corner)
   - "Load more" button at bottom using `nextPageToken`
5. **Import button**:
   - Disabled when nothing selected
   - Shows count: "Import 3 items"
   - On click: POST to `/api/.../import` with selected items + their `mediaMetadata`
   - Shows progress: "Importing 2 of 5..." with a progress bar
   - On complete: close modal, refresh artifacts list, show success toast
   - On partial failure: show which items failed, allow retry
6. **Selection limit**: Up to **100 items** per import. Counter shows "42 / 100 selected". Disabled selection after cap reached.

### Component

New component: `src/lib/components/GooglePhotosPickerModal.svelte`

Props:
```typescript
type Props = {
  projectId: number;
  onImported: (artifacts: ProjectArtifact[]) => void;
  onClose: () => void;
};
```

(No `artifactSchema` prop — schema is auto-detected based on media type: `image-v1` for photos, `video-v1` for videos.)

---

## 9. File Structure

New files:

```
src/
├── lib/
│   ├── components/
│   │   └── GooglePhotosPickerModal.svelte          # Photo/video browser + selector modal
│   ├── schemas/
│   │   └── artifacts/
│   │       └── video-v1/
│   │           ├── validator.ts                     # VideoV1Data type + validation
│   │           ├── Editor.svelte                    # Video upload/edit component
│   │           └── AdminList.svelte                 # Video artifact card for project editor
│   └── server/
│       └── integrations/
│           ├── google-photos.ts                     # Token encrypt/decrypt, API client, refresh logic
│           └── exif-strip.ts                        # EXIF removal for JPEG/PNG/WebP
├── routes/
│   ├── admin/
│   │   └── integrations/
│   │       └── google-photos/
│   │           └── +page.svelte                     # Integration management page
│   └── api/
│       ├── integrations/
│       │   └── google-photos/
│       │       ├── connect/+server.ts               # OAuth redirect
│       │       ├── callback/+server.ts              # OAuth callback
│       │       ├── disconnect/+server.ts            # Revoke + delete
│       │       ├── status/+server.ts                # Connection status check
│       │       ├── albums/+server.ts                # List albums
│       │       ├── search/+server.ts                # List/search media items
│       │       └── import/+server.ts                # Import media → strip EXIF → R2 → artifacts + metadata
│       └── projects/
│           └── [id]/
│               └── artifacts/
│                   └── [artifactId]/
│                       └── metadata/+server.ts      # GET metadata (admin only)
drizzle/
│   ├── XXXX_add_integrations_table.sql              # Migration
│   └── XXXX_add_artifact_metadata_table.sql         # Migration
```

Modified files:

```
src/lib/server/db/schema.ts                          # Add integrations + artifactMetadata tables
src/lib/schemas/artifacts/index.ts                    # Register video-v1 schema
src/routes/admin/+layout.svelte                      # Add Integrations nav section
src/routes/admin/projects/[id]/+page.svelte          # Transform add artifact card + metadata in edit modal
wrangler.toml                                        # Add GOOGLE_CLIENT_ID var
.env.template                                        # Add Google env vars
```

---

## 10. Security Considerations

- **Token encryption**: Access/refresh tokens stored AES-GCM encrypted in D1. Encryption key is a Cloudflare secret, never in source.
- **Auth gating**: All `/api/integrations/*` routes require Clerk auth (same pattern as existing admin endpoints).
- **Token refresh**: Access tokens expire after ~1 hour. The server-side helpers auto-refresh using the refresh token before making Google API calls. If refresh fails (revoked), mark integration as disconnected.
- **R2 copy**: Media is copied to R2 at import time. No dependency on Google after import — if user disconnects Google Photos, existing artifacts are unaffected.
- **EXIF stripping**: Image files have EXIF data removed before R2 upload. Metadata is stored separately in the `artifact_metadata` table and only accessible to authenticated admin users.
- **Metadata isolation**: The public `GET /api/projects/[id]/artifacts` endpoint never joins with `artifact_metadata`. The metadata endpoint is a separate, auth-gated route. This is a **hard security boundary** — even if public endpoint code is refactored in the future, metadata lives in a separate table that must be explicitly queried.
- **GPS data**: Location data from Google Photos (if present) is stored in `artifact_metadata` only. Since the public-facing site never accesses this table, GPS coordinates are never exposed to visitors.
- **CORS**: Google Photos API calls happen server-side only. No client-side Google API access needed.
- **Scope**: Request `photoslibrary.readonly` only — no write access to user's Google Photos.
- **Video file size**: Cloudflare Workers have a response body size limit. For large videos, we may need to use streaming uploads to R2. The import endpoint should handle this gracefully and skip items that exceed size limits with a clear error message.

---

## 11. Implementation Order

1. **Google Cloud setup** — Create project, enable API, get credentials (manual, see Section 1)
2. **DB migrations** — Add `integrations` and `artifact_metadata` tables
3. **Video schema** — `video-v1` validator, editor, admin list components
4. **Server helpers** — Token encryption, Google API client, refresh logic, EXIF stripping (`src/lib/server/integrations/`)
5. **OAuth routes** — `/connect`, `/callback`, `/disconnect`, `/status`
6. **Admin integration page** — `/admin/integrations/google-photos`
7. **Admin nav update** — Add "Integrations" section with Google Photos link + status dot
8. **Browse routes** — `/albums`, `/search`
9. **Import route** — `/import` (fetch from Google → strip EXIF → upload to R2 → create artifact + metadata)
10. **Metadata endpoint** — `GET /api/projects/[id]/artifacts/[artifactId]/metadata`
11. **Google Photos picker modal** — `GooglePhotosPickerModal.svelte`
12. **Add artifact card transformation** — Source picker step in project editor
13. **Metadata display in admin** — Collapsible metadata section in artifact edit modal
14. **Testing & polish** — Error states, loading states, edge cases, video playback
