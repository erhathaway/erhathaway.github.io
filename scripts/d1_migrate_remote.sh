#!/usr/bin/env bash
set -euo pipefail

# Wrangler applies the SQL files in the configured migrations_dir (drizzle/) that its
# d1_migrations table doesn't list yet. Nothing here passes SQL as an argument, which
# Cloudflare's build environment splits into separate words.
exec bunx wrangler d1 migrations apply portfolio-db --remote
