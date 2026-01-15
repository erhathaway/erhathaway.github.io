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
