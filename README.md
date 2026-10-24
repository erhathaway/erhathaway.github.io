# Ethan Hathaway - Personal Portfolio

A personal portfolio site for Ethan Hathaway showcasing things I make — woodworking, baking, cooking, and other crafts.

## Stack

- SvelteKit (Svelte 5 runes)
- Tailwind CSS
- Cloudflare adapter for deployment
- Cloudflare D1 (SQLite) via Drizzle ORM
- Cloudflare R2 for artifact image uploads

## Development

```sh
bun install

# Local dev without platform bindings
bun run dev:vite

# Local dev with Cloudflare bindings (D1, assets, etc.)
bun run dev

# Remote dev with Cloudflare bindings (writes to remote D1/R2 preview bucket)
bun run dev:remote
```

## Environment Files

- `.env` (local dev): `DATABASE_URL`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `.env.local` (wrangler dev): local bindings; leave `PUBLIC_R2_BASE_URL` empty to use proxy URLs
- `.env.remote` (wrangler dev --remote): set `PUBLIC_R2_BASE_URL` to the preview bucket public URL
- `.env.test` (tests): same Clerk dev keys and `DATABASE_URL` as `.env`
- `.env.template`: copy for new environments; includes `E2E_BASE_URL` and `CLERK_TEST_TOKEN` for integration tests

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

## Build and Deploy

```sh
bun run build          # build for production (Vite)
bun run preview        # preview the build locally
bun run deploy         # build + deploy to Cloudflare Workers (runs vite build, then wrangler deploy)
```

Deployment target is Cloudflare Workers at `erhathaway.com`. The `wrangler.toml [build]` section runs `bun run build` automatically, so `bun run deploy` is the only command needed.

If you have pending database migrations, apply them before deploying:

```sh
bun run db:generate          # generate migration SQL from schema changes
bun run db:migrate:remote    # apply to production D1
bun run deploy               # deploy the Worker
```

## Integration Testing (API)

Run a local worker, then execute the API integration test. This requires a real Clerk session token.

```sh
bunx wrangler dev --port 8787
```

```sh
E2E_BASE_URL=http://localhost:8787 CLERK_TEST_TOKEN=... bunx playwright test e2e/categories.api.spec.ts
```

## Cloudflare Secrets

Secrets must be set via `wrangler secret put` — never in `wrangler.toml`.

```sh
bunx wrangler secret put CLERK_SECRET_KEY
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY
```

For local dev, add secrets to both `.env` and `.dev.vars`.

Example `.dev.vars`:

```
CLERK_SECRET_KEY=sk_test_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_TOKEN_ENCRYPTION_KEY=...
```

`GOOGLE_TOKEN_ENCRYPTION_KEY` is a self-generated key for encrypting Google OAuth tokens in D1. Generate one with:

```sh
openssl rand -base64 32
```

## Google Photos Integration

Imports photos and videos from Google Photos into projects via the [Picker API](https://developers.google.com/photos/picker/guides/get-started-picker).

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Photos Picker API** (APIs & Services > Library > search "Photos Picker API")
4. Go to **APIs & Services > Credentials** and create an **OAuth 2.0 Client ID** (type: Web application)
5. Add authorized redirect URIs:
   - Local: `http://localhost:8788/api/integrations/google-photos/callback`
   - Production: `https://erhathaway.com/api/integrations/google-photos/callback`
6. Set `GOOGLE_CLIENT_ID` in `wrangler.toml` `[vars]`
7. Set `GOOGLE_CLIENT_SECRET` and `GOOGLE_TOKEN_ENCRYPTION_KEY` as secrets (see above)

### Usage

1. Navigate to **Admin > Integrations > Google Photos** and click **Connect**
2. Authorize with your Google account
3. In any project editor, click **Add Artifact** > **Google Photos**
4. Select photos/videos in the picker, then confirm the import

## Image Optimization

Images are optimized with a two-layer strategy:

### Format optimization (build-time)

On upload, images are converted to AVIF and WebP via Cloudflare Image Resizing and stored in R2. Artifacts track available formats in `imageFormats` (e.g. `['avif', 'webp']`), rendered as `<picture>` elements with a `<source>` per format.

### Dimension optimization (runtime)

When `PUBLIC_CF_IMAGE_RESIZING=true` is set (production only), images are served at 400w, 800w, and 1200w via Cloudflare Image Resizing (`/cdn-cgi/image/` URLs) in `srcset` attributes. The browser picks the best size based on `sizes`.

**Important:** AVIF cannot be used as an Image Resizing source (HTTP 415, error 9520). All resizing requests use the WebP variant as input, with `format=auto` for output so Cloudflare auto-negotiates AVIF or WebP based on the browser's `Accept` header.

In local dev, Image Resizing is disabled and images fall back to plain `src` URLs with no `srcset`.

All responsive image logic lives in `src/lib/utils/image-formats.ts`.

## API Notes

- Client API calls use same-origin `/api` endpoints (no cross-origin).
- `/api/projects` endpoints are available for CRUD; reads are public for published items.
- `/api/uploads/artifacts` handles image uploads to R2 and returns a URL for artifacts.

## Database (Cloudflare D1)

- D1 binding: `DB` in `wrangler.toml`
- DB helper: `src/lib/server/db/index.ts` (`getDb`)
- `event.locals.db` is set in `src/hooks.server.ts`
- Schema lives in `src/lib/server/db/schema.ts`
- API spec: `docs/api-spec.md`

## Storage (Cloudflare R2)

- R2 binding: `ARTIFACTS` in `wrangler.toml`
- Preview bucket: `preview_bucket_name` for remote dev (`wrangler dev --remote`)
- Public base URL: `PUBLIC_R2_BASE_URL` (leave empty in `.env.local` to use proxy URLs)

### Migrations

```sh
# Generate SQL from the schema
bun run db:generate

# Apply a generated migration to D1
bunx wrangler d1 execute portfolio-db --file=./drizzle/<migration>.sql
```


## Backing up themes and name cards

Admin → Export / Import creates a version 2 ZIP. Every export includes all saved
typography themes and the active theme, name-card variants and framing, generator
recipes (including typography snapshots), background images, and the promoted
landing, project, and social preview cards. Referenced PNG/JPEG/WebP/AVIF files
are included and shared images are stored once. Unsaved browser preview drafts
are not included; save those as themes first.

On import, **Themes and name cards** can be replaced with the backup (default),
merged by saved ID, or left unchanged. Replace restores the exact appearance
library, including clearing promotions that were absent in the backup. Merge
updates matching IDs and backed-up selections while retaining other saved entries.
Project/category conflict choices are separate. Theme/card IDs remain stable,
and restored images get new local URLs shared consistently by variants and
promotions. All formats retain the same basename. Unrelated integration settings
are not included or changed. Version 1 archives remain importable with their
original, limited name-card coverage.

Missing referenced images cause export to fail. Import validates the appearance
manifest and all required files before database changes, uploads the images, then
commits appearance settings in a single D1 batch. A failed image upload leaves
existing appearance settings unchanged (uploaded but unreferenced files may remain).

Backup regression tests:

```sh
bunx vitest run src/lib/server/appearance-backup.test.ts
# Explicitly opt in to temporarily replacing LOCAL dev appearance data.
# The test restores the original settings and removes its uploaded files in finally.
RUN_DEV_BACKUP_RESTORE=1 bunx vitest run src/lib/server/appearance-backup.dev.test.ts
```
