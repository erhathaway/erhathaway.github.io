export interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
}

export interface Project {
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

// CORS headers for all responses - support multiple origins
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    'https://erhathaway.com',
    'https://www.erhathaway.com'
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://erhathaway.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function handleCORS(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function verifyClerkAuth(request: Request, env: Env): Promise<string | null> {
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
        'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_token: token }),
    });

    if (response.ok) {
      const session = await response.json();
      return session.user_id;
    }
  } catch (error) {
    console.error('Auth verification error:', error);
  }

  return null;
}

async function handleGetProjects(env: Env, isAuthenticated: boolean, origin?: string): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);

  try {
    let query = 'SELECT * FROM projects';
    let params: any[] = [];

    if (!isAuthenticated) {
      query += ' WHERE isPublic = ?';
      params = [1];
    }

    query += ' ORDER BY updatedAt DESC';

    const result = await env.DB.prepare(query).bind(...params).all();

    const projects = result.results.map((row: any) => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      isPublic: Boolean(row.isPublic),
    }));

    return new Response(JSON.stringify(projects), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleCreateProject(request: Request, env: Env): Promise<Response> {
  try {
    const project: Project = await request.json();

    const result = await env.DB.prepare(`
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
      return new Response(JSON.stringify({ id: result.meta.last_row_id, ...project }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error('Failed to create project');
    }
  } catch (error) {
    console.error('Create project error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create project' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleUpdateProject(request: Request, env: Env, projectId: string): Promise<Response> {
  try {
    const project: Partial<Project> = await request.json();

    const result = await env.DB.prepare(`
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
      return new Response(JSON.stringify({ id: parseInt(projectId), ...project }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Update project error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update project' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleDeleteProject(env: Env, projectId: string): Promise<Response> {
  try {
    const result = await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();

    if (result.success && result.changes > 0) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Delete project error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete project' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    // Parse route
    const pathSegments = path.split('/').filter(Boolean);

    if (pathSegments[0] !== 'api' || pathSegments[1] !== 'projects') {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    // Check authentication
    const userId = await verifyClerkAuth(request, env);
    const isAuthenticated = Boolean(userId);

    // Route handling
    if (request.method === 'GET' && pathSegments.length === 2) {
      // GET /api/projects
      return handleGetProjects(env, isAuthenticated);
    }

    // All other operations require authentication
    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST' && pathSegments.length === 2) {
      // POST /api/projects
      return handleCreateProject(request, env);
    }

    if (pathSegments.length === 3) {
      const projectId = pathSegments[2];

      if (request.method === 'PUT') {
        // PUT /api/projects/:id
        return handleUpdateProject(request, env, projectId);
      }

      if (request.method === 'DELETE') {
        // DELETE /api/projects/:id
        return handleDeleteProject(env, projectId);
      }
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  },
};