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
  applied=$(bunx wrangler d1 execute "$db_name" --command "SELECT 1 FROM __drizzle_migrations WHERE id='$name' LIMIT 1" --json | jq -r '.[0].results[0]["1"] // empty')
  if [ -n "$applied" ]; then
    echo "Skipping $name (already applied)"
    continue
  fi

  echo "Applying $name"
  bunx wrangler d1 execute "$db_name" --file="$file"
  bunx wrangler d1 execute "$db_name" --command "INSERT INTO __drizzle_migrations (id, applied_at) VALUES ('$name', datetime('now'))"

done
