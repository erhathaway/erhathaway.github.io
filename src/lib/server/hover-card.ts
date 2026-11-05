import { error } from '@sveltejs/kit';
import { eq, like, or } from 'drizzle-orm';
import { siteSettings } from './db/schema';
import type { Db } from './db';
import { ANGLE_RANGE, DEFAULT_THEME, WIDTH_RANGE, type HoverCardTheme } from '$lib/hover-card';
const PREFIX = 'hover-card-theme:';
const ACTIVE = 'hover-card-active';

function numberInRange(value: unknown, range: { min: number; max: number }, label: string) {
	if (
		typeof value !== 'number' ||
		!Number.isFinite(value) ||
		value < range.min ||
		value > range.max
	)
		throw error(400, `${label} must be between ${range.min} and ${range.max}.`);
	return value;
}
export function validateHoverCard(
	input: unknown
): Pick<HoverCardTheme, 'shape' | 'mobileShape' | 'width' | 'angle'> {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw error(400, 'Invalid hover card settings.');
	const body = input as Record<string, unknown>;
	const { shape, mobileShape } = body;
	if (shape !== 'partial' && shape !== 'full') throw error(400, 'Unknown hover card shape.');
	if (mobileShape !== undefined && mobileShape !== 'partial' && mobileShape !== 'full')
		throw error(400, 'Unknown mobile hover card shape.');
	return {
		shape,
		...(mobileShape ? { mobileShape } : {}),
		width: numberInRange(body.width, WIDTH_RANGE, 'Width'),
		angle: numberInRange(body.angle, ANGLE_RANGE, 'Angle')
	};
}
export async function listHoverCard(db: Db) {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(or(like(siteSettings.key, `${PREFIX}%`), eq(siteSettings.key, ACTIVE)));
	const themes = [
		DEFAULT_THEME,
		...rows.filter((row) => row.key.startsWith(PREFIX)).map((row) => row.value as HoverCardTheme)
	];
	const selected = rows.find((row) => row.key === ACTIVE)?.value as string | undefined;
	return {
		themes,
		activeId: themes.some((theme) => theme.id === selected) ? selected! : DEFAULT_THEME.id
	};
}
export async function activeHoverCard(db: Db | undefined | null): Promise<HoverCardTheme> {
	if (!db) return DEFAULT_THEME;
	const { themes, activeId } = await listHoverCard(db);
	return themes.find((theme) => theme.id === activeId)!;
}
export async function saveHoverCard(db: Db, input: unknown, id?: string) {
	if (id === DEFAULT_THEME.id) throw error(400, 'Create a copy of the default theme to edit it.');
	if (!input || typeof input !== 'object') throw error(400, 'A theme is required.');
	const body = input as Record<string, unknown>;
	if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100)
		throw error(400, 'Enter a theme name (up to 100 characters).');
	const settings = validateHoverCard(body);
	if (id) {
		const [row] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, PREFIX + id));
		if (!row) throw error(404, 'Theme not found.');
	}
	const theme: HoverCardTheme = {
		id: id ?? crypto.randomUUID(),
		name: body.name.trim(),
		...settings,
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
export async function activateHoverCard(db: Db, id: string) {
	const { themes } = await listHoverCard(db);
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
