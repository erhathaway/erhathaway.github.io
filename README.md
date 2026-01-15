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

## Build and Deploy

```sh
bun run build
bun run preview
bun run deploy
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
