import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { Db } from './db';
import {
	activateEmptyCard,
	activeEmptyCard,
	listEmptyCard,
	saveEmptyCard,
	validateEffects,
	validateFill
} from './empty-card';
import { DEFAULT_THEME, effectStyles, fillBackground } from '$lib/empty-card';
let client: Client;
let db: Db;
beforeEach(async () => {
	client = createClient({ url: ':memory:' });
	await client.execute(
		'CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'
	);
	db = drizzle(client) as unknown as Db;
});
afterEach(() => client.close());
describe('empty card themes', () => {
	it('stays blank until a saved theme is activated and supports restoring it', async () => {
		expect(await activeEmptyCard(db)).toEqual(DEFAULT_THEME);
		expect(await activeEmptyCard(null)).toEqual(DEFAULT_THEME);
		const saved = await saveEmptyCard(db, {
			name: ' Copper ',
			fill: { type: 'color', color: '#b87333' }
		});
		expect(saved.name).toBe('Copper');
		expect((await listEmptyCard(db)).themes).toContainEqual(saved);
		expect(await activeEmptyCard(db)).toEqual(DEFAULT_THEME);
		await activateEmptyCard(db, saved.id);
		expect(await activeEmptyCard(db)).toEqual(saved);
		const updated = await saveEmptyCard(
			db,
			{ ...saved, fill: { type: 'gradient', from: '#000000', to: '#ffffff', angle: 90 } },
			saved.id
		);
		expect(await activeEmptyCard(db)).toEqual(updated);
		await activateEmptyCard(db, 'default');
		expect(await activeEmptyCard(db)).toEqual(DEFAULT_THEME);
	});
	it('accepts every fill type and drops unknown fields', () => {
		expect(validateFill({ type: 'blank', color: '#000000' })).toEqual({ type: 'blank' });
		expect(fillBackground(validateFill({ type: 'color', color: '#AABBCC' }))).toBe('#AABBCC');
		expect(
			fillBackground(validateFill({ type: 'gradient', from: '#000000', to: '#ffffff', angle: 45 }))
		).toBe('linear-gradient(45deg, #000000, #ffffff)');
		expect(
			validateFill({
				type: 'image',
				imageUrl: '/artifacts/abc-123.avif',
				imageFormats: ['avif', 'webp'],
				positionX: 0,
				positionY: 100,
				extra: true
			})
		).toEqual({
			type: 'image',
			imageUrl: '/artifacts/abc-123.avif',
			imageFormats: ['avif', 'webp'],
			positionX: 0,
			positionY: 100
		});
	});
	it('saves effects, omits them when unset, and turns them into styles', async () => {
		const color = { type: 'color', color: '#b87333' };
		const effects = { blur: 10, transparency: 25, fade: 40, wash: 50 };
		const saved = await saveEmptyCard(db, { name: 'Soft', fill: color, effects });
		expect(saved.effects).toEqual(effects);
		const cleared = await saveEmptyCard(db, { name: 'Soft', fill: color, effects: {} }, saved.id);
		expect(cleared).not.toHaveProperty('effects');
		expect(effectStyles()).toEqual({
			opacity: undefined,
			mask: undefined,
			filter: undefined,
			inset: undefined,
			washOpacity: undefined
		});
		expect(effectStyles(effects)).toEqual({
			opacity: '0.75',
			mask: 'linear-gradient(to right, black 60%, transparent 100%)',
			filter: 'blur(10px) saturate(0.75)',
			inset: '-20px',
			washOpacity: '0.5'
		});
	});
	it('rejects invalid effects', () => {
		expect(validateEffects(undefined)).toEqual({});
		for (const effects of [
			null,
			[],
			{ glow: 1 },
			{ blur: 41 },
			{ blur: -1 },
			{ fade: 101 },
			{ wash: '50' },
			{ transparency: NaN }
		])
			expect(() => validateEffects(effects)).toThrow();
	});
	it('rejects unsafe or invalid fills, unknown IDs, and edits to the default', async () => {
		const image = { type: 'image', imageUrl: '/artifacts/a.png', positionX: 50, positionY: 50 };
		for (const fill of [
			null,
			[],
			{ type: 'video' },
			{ type: 'color', color: 'red' },
			{ type: 'color', color: '#000;background:url(https://evil.test)' },
			{ type: 'gradient', from: '#000000', to: '#ffffff', angle: 361 },
			{ type: 'gradient', from: '#000000', to: '#ffffff', angle: NaN },
			{ ...image, imageUrl: 'https://evil.test/a.png' },
			{ ...image, imageUrl: '/artifacts/../secret.png' },
			{ ...image, imageUrl: '/artifacts/a.bin' },
			{ ...image, imageUrl: 'javascript:alert(1)' },
			{ ...image, imageFormats: ['svg'] },
			{ ...image, positionX: 101 },
			{ ...image, positionY: '50' }
		]) {
			expect(() => validateFill(fill)).toThrow();
		}
		const blank = { name: 'x', fill: { type: 'blank' } };
		await expect(saveEmptyCard(db, blank, 'default')).rejects.toMatchObject({ status: 400 });
		await expect(saveEmptyCard(db, { ...blank, name: ' ' })).rejects.toMatchObject({ status: 400 });
		await expect(saveEmptyCard(db, blank, 'missing')).rejects.toMatchObject({ status: 404 });
		await expect(activateEmptyCard(db, 'missing')).rejects.toMatchObject({ status: 404 });
	});
});
