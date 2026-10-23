import { error } from '@sveltejs/kit';
import { eq, like, or } from 'drizzle-orm';
import { siteSettings } from './db/schema';
import type { Db } from './db';
import { DEFAULT_THEME, FONTS, ROLES, type TextStyle, type TypographyTheme } from '$lib/typography';
const PREFIX = 'typography-theme:';
const ACTIVE = 'typography-active';
export function validateStyle(input: unknown): Partial<TextStyle> {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw error(400, 'Invalid typography style.');
	const result: Record<string, unknown> = {};
	const numeric = {
		weight: [300, 700],
		size: [6, 160],
		mobileSize: [6, 160],
		lineHeight: [0.8, 3],
		tracking: [-0.1, 1]
	} as const;
	for (const [key, value] of Object.entries(input)) {
		if (key in numeric) {
			const [min, max] = numeric[key as keyof typeof numeric];
			if (
				typeof value !== 'number' ||
				!Number.isFinite(value) ||
				value < min ||
				value > max ||
				(key === 'weight' && value % 100 !== 0)
			)
				throw error(400, `Invalid ${key}.`);
		} else if (key === 'font') {
			if (!FONTS.includes(value as (typeof FONTS)[number])) throw error(400, 'Invalid font.');
		} else if (key === 'italic') {
			if (typeof value !== 'boolean') throw error(400, 'Invalid italic setting.');
		} else if (key === 'transform') {
			if (!['none', 'uppercase', 'lowercase', 'capitalize'].includes(String(value)))
				throw error(400, 'Invalid capitalization.');
		} else if (key === 'decoration') {
			if (!['none', 'underline', 'line-through'].includes(String(value)))
				throw error(400, 'Invalid text decoration.');
		} else throw error(400, 'Unknown typography property.');
		result[key] = value;
	}
	return result as Partial<TextStyle>;
}
export async function listTypography(db: Db) {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(or(like(siteSettings.key, `${PREFIX}%`), eq(siteSettings.key, ACTIVE)));
	const themes = [
		DEFAULT_THEME,
		...rows.filter((row) => row.key.startsWith(PREFIX)).map((row) => row.value as TypographyTheme)
	];
	const selected = rows.find((row) => row.key === ACTIVE)?.value as string | undefined;
	return {
		themes,
		activeId: themes.some((theme) => theme.id === selected) ? selected! : DEFAULT_THEME.id
	};
}
export async function activeTypography(db: Db | undefined | null): Promise<TypographyTheme> {
	if (!db) return DEFAULT_THEME;
	const { themes, activeId } = await listTypography(db);
	return themes.find((theme) => theme.id === activeId)!;
}
export async function saveTypography(db: Db, input: unknown, id?: string) {
	if (id === DEFAULT_THEME.id) throw error(400, 'Duplicate the original theme to edit it.');
	if (!input || typeof input !== 'object') throw error(400, 'A theme is required.');
	const body = input as Record<string, unknown>;
	if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100)
		throw error(400, 'Enter a theme name (up to 100 characters).');
	if (!body.roles || typeof body.roles !== 'object' || Array.isArray(body.roles))
		throw error(400, 'Invalid typography roles.');
	const roles: TypographyTheme['roles'] = {};
	for (const [key, value] of Object.entries(body.roles)) {
		if (!ROLES.some((role) => role.id === key)) throw error(400, 'Unknown typography role.');
		roles[key] = validateStyle(value);
	}
	if (id) {
		const [row] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, PREFIX + id));
		if (!row) throw error(404, 'Theme not found.');
	}
	const theme: TypographyTheme = {
		id: id ?? crypto.randomUUID(),
		name: body.name.trim(),
		roles,
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
export async function activateTypography(db: Db, id: string) {
	const { themes } = await listTypography(db);
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
