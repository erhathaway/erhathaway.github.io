# Google Photos Integration — Spec

## Overview

Add the ability to import images and videos from Google Photos as project artifacts using the **Google Photos Picker API**. The Picker API provides a Google-hosted selection UI — users pick photos/videos in a Google popup, and our app receives the selected items.

This involves:

1. **Google Cloud project setup** — Enable Picker API, create OAuth credentials
2. **OAuth + session management** — Connect Google account, manage picker sessions
3. **Admin integration page** — Connect/disconnect, view status
4. **Add artifact flow** — Transform "Add artifact" card into a source picker (file upload vs. Google Photos)
5. **Picker session flow** — Open Google's picker in a popup, poll for completion, import selected items
6. **Metadata storage** — Capture camera/EXIF metadata in a secure, admin-only table

---

## 1. Google Cloud Project Setup

### Step-by-step instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one):
   - Click the project dropdown → "New Project"
   - Name: `erhathaway-portfolio` (or whatever you prefer)
   - Click "Create"
3. **Enable the Photos Picker API** (not the Library API):
   - Go to **APIs & Services → Library**
   - Search for "Photos Picker API"
   - Click it → click **Enable**
4. Configure the OAuth consent screen:
   - Go to **APIs & Services → OAuth consent screen**
   - Choose **External** user type
   - Fill in:
     - App name: `Ethan Hathaway Portfolio`
     - User support email: your email
     - Developer contact email: your email
   - Scopes: add `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`
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
     GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key
     ```
   - Production: Use Cloudflare secrets:
     ```bash
     bunx wrangler secret put GOOGLE_CLIENT_SECRET
     bunx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY
     ```
     Generate the encryption key:
     ```bash
     openssl rand -hex 32
     ```

**Note:** While the app is in "Testing" status, only added test users can authorize. This is fine for a single-user admin system.

---

## 2. How the Picker API Works

The Picker API is fundamentally different from the old Library API. Instead of building our own album browser, Google provides the entire selection UI. The flow:

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Our Admin UI   │     │   Google Photos      │     │   Our Server     │
│                  │     │   Picker (popup)     │     │                  │
│ 1. Click         │     │                     │     │                  │
│    "Google       │────▶│                     │     │                  │
│     Photos"      │     │                     │     │ 2. POST          │
│                  │     │                     │◀────│    sessions      │
│                  │     │                     │     │    .create()     │
│                  │     │ 3. User browses     │     │                  │
│                  │     │    and selects       │     │                  │
│                  │     │    photos/videos     │     │                  │
│                  │     │                     │     │                  │
│                  │     │ 4. User clicks      │     │                  │
│ 5. Popup closes  │◀────│    "Done"           │     │                  │
│    (autoclose)   │     │                     │     │                  │
│                  │     └─────────────────────┘     │                  │
│ 6. Poll session  │────────────────────────────────▶│ 7. GET           │
│    status        │                                 │    sessions      │
│                  │◀────────────────────────────────│    .get()        │
│                  │     mediaItemsSet: true          │                  │
│                  │                                 │                  │
│ 8. Fetch items   │────────────────────────────────▶│ 9. GET           │
│                  │                                 │    mediaItems    │
│                  │◀────────────────────────────────│    .list()       │
│                  │     [items with baseUrls]        │                  │
│                  │                                 │                  │
│ 10. Import       │────────────────────────────────▶│ 11. For each:    │
│                  │                                 │   fetch baseUrl  │
│                  │                                 │   strip EXIF     │
│                  │                                 │   upload to R2   │
│                  │                                 │   create artifact│
│                  │◀────────────────────────────────│   store metadata │
│ 12. Done!        │                                 │                  │
└──────────────────┘                                 └──────────────────┘
```

### Key differences from Library API

- **No album browsing in our UI** — Google's picker handles all browsing, search, and selection
- **Session-based** — each picking interaction creates a short-lived session
- **Scope**: `photospicker.mediaitems.readonly` (not `photoslibrary.readonly`)
- **baseUrl requires auth** — unlike the old API, Picker API baseUrls require an `Authorization: Bearer` header to download
- **baseUrl expires in 60 minutes** — must copy to R2 promptly after selection
- **Max 2000 items per session** — configurable via `maxItemCount` in session creation
- **Popup, not iframe** — the pickerUri cannot be opened in an iframe, must be a popup/new tab

