import { error } from '@sveltejs/kit';
import { eq, like, or } from 'drizzle-orm';
import { siteSettings } from './db/schema';
import type { Db } from './db';
import {
	DEFAULT_THEME,
	EFFECTS,
	type EmptyCardEffects,
	type EmptyCardFill,
	type EmptyCardTheme
} from '$lib/empty-card';
const PREFIX = 'empty-card-theme:';
const ACTIVE = 'empty-card-active';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
// Matches the image types appearance backups can store, so a saved theme can't break exports.
const UPLOADED_IMAGE = /^\/artifacts\/[\w-]+\.(png|jpe?g|webp|avif|gif)$/i;
const IMAGE_FORMATS = ['avif', 'webp'];

function color(value: unknown) {
	if (typeof value !== 'string' || !HEX_COLOR.test(value))
		throw error(400, 'Colors must be 6-digit hex values.');
	return value;
}
function numberBetween(value: unknown, min: number, max: number, label: string) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
		throw error(400, `${label} must be between ${min} and ${max}.`);
	return value;
}
export function validateFill(input: unknown): EmptyCardFill {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw error(400, 'Invalid empty card fill.');
	const fill = input as Record<string, unknown>;
	switch (fill.type) {
		case 'blank':
			return { type: 'blank' };
		case 'color':
			return { type: 'color', color: color(fill.color) };
		case 'gradient':
			return {
				type: 'gradient',
				from: color(fill.from),
				to: color(fill.to),
				angle: numberBetween(fill.angle, 0, 360, 'Angle')
			};
		case 'image': {
			if (typeof fill.imageUrl !== 'string' || !UPLOADED_IMAGE.test(fill.imageUrl))
				throw error(400, 'Upload a PNG, JPEG, WebP, AVIF, or GIF image for this theme.');
			const formats = fill.imageFormats;
			if (
				formats !== undefined &&
				(!Array.isArray(formats) || formats.some((format) => !IMAGE_FORMATS.includes(format)))
			)
				throw error(400, 'Unknown image format.');
			return {
				type: 'image',
				imageUrl: fill.imageUrl,
				...(formats?.length ? { imageFormats: formats as string[] } : {}),
				positionX: numberBetween(fill.positionX, 0, 100, 'Horizontal position'),
				positionY: numberBetween(fill.positionY, 0, 100, 'Vertical position')
			};
		}
		default:
			throw error(400, 'Unknown empty card fill type.');
	}
}
export function validateEffects(input: unknown): EmptyCardEffects {
	if (input === undefined) return {};
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw error(400, 'Invalid empty card effects.');
	const result: EmptyCardEffects = {};
	for (const [key, value] of Object.entries(input)) {
		const effect = EFFECTS.find((item) => item.id === key);
		if (!effect) throw error(400, 'Unknown empty card effect.');
		result[effect.id] = numberBetween(value, 0, effect.max, effect.label);
	}
	return result;
}
export async function listEmptyCard(db: Db) {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(or(like(siteSettings.key, `${PREFIX}%`), eq(siteSettings.key, ACTIVE)));
	const themes = [
		DEFAULT_THEME,
		...rows.filter((row) => row.key.startsWith(PREFIX)).map((row) => row.value as EmptyCardTheme)
	];
	const selected = rows.find((row) => row.key === ACTIVE)?.value as string | undefined;
	return {
		themes,
		activeId: themes.some((theme) => theme.id === selected) ? selected! : DEFAULT_THEME.id
	};
}
export async function activeEmptyCard(db: Db | undefined | null): Promise<EmptyCardTheme> {
	if (!db) return DEFAULT_THEME;
	const { themes, activeId } = await listEmptyCard(db);
	return themes.find((theme) => theme.id === activeId)!;
}
export async function saveEmptyCard(db: Db, input: unknown, id?: string) {
	if (id === DEFAULT_THEME.id) throw error(400, 'Create a copy of the default theme to edit it.');
	if (!input || typeof input !== 'object') throw error(400, 'A theme is required.');
	const body = input as Record<string, unknown>;
	if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100)
		throw error(400, 'Enter a theme name (up to 100 characters).');
	const fill = validateFill(body.fill);
	const effects = validateEffects(body.effects);
	if (id) {
		const [row] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, PREFIX + id));
		if (!row) throw error(404, 'Theme not found.');
	}
	const theme: EmptyCardTheme = {
		id: id ?? crypto.randomUUID(),
		name: body.name.trim(),
		fill,
		...(Object.keys(effects).length ? { effects } : {}),
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
export async function activateEmptyCard(db: Db, id: string) {
	const { themes } = await listEmptyCard(db);
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
