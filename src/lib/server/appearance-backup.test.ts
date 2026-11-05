import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import JSZip from 'jszip';
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Db } from './db';
import { siteSettings } from './db/schema';
import { exportAppearance, restoreAppearance, validateAppearance } from './appearance-backup';
import { NAMECARD_DEFAULTS } from '$lib/utils/namecard';
import { snapshotTypography, DEFAULT_THEME } from '$lib/typography';
let client: Client;
let db: Db;
let zip: JSZip;
let uploaded: Map<string, Uint8Array>;
let bucket: R2Bucket;
const card = {
	imageUrl: '/artifacts/card.png',
	imageFormats: ['webp', 'avif'],
	positionX: 23,
	positionY: 70,
	zoom: 1.4
};
const variant = {
	...card,
	id: 'card-1',
	name: 'Warm paper',
	createdAt: '2026-10-23',
	recipe: {
		version: 1,
		design: { ...NAMECARD_DEFAULTS, typography: snapshotTypography(DEFAULT_THEME, 'landing') },
		background: { imageUrl: '/artifacts/paper.jpg', imageFormats: ['webp'] }
	}
};
const theme = {
	id: 'theme-1',
	name: 'Custom',
	updatedAt: '2026-10-23',
	roles: { 'tile-title': { size: 42, weight: 600 } }
};
const spacingTheme = {
	id: 'spacing-1',
	name: 'Airy',
	updatedAt: '2026-10-23',
	values: { desktop: { rowGap: 24, left: 40 }, mobile: { rowGap: 8 } }
};
const emptyCardTheme = {
	id: 'empty-1',
	name: 'Plaster',
	updatedAt: '2026-10-23',
	fill: {
		type: 'image',
		imageUrl: '/artifacts/backdrop.png',
		imageFormats: ['webp'],
		positionX: 25,
		positionY: 75
	},
	effects: { blur: 12, transparency: 20, fade: 60, wash: 30 }
};
const hoverCardTheme = {
	id: 'hover-1',
	name: 'Full glass',
	updatedAt: '2026-10-23',
	shape: 'full',
	mobileShape: 'partial',
	width: 60,
	angle: -12
};
const original = [
	{ key: 'namecard-variant:card-1', value: variant },
	{ key: 'namecard_image', value: card },
	{ key: 'project_namecard_image', value: { ...card, positionX: 80 } },
	{ key: 'preview_namecard_image', value: { ...card, zoom: 0.8 } },
	{ key: 'typography-theme:theme-1', value: theme },
	{ key: 'typography-active', value: 'theme-1' },
	{ key: 'spacing-theme:spacing-1', value: spacingTheme },
	{ key: 'spacing-active', value: 'spacing-1' },
	{ key: 'empty-card-theme:empty-1', value: emptyCardTheme },
	{ key: 'empty-card-active', value: 'empty-1' },
	{ key: 'hover-card-theme:hover-1', value: hoverCardTheme },
	{ key: 'hover-card-active', value: 'hover-1' },
	{ key: 'project-namecard-background', value: false }
];
beforeEach(async () => {
	client = createClient({ url: ':memory:' });
	await client.execute(
		'CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'
	);
	db = drizzle(client) as unknown as Db;
	await db.insert(siteSettings).values(original);
	await db.insert(siteSettings).values({ key: 'unrelated-secret', value: 'do-not-export' });
	zip = new JSZip();
	for (const name of [
		'card.png',
		'card.webp',
		'card.avif',
		'paper.jpg',
		'paper.webp',
		'backdrop.png',
		'backdrop.webp'
	])
		zip.file(`images/${name}`, `bytes:${name}`);
	uploaded = new Map();
	bucket = {
		put: async (key: string, bytes: Uint8Array) => {
			uploaded.set(key, bytes);
		}
	} as unknown as R2Bucket;
});
afterEach(() => client.close());
async function settings() {
	return Object.fromEntries(
		(await db.select().from(siteSettings)).map((row) => [row.key, row.value])
	);
}
describe('appearance backup', () => {
	it('includes themes, active theme, every promotion, variant recipes, backgrounds and all formats, deduplicated', async () => {
		const backup = await exportAppearance(db);
		expect(backup.settings).toHaveLength(13);
		expect(backup.images.map((image) => image.key).sort()).toEqual(
			[
				'backdrop.png',
				'backdrop.webp',
				'card.avif',
				'card.png',
				'card.webp',
				'paper.jpg',
				'paper.webp'
			].map((name) => `artifacts/${name}`)
		);
		expect(backup.settings.find((row) => row.key.startsWith('namecard-variant:'))?.value).toEqual(
			variant
		);
	});
	it('replaces appearance atomically, preserves IDs, snapshots and crops, and rewrites shared images consistently', async () => {
		const backup = await exportAppearance(db);
		await db.delete(siteSettings);
		await db.insert(siteSettings).values([
			{ key: 'typography-theme:extra', value: { id: 'extra' } },
			{ key: 'unrelated-secret', value: 'keep' }
		]);
		const result = await restoreAppearance(db, backup, zip, bucket, 'clobber');
		const rows = await settings();
		const restored = rows['namecard-variant:card-1'] as typeof variant;
		expect(result).toEqual({ appearanceSettingsRestored: 13, appearanceImagesRestored: 7 });
		expect(rows['typography-theme:extra']).toBeUndefined();
		expect(rows['unrelated-secret']).toBe('keep');
		expect(rows['typography-theme:theme-1']).toEqual(theme);
		expect(rows['typography-active']).toBe('theme-1');
		expect(restored).toEqual({
			...variant,
			imageUrl: restored.imageUrl,
			recipe: {
				...variant.recipe,
				background: { ...variant.recipe.background, imageUrl: restored.recipe.background.imageUrl }
			}
		});
		expect(rows['namecard_image']).toEqual({ ...card, imageUrl: restored.imageUrl });
		expect(rows['project_namecard_image']).toEqual({
			...card,
			positionX: 80,
			imageUrl: restored.imageUrl
		});
		expect(rows['preview_namecard_image']).toEqual({
			...card,
			zoom: 0.8,
			imageUrl: restored.imageUrl
		});
		for (const ext of ['png', 'webp', 'avif'])
			expect(
				new TextDecoder().decode(
					uploaded.get(restored.imageUrl.slice(1).replace(/\.png$/, `.${ext}`))
				)
			).toBe(`bytes:card.${ext}`);
		expect(uploaded.size).toBe(7);
	});
	it('restores spacing and empty card themes, their active selections, and image files', async () => {
		const backup = await exportAppearance(db);
		await db.delete(siteSettings);
		await db.insert(siteSettings).values({ key: 'spacing-theme:extra', value: { id: 'extra' } });
		await restoreAppearance(db, backup, zip, bucket, 'clobber');
		const rows = await settings();
		const restored = rows['empty-card-theme:empty-1'] as typeof emptyCardTheme;
		expect(rows['spacing-theme:extra']).toBeUndefined();
		expect(rows['spacing-theme:spacing-1']).toEqual(spacingTheme);
		expect(rows['spacing-active']).toBe('spacing-1');
		expect(rows['empty-card-active']).toBe('empty-1');
		expect(rows['hover-card-theme:hover-1']).toEqual(hoverCardTheme);
		expect(rows['hover-card-active']).toBe('hover-1');
		expect(rows['project-namecard-background']).toBe(false);
		expect(restored).toEqual({
			...emptyCardTheme,
			fill: { ...emptyCardTheme.fill, imageUrl: restored.fill.imageUrl }
		});
		expect(restored.fill.imageUrl).not.toBe(emptyCardTheme.fill.imageUrl);
		for (const ext of ['png', 'webp'])
			expect(
				new TextDecoder().decode(
					uploaded.get(restored.fill.imageUrl.slice(1).replace(/\.png$/, `.${ext}`))
				)
			).toBe(`bytes:backdrop.${ext}`);
	});
	it('keeps spacing and empty card themes when replacing from an older backup without them', async () => {
		const before = await settings();
		await restoreAppearance(db, { settings: [], images: [] }, zip, bucket, 'clobber');
		const rows = await settings();
		expect(rows['typography-theme:theme-1']).toBeUndefined();
		for (const key of [
			'spacing-theme:spacing-1',
			'spacing-active',
			'empty-card-theme:empty-1',
			'empty-card-active',
			'hover-card-theme:hover-1',
			'hover-card-active',
			'project-namecard-background'
		])
			expect(rows[key]).toEqual(before[key]);
	});
	it('merges matching IDs without deleting other themes and variants', async () => {
		const backup = await exportAppearance(db);
		await db.insert(siteSettings).values({ key: 'namecard-variant:extra', value: { id: 'extra' } });
		await restoreAppearance(db, backup, zip, bucket, 'merge');
		expect((await settings())['namecard-variant:extra']).toEqual({ id: 'extra' });
	});
	it('skip leaves settings and images untouched', async () => {
		const backup = await exportAppearance(db);
		const before = await settings();
		await restoreAppearance(db, backup, zip, bucket, 'skip');
		expect(await settings()).toEqual(before);
		expect(uploaded.size).toBe(0);
	});
	it('empty replacement resets all appearance defaults and leaves unrelated settings', async () => {
		await restoreAppearance(
			db,
			{ themeKinds: ['spacing', 'empty-card', 'hover-card', 'project-namecard'], settings: [], images: [] },
			zip,
			bucket,
			'clobber'
		);
		expect(await settings()).toEqual({ 'unrelated-secret': 'do-not-export' });
	});
	it('rejects missing images before changing any data', async () => {
		const backup = await exportAppearance(db);
		const before = await settings();
		zip.remove('images/paper.webp');
		await expect(restoreAppearance(db, backup, zip, bucket, 'clobber')).rejects.toMatchObject({
			status: 400
		});
		expect(await settings()).toEqual(before);
		expect(uploaded.size).toBe(0);
	});
	it('rejects missing active themes, foreign settings, duplicate keys and image traversal', async () => {
		const backup = await exportAppearance(db);
		expect(() =>
			validateAppearance(
				{
					...backup,
					settings: backup.settings.filter((row) => !row.key.startsWith('typography-theme:'))
				},
				zip,
				bucket
			)
		).toThrow();
		expect(() =>
			validateAppearance({ ...backup, settings: [{ key: 'secret', value: 'bad' }] }, zip, bucket)
		).toThrow();
		expect(() =>
			validateAppearance(
				{ ...backup, settings: [...backup.settings, backup.settings[0]] },
				zip,
				bucket
			)
		).toThrow();
		expect(() =>
			validateAppearance(
				{ ...backup, images: [{ key: 'artifacts/../bad.png', path: 'images/../bad.png' }] },
				zip,
				bucket
			)
		).toThrow();
	});
	it('rejects missing storage, invalid theme styles, and invalid framing', async () => {
		const backup = await exportAppearance(db);
		await expect(
			Promise.resolve().then(() => validateAppearance(backup, zip))
		).rejects.toMatchObject({
			status: 400,
			body: { message: 'Image storage is required to restore name cards.' }
		});
		const badTheme = structuredClone(backup);
		(
			badTheme.settings.find((row) => row.key.startsWith('typography-theme:'))!
				.value as typeof theme
		).roles['tile-title'].size = 900;
		expect(() => validateAppearance(badTheme, zip, bucket)).toThrow();
		const badSpacing = structuredClone(backup);
		(
			badSpacing.settings.find((row) => row.key === 'spacing-theme:spacing-1')!
				.value as typeof spacingTheme
		).values.desktop.rowGap = 999;
		expect(() => validateAppearance(badSpacing, zip, bucket)).toThrow();
		const badFill = structuredClone(backup);
		(
			badFill.settings.find((row) => row.key === 'empty-card-theme:empty-1')!
				.value as typeof emptyCardTheme
		).fill.imageUrl = 'https://evil.test/a.png';
		expect(() => validateAppearance(badFill, zip, bucket)).toThrow();
		const badHover = structuredClone(backup);
		(
			badHover.settings.find((row) => row.key === 'hover-card-theme:hover-1')!
				.value as typeof hoverCardTheme
		).angle = 90;
		expect(() => validateAppearance(badHover, zip, bucket)).toThrow();
		for (const key of ['spacing-active', 'empty-card-active', 'hover-card-active']) {
			const badActive = structuredClone(backup);
			badActive.settings.find((row) => row.key === key)!.value = 'missing';
			expect(() => validateAppearance(badActive, zip, bucket)).toThrow();
		}
		const badEffects = structuredClone(backup);
		(
			badEffects.settings.find((row) => row.key === 'empty-card-theme:empty-1')!
				.value as typeof emptyCardTheme
		).effects.blur = 500;
		expect(() => validateAppearance(badEffects, zip, bucket)).toThrow();
		const badNamecardSetting = structuredClone(backup);
		badNamecardSetting.settings.find((row) => row.key === 'project-namecard-background')!.value =
			'false';
		expect(() => validateAppearance(badNamecardSetting, zip, bucket)).toThrow();
		const badCard = structuredClone(backup);
		(badCard.settings.find((row) => row.key === 'namecard_image')!.value as typeof card).zoom = -1;
		await expect(
			Promise.resolve().then(() => validateAppearance(badCard, zip, bucket))
		).rejects.toMatchObject({ status: 400, body: { message: 'Invalid name card framing.' } });
	});
	it('storage failure keeps current settings intact', async () => {
		const backup = await exportAppearance(db);
		const before = await settings();
		const broken = {
			put: async () => {
				throw new Error('storage failure');
			}
		} as unknown as R2Bucket;
		await expect(restoreAppearance(db, backup, zip, broken, 'clobber')).rejects.toThrow(
			'storage failure'
		);
		expect(await settings()).toEqual(before);
	});
});