### Picker API endpoints (Google-hosted)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://photospicker.googleapis.com/v1/sessions` | `POST` | Create a picker session, returns `pickerUri` |
| `https://photospicker.googleapis.com/v1/sessions/{id}` | `GET` | Poll session status, check `mediaItemsSet` |
| `https://photospicker.googleapis.com/v1/sessions/{id}` | `DELETE` | Clean up session after import |
| `https://photospicker.googleapis.com/v1/mediaItems?sessionId={id}` | `GET` | List selected items (paginated, max 100/page) |

All require `Authorization: Bearer {access_token}` with scope `photospicker.mediaitems.readonly`.

---

## 3. OAuth Setup

### Scope

```
https://www.googleapis.com/auth/photospicker.mediaitems.readonly
```

### Flow

1. Admin clicks "Connect Google Photos" on the integration page
2. Server redirects to Google's OAuth consent screen with the picker scope
3. Google redirects back with an authorization code
4. Server exchanges code for access + refresh tokens
5. Tokens are stored in D1 (AES-GCM encrypted)
6. Access tokens are refreshed automatically when expired (~1 hour lifetime)

### Environment variables

```
GOOGLE_CLIENT_ID=...                  # Public, can go in wrangler.toml [vars]
GOOGLE_CLIENT_SECRET=...              # Cloudflare secret
GOOGLE_TOKEN_ENCRYPTION_KEY=...       # Cloudflare secret, 32-byte hex for AES-GCM
```

The redirect URI is derived at runtime from the request origin:
- Local dev: `http://localhost:8787/api/integrations/google-photos/callback`
- Production: `https://erhathaway.com/api/integrations/google-photos/callback`

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

Only one row per provider — this is a single-user admin system.

---

## 4. Metadata Storage (Secure, Admin-Only)

### Design principle

Metadata from Google Photos (camera info, date taken, GPS coordinates, etc.) is stored in a **separate table** linked to artifacts. This data is:
- **Never included in public API responses** — public artifact endpoints must not join or return metadata
- **Only accessible via authenticated admin endpoints** — a dedicated route returns it for the admin UI
- **Stripped from imported media files** — EXIF data is stripped from image bytes before R2 upload. Raw metadata is preserved only in the DB table.

### New table: `artifact_metadata`

```sql
CREATE TABLE artifact_metadata (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id INTEGER NOT NULL UNIQUE REFERENCES project_artifacts(id) ON DELETE CASCADE,
  metadata    TEXT NOT NULL,  -- JSON blob
  source      TEXT NOT NULL,  -- 'google-photos' | 'exif-upload'
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
  // From Google Photos Picker API mediaItem.mediaFile.mediaFileMetadata
  cameraMake?: string;
  cameraModel?: string;
  width?: number;
  height?: number;

  // Photo-specific (from mediaFileMetadata.photoMetadata)
  focalLength?: number;
  apertureFNumber?: number;
  isoEquivalent?: number;
  exposureTime?: string;          // Duration string, e.g. "0.004s"

  // Video-specific (from mediaFileMetadata.videoMetadata)
  fps?: number;
  processingStatus?: string;      // 'READY' | 'PROCESSING' | 'FAILED'

  // From mediaItem fields
  dateTaken?: string;             // ISO 8601, from createTime

  // Provenance
  googlePhotosMediaItemId?: string;
  originalFilename?: string;
};
```

**Note:** The Picker API does not return GPS/location data. If GPS is embedded in EXIF within the file bytes, we strip it during EXIF removal and do **not** store it.

### EXIF stripping

When importing images:
1. Fetch image bytes from Google (using baseUrl + auth header)
2. Strip EXIF APP1 segments from JPEG files before R2 upload
3. Strip metadata chunks from PNG/WebP as applicable
4. Upload cleaned bytes to R2

For videos: EXIF stripping is not practical. Video files from Google Photos downloads don't typically carry EXIF GPS data in the same way, and the metadata we care about comes from the API response, not the file bytes.

### API access control

**Public artifact endpoints** (no auth):
- Must **never** join with `artifact_metadata`
- Return only `{ id, schema, dataBlob, isPublished, isCover }` — same as today

**Admin metadata endpoint** (auth required):
- `GET /api/projects/[id]/artifacts/[artifactId]/metadata` → `{ metadata, source, createdAt }` or 404
- Used by admin artifact edit modal to show metadata

### Admin UI for metadata

In the artifact edit modal, add a collapsible "Metadata" section (only shown when metadata exists):

```
▸ Metadata
  Camera: Canon EOS R5
  Settings: 85mm · f/2.8 · 1/250s · ISO 400
  Date taken: Jan 15, 2025, 3:42 PM
  Dimensions: 8192 × 5464
  Source: Google Photos
```

