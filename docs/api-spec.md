# API Spec - Cloudflare D1 CRUD

This document defines the CRUD endpoints and auth rules for the Cloudflare D1-backed API.

## Auth Rules

- Reads:
  - Without token: only rows where `is_published = true`.
  - With token: can read all rows (published + unpublished).
- Writes (create/update/delete): always require valid Clerk session token.
- Auth header: `Authorization: Bearer <clerk_session_token>`.

## Implementation Approach (SvelteKit + D1)

- Use SvelteKit `+server.ts` endpoints.
- Access DB via `event.locals.db` (Drizzle D1 adapter).
- Verify Clerk token in a shared helper (same behavior as existing `verifyClerkAuth`).
- Reads: if no token, add `WHERE is_published = 1`; if token, no filter.
- Writes: reject if token invalid.

## Resources

### Categories

Fields: `id`, `name`, `display_name`, `is_published`

- `GET /api/categories`
  - Public: returns only published.
  - Auth: returns all.
- `GET /api/categories/:id`
  - Public: 404 if not published.
  - Auth: returns even if unpublished.
- `POST /api/categories` (auth)
- `PUT /api/categories/:id` (auth)
- `DELETE /api/categories/:id` (auth)

### Projects

Fields: `id`, `name`, `display_name`, `description`, `is_published`

- `GET /api/projects`
  - Public: only published.
  - Auth: all.
- `GET /api/projects/:id`
  - Public: 404 if not published.
  - Auth: all.
- `POST /api/projects` (auth)
- `PUT /api/projects/:id` (auth)
- `DELETE /api/projects/:id` (auth)

### Project ↔ Categories (join)

Fields: `project_id`, `category_id`

- `GET /api/projects/:id/categories`
  - Public: only if project is published (and categories are published).
  - Auth: all linked categories for the project.
- `POST /api/projects/:id/categories` (auth)
  - Body: `{ category_ids: number[] }` (add links)
- `DELETE /api/projects/:id/categories` (auth)
  - Body: `{ category_ids: number[] }` (remove links)

### Project Artifacts

Fields: `id`, `project_id`, `schema_version`, `data_blob` (JSON), `is_published`

- `GET /api/projects/:id/artifacts`
  - Public: only if project is published + artifacts published.
  - Auth: all artifacts for project.
- `GET /api/artifacts/:id`
  - Public: only if artifact and its project are published.
  - Auth: all.
- `POST /api/projects/:id/artifacts` (auth)
- `PUT /api/artifacts/:id` (auth)
- `DELETE /api/artifacts/:id` (auth)

## Response Rules

- Public read attempts on unpublished resources: return `404` (do not leak existence).
- Missing/invalid token on writes: `401 Unauthorized`.
- Validation errors: `400`.
- Not found: `404`.
- Success: JSON body.
