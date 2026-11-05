#!/usr/bin/env bash
set -euo pipefail

db_name="portfolio-db"

if [ ! -d "./drizzle" ]; then
  echo "No ./drizzle directory found. Run 'bun run db:generate' first." >&2
  exit 1
fi

bunx wrangler d1 execute "$db_name" --command "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"

for file in ./drizzle/*.sql; do
  name="$(basename "$file" .sql)"
  # Parsed with Bun so the script runs anywhere the build does, including Cloudflare's build image.
  applied=$(bunx wrangler d1 execute "$db_name" --command "SELECT 1 FROM __drizzle_migrations WHERE id='$name' LIMIT 1" --json | bun -e 'const r = await Bun.stdin.json(); process.stdout.write(r[0]?.results?.length ? "1" : "")')
  if [ -n "$applied" ]; then
    echo "Skipping $name (already applied)"
    continue
  fi

  echo "Applying $name"
  bunx wrangler d1 execute "$db_name" --file="$file"
  bunx wrangler d1 execute "$db_name" --command "INSERT INTO __drizzle_migrations (id, applied_at) VALUES ('$name', datetime('now'))"

done