Read-only display. No editing.

---

## 5. API Routes (Our Server)

### OAuth flow

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/connect` | `GET` | Build OAuth URL, redirect to Google |
| `/api/integrations/google-photos/callback` | `GET` | Handle OAuth callback, exchange code for tokens, store, redirect to admin integration page |
| `/api/integrations/google-photos/disconnect` | `POST` | Revoke token, delete from `integrations` |
| `/api/integrations/google-photos/status` | `GET` | Return `{ connected: boolean, connectedAt?: string }` |

### Picker session management

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/sessions` | `POST` | Create a picker session. Calls Google's `sessions.create`, returns `{ sessionId, pickerUri }` |
| `/api/integrations/google-photos/sessions/[sessionId]` | `GET` | Poll session. Calls Google's `sessions.get`, returns `{ mediaItemsSet, pollingConfig }` |
| `/api/integrations/google-photos/sessions/[sessionId]` | `DELETE` | Clean up session. Calls Google's `sessions.delete` |
| `/api/integrations/google-photos/sessions/[sessionId]/items` | `GET` | List selected items. Calls Google's `mediaItems.list`, returns paginated items |

### Import

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/integrations/google-photos/import` | `POST` | Import selected media → R2 → artifacts + metadata |

**Import request body:**
```typescript
{
  projectId: number;
  sessionId: string;            // Used to list items and download via baseUrl
  isPublished?: boolean;        // Default false
}
```

**Import flow (server-side):**
1. List all selected media items from the session (paginate through all pages)
2. For each item:
   a. Determine type: `PHOTO` → `image-v1` schema, `VIDEO` → `video-v1` schema
   b. For videos: check `processingStatus === 'READY'`, skip if not
   c. Download content:
      - Photos: `GET {baseUrl}=d` (original with EXIF — we'll strip EXIF ourselves)
      - Videos: `GET {baseUrl}=dv` (high-quality transcode)
      - Both require `Authorization: Bearer {access_token}` header
   d. For photos: strip EXIF from bytes
   e. Upload cleaned bytes to R2 (`artifacts/{uuid}.{ext}`)
   f. For videos: also fetch thumbnail (`GET {baseUrl}=w512-h512-no`) and upload to R2
   g. Create `projectArtifacts` row with appropriate schema + dataBlob
   h. Create `artifact_metadata` row with camera/photo/video metadata
3. Delete the picker session (cleanup)
4. Return created artifacts array

**Batch size**: The Picker API allows up to 2000 items per session. Our import processes items sequentially to stay within Worker memory limits. For very large selections, we process all items but may take longer. The client shows progress.

### Metadata

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects/[id]/artifacts/[artifactId]/metadata` | `GET` | Return metadata (admin auth required) |

---

## 6. Video Artifact Schema

New schema: `video-v1`

### Data shape

```typescript
type VideoV1Data = {
  videoUrl: string;            // Required: R2 URL to video file
  thumbnailUrl?: string;       // Optional: R2 URL to thumbnail image
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
- Video file upload (drag-and-drop)
- Video preview (`<video>` element)
- Optional thumbnail upload
- Description textarea

### Video admin list component

New file: `src/lib/schemas/artifacts/video-v1/AdminList.svelte`
- Video thumbnail (or generic video icon)
- Duration badge
- Schema tag: `video-v1`

---

## 7. Admin Integration Page

### Route

`/admin/integrations/google-photos`

### Left nav addition

New section in the admin sidebar below Categories/Projects:

```
─── Integrations ───
  Google Photos        ● / ○
