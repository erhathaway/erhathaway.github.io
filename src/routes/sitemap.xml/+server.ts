import type { RequestHandler } from './$types';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, platform }) => {
	const origin = url.origin;
	const db = platform?.env?.DB ? getDb(platform.env.DB) : null;

	let projectSlugs: string[] = [];
	if (db) {
		const rows = await db
			.select({ name: projects.name })
			.from(projects)
			.where(eq(projects.isPublished, true));
		projectSlugs = rows.map((r) => r.name);
	}

	const urls = [
		{ loc: origin, priority: '1.0' },
		...projectSlugs.map((slug) => ({
			loc: `${origin}/${slug}`,
			priority: '0.8'
		}))
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=0, s-maxage=3600'
		}
	});
};
