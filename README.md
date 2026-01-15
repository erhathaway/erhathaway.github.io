# Ethan Hathaway - Personal Portfolio

A personal portfolio site for Ethan Hathaway showcasing things I make — woodworking, baking, cooking, and other crafts.

## Stack

- SvelteKit (Svelte 5 runes)
- Tailwind CSS
- Cloudflare adapter for deployment
- Cloudflare D1 (SQLite) via Drizzle ORM

## Development

```sh
bun install

# Local dev without platform bindings
bun run dev

# Local dev with Cloudflare bindings (D1, assets, etc.)
bunx wrangler dev
```

## Environment Files

- `.env` (local dev): `DATABASE_URL`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `.env.test` (tests): same Clerk dev keys and `DATABASE_URL` as `.env`
- `.env.template`: copy for new environments; includes `E2E_BASE_URL` and `CLERK_TEST_TOKEN` for integration tests

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

## Database (Cloudflare D1)

- D1 binding: `DB` in `wrangler.toml`
- DB helper: `src/lib/server/db/index.ts` (`getDb`)
- `event.locals.db` is set in `src/hooks.server.ts`
- Schema lives in `src/lib/server/db/schema.ts`
- API spec: `docs/api-spec.md`

### Migrations

```sh
# Generate SQL from the schema
bun run db:generate

# Apply a generated migration to D1
bunx wrangler d1 execute portfolio-db --file=./drizzle/<migration>.sql
```
