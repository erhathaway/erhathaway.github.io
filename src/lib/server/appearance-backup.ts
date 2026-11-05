import { error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import type JSZip from 'jszip';
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Db } from './db';
import { siteSettings } from './db/schema';
import { ROLES } from '$lib/typography';
import { validateStyle } from './typography';
import { validateValues } from './spacing';
import { validateEffects, validateFill } from './empty-card';
import { validateHoverCard } from './hover-card';
import { PROJECT_NAMECARD_BACKGROUND_KEY } from './project-namecard';
import { validateNamecardRecipe } from './namecard-recipe';
import type { AppearanceBackup, ConflictResolution } from '$lib/types/export-manifest';

const destinations = ['namecard_image', 'project_namecard_image', 'preview_namecard_image'];
const THEME_PREFIX_BY_ACTIVE_KEY: Record<string, string> = {
	'typography-active': 'typography-theme:',
	'spacing-active': 'spacing-theme:',
	'empty-card-active': 'empty-card-theme:',
	'hover-card-active': 'hover-card-theme:'
};
export function isAppearanceKey(key: string) {
	return (
		destinations.includes(key) ||
		key in THEME_PREFIX_BY_ACTIVE_KEY ||
		key === PROJECT_NAMECARD_BACKGROUND_KEY ||
		/^(namecard-variant|typography-theme|spacing-theme|empty-card-theme|hover-card-theme):[\w-]+$/.test(key)
	);
}
/** Replacing clears these only when the backup covers them, so older backups can't wipe them. */
const OPTIONAL_THEME_KINDS = ['spacing', 'empty-card', 'hover-card', 'project-namecard'];
function backupCoversKey(backup: AppearanceBackup, key: string) {
	const kind = OPTIONAL_THEME_KINDS.find((item) => key.startsWith(`${item}-`));
	return !kind || !!backup.themeKinds?.includes(kind);
}
function validateThemeName(value: Record<string, unknown>) {
	if (
		typeof value.name !== 'string' ||
		!value.name.trim() ||
		value.name.length > 100 ||
		typeof value.updatedAt !== 'string'
	)
		throw error(400, 'Invalid theme name.');
}
export function imageKey(url: string): string | null {
	if (url.startsWith('artifacts/')) return url;
	try {
		const parsed = new URL(url, 'http://localhost');
		if (parsed.pathname.startsWith('/artifacts/')) return parsed.pathname.slice(1);
		if (parsed.pathname === '/api/uploads/artifacts') return parsed.searchParams.get('key');
	} catch {
		/* Invalid URL. */
	}
	return null;
}
function safeKey(key: string) {
	return /^artifacts\/[\w/-]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(key) && !key.includes('..');
}
function walkImages(value: unknown, visit: (url: string, formats: string[]) => string): unknown {
	if (Array.isArray(value)) return value.map((item) => walkImages(item, visit));
	if (!value || typeof value !== 'object') return value;
	const object = value as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(object).map(([key, child]) => [
			key,
			key === 'imageUrl' && typeof child === 'string'
				? visit(child, Array.isArray(object.imageFormats) ? (object.imageFormats as string[]) : [])
				: walkImages(child, visit)
		])
	);
}
function referencedKeys(settings: AppearanceBackup['settings']) {
	const keys = new Set<string>();
	for (const row of settings)
		walkImages(row.value, (url, formats) => {
			const key = imageKey(url);
			if (!key || !safeKey(key)) throw error(400, `Cannot back up image: ${url}`);
			keys.add(key);
			for (const format of formats) {
				if (!['webp', 'avif'].includes(format)) throw error(400, 'Invalid image format.');
				keys.add(key.replace(/\.[^.]+$/, `.${format}`));
			}
			return url;
		});
	return keys;
}

export async function exportAppearance(db: Db): Promise<AppearanceBackup> {
	const rows = await db.select().from(siteSettings);
	const settings = rows
		.filter((row) => isAppearanceKey(row.key))
		.map(({ key, value }) => ({ key, value }));
	return {
		themeKinds: OPTIONAL_THEME_KINDS,
		settings,
		images: [...referencedKeys(settings)].map((key) => ({
			key,
			path: `images/${key.slice('artifacts/'.length)}`
		}))
	};
}

