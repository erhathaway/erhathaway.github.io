import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { siteSettings } from './db/schema';
import type { Db } from './db';
export const PROJECT_NAMECARD_BACKGROUND_KEY = 'project-namecard-background';

/** Whether project pages show the name card's background. Without it, the card is just text. */
export async function projectNamecardBackground(db: Db | undefined | null): Promise<boolean> {
	if (!db) return true;
	const [row] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, PROJECT_NAMECARD_BACKGROUND_KEY));
	return row?.value !== false;
}
export async function setProjectNamecardBackground(db: Db, input: unknown) {
	if (typeof input !== 'boolean') throw error(400, 'Choose whether to show the background.');
	await db
		.insert(siteSettings)
		.values({ key: PROJECT_NAMECARD_BACKGROUND_KEY, value: input })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value: input, updatedAt: new Date().toISOString() }
		});
	return { showBackground: input };
}
