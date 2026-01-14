# Portfolio API - Cloudflare Worker

This API handles CRUD operations for portfolio projects with Clerk authentication and Cloudflare D1 SQLite database.

## Setup Instructions

### 1. Install Dependencies

```bash
cd api-worker
npm install
```

### 2. Create Cloudflare D1 Database

```bash
# Create the database
npx wrangler d1 create portfolio-db

# Copy the database ID from the output and update wrangler.toml
```

### 3. Update Configuration

1. Edit `wrangler.toml` and replace `your-database-id-here` with your actual database ID
2. Set your Clerk secret key as an environment variable:

```bash
npx wrangler secret put CLERK_SECRET_KEY
# Enter your Clerk secret key when prompted
```

### 4. Initialize Database Schema

```bash
# Execute the schema file to create tables
npx wrangler d1 execute portfolio-db --file=./schema.sql
```

### 5. Deploy to Cloudflare

```bash
npm run deploy
```

### 6. Update Frontend Configuration

Update the `API_BASE` URL in:
- `src/lib/api/projects.ts`
- `src/routes/admin/projects/+page.svelte`

Replace `https://portfolio-api.your-account.workers.dev/api` with your actual worker URL.

## API Endpoints

### Public Endpoints
- `GET /api/projects` - Get all public projects

### Authenticated Endpoints (require Clerk token)
- `GET /api/projects` - Get all projects (public + private)
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

## Authentication

The API uses Clerk for authentication. Include the session token in the Authorization header:

```
Authorization: Bearer <clerk-session-token>
```

## Database Schema

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  image TEXT,
  gridSize TEXT DEFAULT 'regular',
  isPublic BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Development

```bash
npm run dev  # Start local development server
```