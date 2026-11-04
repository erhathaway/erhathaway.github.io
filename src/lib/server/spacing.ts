import { error } from '@sveltejs/kit';
import { eq, like, or } from 'drizzle-orm';
import { siteSettings } from './db/schema';
import type { Db } from './db';
import { DEFAULT_THEME, FIELDS, type SpacingField, type SpacingTheme } from '$lib/spacing';
const PREFIX = 'spacing-theme:';
const ACTIVE = 'spacing-active';
export function validateValues(input: unknown): SpacingTheme['values'] {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw error(400, 'Invalid spacing values.');
	const result: SpacingTheme['values'] = { desktop: {}, mobile: {} };
	for (const [viewport, values] of Object.entries(input)) {
		if (viewport !== 'desktop' && viewport !== 'mobile') throw error(400, 'Unknown viewport.');
		if (!values || typeof values !== 'object' || Array.isArray(values))
			throw error(400, 'Invalid spacing values.');
		for (const [key, value] of Object.entries(values)) {
			if (!FIELDS.some((field) => field.id === key)) throw error(400, 'Unknown spacing property.');
			if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 160)
				throw error(400, 'Spacing must be between 0 and 160 pixels.');
			result[viewport][key as SpacingField] = value;
		}
	}
	return result;
}
export async function listSpacing(db: Db) {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(or(like(siteSettings.key, `${PREFIX}%`), eq(siteSettings.key, ACTIVE)));
	const themes = [
		DEFAULT_THEME,
		...rows.filter((row) => row.key.startsWith(PREFIX)).map((row) => row.value as SpacingTheme)
	];
	const selected = rows.find((row) => row.key === ACTIVE)?.value as string | undefined;
	return {
		themes,
		activeId: themes.some((theme) => theme.id === selected) ? selected! : DEFAULT_THEME.id
	};
}
export async function activeSpacing(db: Db | undefined | null): Promise<SpacingTheme> {
	if (!db) return DEFAULT_THEME;
	const { themes, activeId } = await listSpacing(db);
	return themes.find((theme) => theme.id === activeId)!;
}
export async function saveSpacing(db: Db, input: unknown, id?: string) {
	if (id === DEFAULT_THEME.id) throw error(400, 'Duplicate the original theme to edit it.');
	if (!input || typeof input !== 'object') throw error(400, 'A theme is required.');
	const body = input as Record<string, unknown>;
	if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100)
		throw error(400, 'Enter a theme name (up to 100 characters).');
	const values = validateValues(body.values);
	if (id) {
		const [row] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, PREFIX + id));
		if (!row) throw error(404, 'Theme not found.');
	}
	const theme: SpacingTheme = {
		id: id ?? crypto.randomUUID(),
		name: body.name.trim(),
		values,
		updatedAt: new Date().toISOString()
	};
	if (id)
		await db
			.update(siteSettings)
			.set({ value: theme, updatedAt: theme.updatedAt })
			.where(eq(siteSettings.key, PREFIX + id));
	else await db.insert(siteSettings).values({ key: PREFIX + theme.id, value: theme });
	return theme;
}
export async function activateSpacing(db: Db, id: string) {
	const { themes } = await listSpacing(db);
	if (!themes.some((theme) => theme.id === id)) throw error(404, 'Theme not found.');
	await db
		.insert(siteSettings)
		.values({ key: ACTIVE, value: id })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value: id, updatedAt: new Date().toISOString() }
		});
	return { activeId: id };
}
