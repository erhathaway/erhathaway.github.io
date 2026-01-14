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

export const PUT: RequestHandler = async ({ params, request, platform }) => {
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

    const projectId = params.id;
    const project: Partial<Project> = await request.json();

    const result = await DB.prepare(`
      UPDATE projects
      SET name = ?, category = ?, subcategory = ?, description = ?, metadata = ?,
          image = ?, gridSize = ?, isPublic = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).bind(
      project.name,
      project.category,
      project.subcategory,
      project.description,
      JSON.stringify(project.metadata || {}),
      project.image || null,
      project.gridSize || 'regular',
      project.isPublic ? 1 : 0,
      projectId
    ).run();

    if (result.success && result.changes > 0) {
      return json({ id: parseInt(projectId), ...project }, { headers: corsHeaders });
    } else {
      throw error(404, 'Project not found');
    }
  } catch (err) {
    console.error('Update project error:', err);
    throw error(500, 'Failed to update project');
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ params, request, platform }) => {
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

    const projectId = params.id;

    const result = await DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();

    if (result.success && result.changes > 0) {
      return json({ success: true }, { headers: corsHeaders });
    } else {
      throw error(404, 'Project not found');
    }
  } catch (err) {
    console.error('Delete project error:', err);
    throw error(500, 'Failed to delete project');
  }
};