```

A link styled like the existing project links, with a status indicator dot (green = connected, gray = disconnected). Status is fetched on layout mount via `/api/.../status`.

### Page states

**Disconnected state:**
- Heading: "Google Photos"
- Description: "Connect your Google Photos account to import images and videos directly into your projects."
- "Connect Google Photos" button → redirects to OAuth flow
- Note: "Read-only access. We can only view photos you explicitly share through the picker."

**Connected state:**
- Heading: "Google Photos"
- Status: "Connected on [date]"
- "Disconnect" button (with confirmation) → calls `/disconnect`, refreshes
- Info: "Imported media is copied to your storage. Disconnecting will not affect existing artifacts."

---

## 8. Add Artifact Card Transformation

### Current behavior

The "Add artifact" card has:
- A schema selector dropdown
- A "+" icon and "Add artifact" label
- Clicking opens the create artifact modal

### New behavior

Clicking the "Add artifact" card **transforms in-place** into a source picker.

**Source picker (replaces card content):**

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

- **Upload File** → opens existing create artifact modal (current behavior)
- **Google Photos** → starts picker session flow (new)
- **Back** → returns to original card state
- If Google Photos is not connected, the option is disabled with "Not connected" and a link to `/admin/integrations/google-photos`

**Implementation:**

```typescript
let addArtifactStep = $state<'idle' | 'pick-source'>('idle');
let googlePhotosConnected = $state(false);  // Fetched on mount via /status
```

- `idle` → original "Add artifact" card
- `pick-source` → two source option buttons

Schema selector moves to the create artifact modal (not shown in source picker) since Google Photos import auto-detects schema from media type.

---

## 9. Picker Session Flow (The Core UX)

When the user clicks "Google Photos" in the source picker:

### Step 1: Create session
Client calls `POST /api/.../sessions` → server creates a Google Picker session, returns `{ sessionId, pickerUri }`.

### Step 2: Open popup
Client opens `pickerUri + '/autoclose'` in a popup window (`window.open`). The `/autoclose` suffix tells Google to auto-close the popup when the user finishes selecting.

```typescript
const popup = window.open(
  pickerUri + '/autoclose',
  'google-photos-picker',
  'width=1200,height=800,popup=yes'
);
```

### Step 3: Show "waiting" state
While the popup is open, the project page shows a modal/overlay:

```
┌──────────────────────────────────────────┐
│  Picking from Google Photos...           │
│                                          │
│  Select photos and videos in the         │
│  Google Photos window, then click Done.  │
│                                          │
│  [Cancel]                                │
└──────────────────────────────────────────┘
```

### Step 4: Poll session
Client polls `GET /api/.../sessions/{sessionId}` using the `pollingConfig` intervals returned by Google (typically every few seconds). Polling continues until:
- `mediaItemsSet === true` → user finished selecting
- Timeout reached (from `pollingConfig.timeoutIn`) → show error
- Popup closed without completing → detect via `popup.closed` interval check, show cancel message

### Step 5: Fetch selected items
Once `mediaItemsSet` is true, client calls `GET /api/.../sessions/{sessionId}/items` to get the list of selected media. Display a confirmation:

```
┌──────────────────────────────────────────┐
│  Import from Google Photos               │
│                                          │
│  12 photos and 3 videos selected         │
│                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │thumb│ │thumb│ │ ▶   │ │thumb│  ...   │  ← preview strip (thumbnails)
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│                                          │
│  [Cancel]              [Import 15 items] │
└──────────────────────────────────────────┘
```

Thumbnails are loaded via our server proxy: `GET /api/.../sessions/{sessionId}/items` returns items with their baseUrls, and we proxy thumbnail requests through our server (since baseUrls require the OAuth token in an auth header).

### Step 6: Import
User clicks "Import" → client calls `POST /api/.../import` with `{ projectId, sessionId }`. The server handles everything (list items, download, strip EXIF, upload to R2, create artifacts + metadata).

Progress modal:

```
┌──────────────────────────────────────────┐
│  Importing from Google Photos            │
│                                          │
│  ████████████░░░░░░░░  8 / 15            │
│                                          │
│  Importing DSC_4521.jpg...               │
└──────────────────────────────────────────┘
```

Since the import is a single POST that processes all items server-side, we can't show per-item progress via HTTP (Workers don't support streaming responses well). Two options:

**Option A — Simple (recommended for v1):** Single POST, show a spinner with "Importing N items..." and wait for the response. Display total time on completion.

**Option B — Granular progress (future):** Break into individual per-item requests from the client side, showing true per-item progress. More complex but better UX for large imports.

### Step 7: Done
On success: close modal, refresh artifacts list, show success toast. Server deletes the picker session.

On partial failure: show which items failed (e.g., video still processing), offer to retry failed items.

---

## 10. File Structure

### New files

```
src/
├── lib/
│   ├── components/
│   │   ├── GooglePhotosPickerModal.svelte            # Waiting → preview → importing states
│   │   └── GooglePhotosConfirmModal.svelte           # Shows selected items, confirm import
│   ├── schemas/
│   │   └── artifacts/
│   │       └── video-v1/
│   │           ├── validator.ts                       # VideoV1Data type + validation
│   │           ├── Editor.svelte                      # Video upload/edit component
│   │           └── AdminList.svelte                   # Video artifact card
│   └── server/
│       └── integrations/
│           ├── google-photos.ts                       # Token encrypt/decrypt, Google API client, refresh
│           └── exif-strip.ts                          # EXIF removal for JPEG/PNG/WebP
├── routes/
│   ├── admin/
│   │   └── integrations/
│   │       └── google-photos/
│   │           └── +page.svelte                       # Integration management page
│   └── api/
│       ├── integrations/
│       │   └── google-photos/
│       │       ├── connect/+server.ts                 # OAuth redirect
│       │       ├── callback/+server.ts                # OAuth callback
│       │       ├── disconnect/+server.ts              # Revoke + delete tokens
│       │       ├── status/+server.ts                  # Connection status
│       │       ├── sessions/+server.ts                # POST: create picker session
│       │       ├── sessions/[sessionId]/+server.ts    # GET: poll session, DELETE: cleanup
│       │       ├── sessions/[sessionId]/items/+server.ts  # GET: list picked items
│       │       └── import/+server.ts                  # POST: import → R2 → artifacts
│       └── projects/
│           └── [id]/
│               └── artifacts/
│                   └── [artifactId]/
│                       └── metadata/+server.ts        # GET metadata (admin only)
drizzle/
    ├── XXXX_add_integrations_table.sql
    └── XXXX_add_artifact_metadata_table.sql
