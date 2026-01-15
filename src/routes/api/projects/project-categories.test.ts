import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, OPTIONS, POST } from './[id]/categories/+server';

vi.mock('$lib/server/auth', () => ({
\tverifyClerkAuth: vi.fn()
}));

import { verifyClerkAuth } from '$lib/server/auth';

const asAuth = (value: string | null) => {
\tvi.mocked(verifyClerkAuth).mockResolvedValue(value);
};

const createProjectLookupDb = (projectRow: any) => {
\treturn {
\t\tselect: () => ({
\t\t\tfrom: () => ({
\t\t\t\twhere: async () => (projectRow ? [projectRow] : [])
\t\t\t})
\t\t})
\t} as any;
};

const createCategoriesDb = (rows: any[]) => {
\treturn {
\t\tselect: () => ({
\t\t\tfrom: () => ({
\t\t\t\tinnerJoin: () => ({
\t\t\t\t\twhere: async () => rows
\t\t\t\t})
\t\t\t})
\t\t})
\t} as any;
};

const createInsertDb = () => {
\treturn {
\t\tinsert: () => ({
\t\t\tvalues: () => ({
\t\t\t\tonConflictDoNothing: async () => ({})
\t\t\t})
\t\t})
\t} as any;
};

const createDeleteDb = () => {
\treturn {
\t\tdelete: () => ({
\t\t\twhere: async () => ({})
\t\t})
\t} as any;
};

beforeEach(() => {
\tvi.mocked(verifyClerkAuth).mockResolvedValue(null);
});

describe('GET /api/projects/:id/categories', () => {
\tit('returns 404 when project is not published and unauthenticated', async () => {
\t\tconst db = createProjectLookupDb({ id: 1, isPublished: false });
\t\tconst request = new Request('http://localhost/api/projects/1/categories');

\t\tawait expect(GET({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
\t\t\tstatus: 404
\t\t});
\t});

\tit('returns categories for authenticated user', async () => {
\t\tconst db = {
\t\t\t...createProjectLookupDb({ id: 1, isPublished: false }),
\t\t\t...createCategoriesDb([{ id: 10, name: 'wood', displayName: 'Wood', isPublished: false }])
\t\t} as any;

\t\tasAuth('user_123');
\t\tconst request = new Request('http://localhost/api/projects/1/categories');
\t\tconst response = await GET({ params: { id: '1' }, request, locals: { db } } as any);
\t\tconst body = await response.json();

\t\texpect(body).toEqual([{ id: 10, name: 'wood', displayName: 'Wood', isPublished: false }]);
\t});
});

describe('POST /api/projects/:id/categories', () => {
\tit('requires authentication', async () => {
\t\tconst db = createInsertDb();
\t\tconst request = new Request('http://localhost/api/projects/1/categories', {
\t\t\tmethod: 'POST',
\t\t\tbody: JSON.stringify({ category_ids: [1] }),
\t\t\theaders: { 'Content-Type': 'application/json' }
\t\t});

\t\tawait expect(POST({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
\t\t\tstatus: 401
\t\t});
\t});

\tit('adds categories when authenticated', async () => {
\t\tconst db = createInsertDb();
\t\tasAuth('user_123');
\t\tconst request = new Request('http://localhost/api/projects/1/categories', {
\t\t\tmethod: 'POST',
\t\t\tbody: JSON.stringify({ category_ids: [1, 2] }),
\t\t\theaders: { 'Content-Type': 'application/json' }
\t\t});

\t\tconst response = await POST({ params: { id: '1' }, request, locals: { db } } as any);
\t\tconst body = await response.json();

\t\texpect(body).toEqual({ success: true });
\t});
});

describe('DELETE /api/projects/:id/categories', () => {
\tit('requires authentication', async () => {
\t\tconst db = createDeleteDb();
\t\tconst request = new Request('http://localhost/api/projects/1/categories', {
\t\t\tmethod: 'DELETE',
\t\t\tbody: JSON.stringify({ category_ids: [1] }),
\t\t\theaders: { 'Content-Type': 'application/json' }
\t\t});

\t\tawait expect(DELETE({ params: { id: '1' }, request, locals: { db } } as any)).rejects.toMatchObject({
\t\t\tstatus: 401
\t\t});
\t});

\tit('removes categories when authenticated', async () => {
\t\tconst db = createDeleteDb();
\t\tasAuth('user_123');
\t\tconst request = new Request('http://localhost/api/projects/1/categories', {
\t\t\tmethod: 'DELETE',
\t\t\tbody: JSON.stringify({ category_ids: [1, 2] }),
\t\t\theaders: { 'Content-Type': 'application/json' }
\t\t});

\t\tconst response = await DELETE({ params: { id: '1' }, request, locals: { db } } as any);
\t\tconst body = await response.json();

\t\texpect(body).toEqual({ success: true });
\t});
});

describe('OPTIONS /api/projects/:id/categories', () => {
\tit('returns 200', async () => {
\t\tconst response = await OPTIONS({} as any);
\t\texpect(response.status).toBe(200);
\t});
});
