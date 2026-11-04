import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { Db } from './db';
import {
	activateHoverCard,
	activeHoverCard,
	listHoverCard,
	saveHoverCard,
	validateHoverCard
} from './hover-card';
import { DEFAULT_THEME, panelClipPath, panelTextWidth } from '$lib/hover-card';
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
const full = { name: 'Full', shape: 'full', width: 52, angle: 9 };
describe('hover card themes', () => {
	it('uses the default until a saved theme is activated and supports restoring it', async () => {
		expect(await activeHoverCard(db)).toEqual(DEFAULT_THEME);
		expect(await activeHoverCard(null)).toEqual(DEFAULT_THEME);
		const saved = await saveHoverCard(db, { ...full, name: ' Full ' });
		expect(saved.name).toBe('Full');
		expect((await listHoverCard(db)).themes).toContainEqual(saved);
		expect(await activeHoverCard(db)).toEqual(DEFAULT_THEME);
		await activateHoverCard(db, saved.id);
		expect(await activeHoverCard(db)).toEqual(saved);
		const updated = await saveHoverCard(
			db,
			{ ...saved, shape: 'partial', width: 70, angle: -15 },
			saved.id
		);
		expect(await activeHoverCard(db)).toEqual(updated);
		await activateHoverCard(db, 'default');
		expect(await activeHoverCard(db)).toEqual(DEFAULT_THEME);
	});
	it('builds the panel shape, mirroring it by side and leaning with the angle', () => {
		const theme = { ...DEFAULT_THEME, width: 50, angle: 45 };
		expect(panelClipPath(theme, 'left')).toBe(
			'polygon(0% 0%, calc(50% + 50cqh) 0%, calc(50% - 50cqh) 100%, 0% 100%)'
		);
		expect(panelClipPath(theme, 'right')).toBe(
			'polygon(calc(50% - 50cqh) 0%, 100% 0%, 100% 100%, calc(50% + 50cqh) 100%)'
		);
		expect(panelClipPath({ ...theme, angle: -45 }, 'left')).toBe(
			'polygon(0% 0%, calc(50% + -50cqh) 0%, calc(50% - -50cqh) 100%, 0% 100%)'
		);
		expect(panelClipPath({ ...theme, shape: 'full' }, 'left')).toBeUndefined();
	});
	it('keeps text inside the narrowest part of the panel for either lean', () => {
		const theme = { ...DEFAULT_THEME, width: 50, angle: 45 };
		expect(panelTextWidth(theme)).toBe('min(240px, calc(46% - 50cqh))');
		expect(panelTextWidth({ ...theme, angle: -45 })).toBe('min(240px, calc(46% - 50cqh))');
		expect(panelTextWidth({ ...theme, shape: 'full' })).toBe('min(420px, 80%)');
	});
	it('rejects invalid settings, unknown IDs, and edits to the default', async () => {
		for (const settings of [
			null,
			[],
			{ ...full, shape: 'circle' },
			{ ...full, width: 29 },
			{ ...full, width: 91 },
			{ ...full, angle: -26 },
			{ ...full, angle: 26 },
			{ ...full, angle: '9' },
			{ ...full, width: NaN }
		])
			expect(() => validateHoverCard(settings)).toThrow();
		await expect(saveHoverCard(db, full, 'default')).rejects.toMatchObject({ status: 400 });
		await expect(saveHoverCard(db, { ...full, name: ' ' })).rejects.toMatchObject({ status: 400 });
		await expect(saveHoverCard(db, full, 'missing')).rejects.toMatchObject({ status: 404 });
		await expect(activateHoverCard(db, 'missing')).rejects.toMatchObject({ status: 404 });
	});
});