/** Validate all references before any database writes or destructive restore work. */
export function validateAppearance(backup: AppearanceBackup, zip: JSZip, bucket?: R2Bucket) {
	if (!backup || !Array.isArray(backup.settings) || !Array.isArray(backup.images))
		throw error(400, 'Invalid appearance backup.');
	if (backup.themeKinds !== undefined && !Array.isArray(backup.themeKinds))
		throw error(400, 'Invalid appearance backup.');
	const keys = new Set<string>();
	for (const row of backup.settings) {
		if (
			!row ||
			typeof row.key !== 'string' ||
			!isAppearanceKey(row.key) ||
			keys.has(row.key) ||
			row.value == null
		)
			throw error(400, 'Invalid or duplicate appearance setting.');
		keys.add(row.key);
		if (row.key.includes(':')) {
			const value = row.value as { id?: unknown };
			if (value.id !== row.key.slice(row.key.indexOf(':') + 1))
				throw error(400, 'Appearance ID does not match its key.');
		}
		if (row.key === PROJECT_NAMECARD_BACKGROUND_KEY) {
			if (typeof row.value !== 'boolean') throw error(400, 'Invalid name card background setting.');
		} else if (!(row.key in THEME_PREFIX_BY_ACTIVE_KEY)) {
			if (typeof row.value !== 'object' || Array.isArray(row.value))
				throw error(400, 'Invalid appearance value.');
			const value = row.value as Record<string, unknown>;
			if (row.key.startsWith('typography-theme:')) {
				if (
					typeof value.name !== 'string' ||
					!value.name.trim() ||
					value.name.length > 100 ||
					typeof value.updatedAt !== 'string' ||
					!value.roles ||
					typeof value.roles !== 'object' ||
					Array.isArray(value.roles)
				)
					throw error(400, 'Invalid typography theme.');
				for (const [role, style] of Object.entries(value.roles)) {
					if (!ROLES.some((item) => item.id === role))
						throw error(400, 'Unknown typography role in backup.');
					validateStyle(style);
				}
			} else if (row.key.startsWith('spacing-theme:')) {
				validateThemeName(value);
				validateValues(value.values);
			} else if (row.key.startsWith('empty-card-theme:')) {
				validateThemeName(value);
				validateFill(value.fill);
				validateEffects(value.effects);
			} else if (row.key.startsWith('hover-card-theme:')) {
				validateThemeName(value);
				validateHoverCard(value);
			} else {
				if (typeof value.imageUrl !== 'string') throw error(400, 'Missing name card image.');
				for (const [field, min, max] of [
					['positionX', 0, 100],
					['positionY', 0, 100],
					['zoom', 0.5, 2]
				] as const) {
					if (
						typeof value[field] !== 'number' ||
						!Number.isFinite(value[field]) ||
						value[field] < min ||
						value[field] > max
					)
						throw error(400, 'Invalid name card framing.');
				}
				if (row.key.startsWith('namecard-variant:')) {
					if (typeof value.name !== 'string' || typeof value.createdAt !== 'string')
						throw error(400, 'Invalid name card variant.');
					validateNamecardRecipe(value.recipe);
				}
			}
		}
	}
	for (const [activeKey, prefix] of Object.entries(THEME_PREFIX_BY_ACTIVE_KEY)) {
		const active = backup.settings.find((row) => row.key === activeKey)?.value;
		// The built-in default is code-defined and has no database row.
		if (
			active != null &&
			(typeof active !== 'string' || (active !== 'default' && !keys.has(`${prefix}${active}`)))
		)
			throw error(400, 'Active theme is missing from the backup.');
	}
	const imageKeys = new Set<string>();
	for (const image of backup.images) {
		if (
			!image ||
			typeof image.key !== 'string' ||
			!safeKey(image.key) ||
			image.path !== `images/${image.key.slice('artifacts/'.length)}` ||
			imageKeys.has(image.key)
		)
			throw error(400, 'Invalid appearance image entry.');
		imageKeys.add(image.key);
		if (!zip.file(image.path)) throw error(400, `Backup is missing image: ${image.path}`);
	}
	for (const key of referencedKeys(backup.settings))
		if (!imageKeys.has(key)) throw error(400, `Backup is missing image reference: ${key}`);
	if (backup.images.length && !bucket)
		throw error(400, 'Image storage is required to restore name cards.');
}

export async function restoreAppearance(
	db: Db,
	backup: AppearanceBackup,
	zip: JSZip,
	bucket: R2Bucket | undefined,
	resolution: ConflictResolution
) {
	validateAppearance(backup, zip, bucket);
	if (!['clobber', 'merge', 'skip'].includes(resolution))
		throw error(400, 'Invalid appearance restore mode.');
	if (resolution === 'skip') return { appearanceSettingsRestored: 0, appearanceImagesRestored: 0 };
	const replacements = new Map<string, string>();
	const stems = new Map<string, string>();
	// All formats of an image share a new basename, preserving <picture> URLs.
	for (const image of backup.images) {
		const stem = image.key.replace(/\.[^.]+$/, '');
		if (!stems.has(stem)) stems.set(stem, `artifacts/${crypto.randomUUID()}`);
		const ext = image.key.split('.').pop()!.toLowerCase();
		const key = `${stems.get(stem)}.${ext}`;
		const bytes = await zip.file(image.path)!.async('uint8array');
		const mime =
			ext === 'jpg' || ext === 'jpeg'
				? 'image/jpeg'
				: ext === 'svg'
					? 'image/svg+xml'
					: `image/${ext}`;
		await bucket!.put(key, bytes, { httpMetadata: { contentType: mime } });
		replacements.set(image.key, `/${key}`);
	}
	const rows = backup.settings.map((row) => ({
		key: row.key,
		value: walkImages(row.value, (url) => replacements.get(imageKey(url)!)!),
		updatedAt: new Date().toISOString()
	}));
	const writes = rows.map((row) =>
		db
			.insert(siteSettings)
			.values(row)
			.onConflictDoUpdate({
				target: siteSettings.key,
				set: { value: row.value, updatedAt: row.updatedAt }
			})
	);
	if (resolution === 'clobber') {
		const old = (await db.select({ key: siteSettings.key }).from(siteSettings))
			.filter((row) => isAppearanceKey(row.key) && backupCoversKey(backup, row.key))
			.map((row) => row.key);
		// D1 batch commits all settings together, including clearing absent promotions.
		await db.batch([db.delete(siteSettings).where(inArray(siteSettings.key, old)), ...writes]);
	} else if (writes.length) {
		await db.batch([writes[0], ...writes.slice(1)]);
	}
	return {
		appearanceSettingsRestored: rows.length,
		appearanceImagesRestored: backup.images.length
	};
}
