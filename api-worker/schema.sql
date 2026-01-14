-- Database schema for portfolio projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('wood', 'food', 'other')),
  subcategory TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}', -- JSON string for flexible metadata
  image TEXT,
  gridSize TEXT DEFAULT 'regular' CHECK (gridSize IN ('regular', 'wide', 'tall', 'featured')),
  isPublic BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(isPublic);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updatedAt DESC);