import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface Project {
  id?: number;
  name: string;
  category: 'wood' | 'food' | 'other';
  subcategory: string;
  description: string;
  metadata: string; // JSON string
  image?: string;
  gridSize?: 'regular' | 'wide' | 'tall' | 'featured';
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

async function verifyClerkAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    // Verify Clerk session token
    const response = await fetch('https://api.clerk.com/v1/sessions/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_token: token }),
    });

    if (response.ok) {
      const session = await response.json();
      return session.user_id;
    }
  } catch (err) {
    console.error('Auth verification error:', err);
  }

  return null;
}

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const DB = platform?.env?.DB;
    if (!DB) {
      throw error(500, 'Database not available');
    }

    // For now, only return public projects since we don't have auth integrated
    const result = await DB.prepare('SELECT * FROM projects WHERE isPublic = ? ORDER BY updatedAt DESC')
      .bind(1)
      .all();

    const projects = result.results.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      isPublic: Boolean(row.isPublic),
    }));

    return json(projects, { headers: corsHeaders });
  } catch (err) {
    console.error('Get projects error:', err);
    throw error(500, 'Failed to fetch projects');
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const DB = platform?.env?.DB;
    if (!DB) {
      throw error(500, 'Database not available');
    }

    // Check authentication
    const userId = await verifyClerkAuth(request);
    if (!userId) {
      throw error(401, 'Unauthorized');
    }

    const project: Project = await request.json();

    const result = await DB.prepare(`
      INSERT INTO projects (name, category, subcategory, description, metadata, image, gridSize, isPublic, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      project.name,
      project.category,
      project.subcategory,
      project.description,
      JSON.stringify(project.metadata || {}),
      project.image || null,
      project.gridSize || 'regular',
      project.isPublic ? 1 : 0
    ).run();

    if (result.success) {
      return json({ id: result.meta.last_row_id, ...project }, { status: 201, headers: corsHeaders });
    } else {
      throw error(500, 'Failed to create project');
    }
  } catch (err) {
    console.error('Create project error:', err);
    throw error(500, 'Failed to create project');
  }
};