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
bun run build
bun run preview
bun run deploy
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
