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
openssl rand -hex 32
```

## Google Photos Integration

Imports photos and videos from Google Photos into projects via the [Picker API](https://developers.google.com/photos/picker/guides/get-started-picker).

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Photos Picker API** (APIs & Services > Library > search "Photos Picker API")
4. Go to **APIs & Services > Credentials** and create an **OAuth 2.0 Client ID** (type: Web application)
5. Add authorized redirect URIs:
   - Local: `http://localhost:5173/api/integrations/google-photos/callback`
   - Production: `https://erhathaway.com/api/integrations/google-photos/callback`
6. Set `GOOGLE_CLIENT_ID` in `wrangler.toml` `[vars]`
7. Set `GOOGLE_CLIENT_SECRET` and `GOOGLE_TOKEN_ENCRYPTION_KEY` as secrets (see above)

### Expired Google Photos connections

If importing fails with `invalid_grant`, Google has rejected the saved refresh token. Reconnect from **Admin > Integrations > Google Photos** to authorize again; existing imported artifacts are unaffected. The status check refreshes expired access tokens and reports **Reconnect required** if Google rejects the refresh. Temporary Google/network errors remain retryable and do not delete credentials.

Google OAuth apps with an external audience and publishing status **Testing** issue refresh tokens that expire after seven days for the Photos Picker scope. Check the app's publishing status in Google Cloud Console; use **In production** for a long-lived integration, completing Google's requirements as applicable. Reauthorize afterward. Revoked access and token limits can also invalidate refresh tokens. See [Google's refresh-token expiration documentation](https://developers.google.com/identity/protocols/oauth2#expiration).

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
typography, spacing, empty card, and hover card themes and the active theme of each, the project name card background setting, name-card variants and framing, generator
recipes (including typography snapshots), background images, and the promoted
landing, project, and social preview cards. Referenced PNG/JPEG/WebP/AVIF/GIF files
are included and shared images are stored once. Unsaved browser preview drafts
are not included; save those as themes first.

On import, **Themes and name cards** can be replaced with the backup (default),
merged by saved ID, or left unchanged. Replace restores the exact appearance
library, including clearing promotions that were absent in the backup. Theme types
added after a backup was made are left unchanged. Merge
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

## Spacing themes

Admin → Themes → Spacing themes controls home gallery row/column gaps and its four outer margins. Desktop (900px and above) and mobile values are independent. The locked default uses 8px gaps and 7px margins on desktop, and 2px on mobile; create a copy, adjust values, then save and activate it. Saving an already-active theme updates the public home page.

Preview on site opens a private live editor with apply/compare, highlight, minimize, and move controls. Review & save in admin carries the draft back without publishing it. Themes are stored in existing site settings (`spacing-theme:*` and `spacing-active`); no database migration is needed.

## Empty card themes

Admin → Themes → Empty card themes controls what fills the leftover space when projects don't complete the home gallery's last row. A theme can be blank (the locked default), a color, a gradient, or an uploaded image with an adjustable focal point. Blur, transparency, fade, and wash out can soften any non-blank card. Preview on site opens a private live editor on the home page; Review & save in admin carries the draft back without publishing it. The active theme is also the fixed background on project pages. Themes are stored in existing site settings (`empty-card-theme:*` and `empty-card-active`); no database migration is needed. They are included in appearance backups, along with their images.

## Hover card themes

Admin → Themes → Hover card themes sets the shape of the glass panel that shows project details on the home gallery: the full card, or a partial panel with an adjustable width and angle, chosen separately for desktop and mobile widths. Preview on site opens a private live editor that can hold a project's hover card open. Themes are stored in existing site settings (`hover-card-theme:*` and `hover-card-active`), need no database migration, and are included in appearance backups.

### Private admin and photos

- `ADMIN_CLERK_USER_ID` is the single verified Clerk user ID allowed to use admin pages,
  APIs, Google Photos, and unpublished images. Production is configured in `wrangler.toml`.
  Set your development instance's user ID in `.env.local` (and `.env` for Vite).
  Missing configuration denies access; signing up another Clerk account does not grant access.
- Clerk verifies sessions and bearer tokens; OAuth connections additionally require a
  short-lived, browser-bound state cookie and PKCE. Google credentials stay encrypted on the server.
- Google Photos previews and owner image responses use `private, no-store`. Public image
  requests must match a published artifact in a published project, or an active public namecard.
  Legacy download URLs go through the same check; `Via` headers never authorize access.
- The `IMAGES` binding optimizes bytes read directly from private R2, including drafts.
  Keep R2 public development URLs and custom domains disabled. Images deliberately published
  on the portfolio remain public; previously downloaded/cached public copies cannot be recalled.
- Deploy these changes before relying on the restrictions. Purge existing Cloudflare image
  caches at rollout, because the previous version cached image responses for a year.