```

### Modified files

```
src/lib/server/db/schema.ts                            # Add integrations + artifactMetadata tables
src/lib/schemas/artifacts/index.ts                      # Register video-v1 schema
src/routes/admin/+layout.svelte                        # Add Integrations nav section + status fetch
src/routes/admin/projects/[id]/+page.svelte            # Source picker card + picker modal + metadata display
wrangler.toml                                          # Add GOOGLE_CLIENT_ID to [vars]
.env.template                                          # Add Google env vars
```

---

## 11. Security Considerations

- **Token encryption**: Access/refresh tokens stored AES-GCM encrypted in D1. Encryption key is a Cloudflare secret, never in source.
- **Auth gating**: All `/api/integrations/*` routes require Clerk auth.
- **Token refresh**: Access tokens expire ~1 hour. Server auto-refreshes via refresh token. If refresh fails, mark integration as disconnected.
- **R2 copy**: Media copied to R2 at import time. No Google dependency after import.
- **EXIF stripping**: Image EXIF removed before R2 upload. Metadata stored in separate `artifact_metadata` table, only accessible to authenticated admins.
- **Metadata isolation**: Public `GET /api/projects/[id]/artifacts` never touches `artifact_metadata`. Separate auth-gated endpoint. This is a **hard security boundary**.
- **No GPS exposure**: Picker API doesn't return GPS data. Any GPS in EXIF file bytes is stripped and discarded (not stored).
- **baseUrl auth**: Picker API baseUrls require OAuth bearer token — all downloads happen server-side, tokens never sent to client.
- **CORS**: All Google API calls are server-side. No client-side Google API access.
- **Scope**: `photospicker.mediaitems.readonly` — minimal read-only access, only to items the user explicitly selects.
- **Session cleanup**: Picker sessions are deleted after import. Google recommends proactive cleanup to stay within rate limits.
- **Video file size**: Large videos may approach Worker memory limits. Import should use streaming uploads to R2 where possible, and skip items that exceed limits with a clear error.

---

## 12. Implementation Order

1. **Google Cloud setup** — Create project, enable Picker API, get credentials (manual, see Section 1)
2. **DB migrations** — Add `integrations` and `artifact_metadata` tables
3. **Server helpers** — Token encryption, Google Picker API client, token refresh, EXIF stripping (`src/lib/server/integrations/`)
4. **OAuth routes** — `/connect`, `/callback`, `/disconnect`, `/status`
5. **Admin integration page** — `/admin/integrations/google-photos`
6. **Admin nav update** — Add "Integrations" section with Google Photos link + status dot
7. **Video schema** — `video-v1` validator, editor, admin list components + register in schema index
8. **Picker session routes** — `/sessions` (create), `/sessions/[id]` (poll/delete), `/sessions/[id]/items` (list)
9. **Import route** — `/import` (list items → download → strip EXIF → upload R2 → create artifacts + metadata)
10. **Metadata endpoint** — `GET /api/projects/[id]/artifacts/[artifactId]/metadata`
11. **Picker modal component** — `GooglePhotosPickerModal.svelte` (waiting → confirm → importing states)
12. **Add artifact card transformation** — Source picker in project editor + status check
13. **Metadata display in admin** — Collapsible section in artifact edit modal
14. **Testing & polish** — Error states, popup blocked handling, timeout handling, video processing states
