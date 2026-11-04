import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { Db } from './db';
import {
	activeSpacing,
	activateSpacing,
	listSpacing,
	saveSpacing,
	validateValues
} from './spacing';
import { DEFAULT_THEME, resolveSpacing, themeCss } from '$lib/spacing';
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
describe('spacing theme lifecycle', () => {
	it('preserves original spacing until a saved theme is activated and supports restoring it', async () => {
		expect(await activeSpacing(db)).toEqual(DEFAULT_THEME);
		const saved = await saveSpacing(db, {
			name: ' Airy ',
			values: { desktop: { rowGap: 24, left: 40 }, mobile: { rowGap: 8, left: 12 } }
		});
		expect(saved.name).toBe('Airy');
		expect((await listSpacing(db)).themes).toContainEqual(saved);
		expect(await activeSpacing(db)).toEqual(DEFAULT_THEME);
		await activateSpacing(db, saved.id);
		expect(await activeSpacing(db)).toEqual(saved);
		const updated = await saveSpacing(
			db,
			{ ...saved, values: { desktop: { rowGap: 32 }, mobile: {} } },
			saved.id
		);
		expect(await activeSpacing(db)).toEqual(updated);
		await activateSpacing(db, 'default');
		expect(await activeSpacing(db)).toEqual(DEFAULT_THEME);
	});
	it('rejects invalid values, unknown IDs, and edits to the original', async () => {
		for (const value of [-1, 161, NaN, Infinity, '4', null]) {
			expect(() => validateValues({ desktop: { rowGap: value } })).toThrow();
		}
		expect(() => validateValues({ tablet: {} })).toThrow();
		expect(() => validateValues({ desktop: { bogus: 2 } })).toThrow();
		expect(() => validateValues([])).toThrow();
		await expect(saveSpacing(db, DEFAULT_THEME, 'default')).rejects.toMatchObject({ status: 400 });
		await expect(saveSpacing(db, { name: ' ', values: {} })).rejects.toMatchObject({ status: 400 });
		await expect(saveSpacing(db, DEFAULT_THEME, 'missing')).rejects.toMatchObject({ status: 404 });
		await expect(activateSpacing(db, 'missing')).rejects.toMatchObject({ status: 404 });
	});
	it('resolves independent mobile values, zero gaps, and reset defaults into scoped CSS', () => {
		const theme = {
			...DEFAULT_THEME,
			values: { desktop: { rowGap: 0, left: 40 }, mobile: { left: 8 } }
		};
		expect(resolveSpacing(theme, 'desktop')).toMatchObject({ rowGap: 0, left: 40, top: 2 });
		expect(resolveSpacing(theme, 'mobile')).toMatchObject({ rowGap: 2, left: 8 });
		expect(themeCss(theme)).toContain('@media(max-width:899px){[data-home-spacing]');
		expect(themeCss(theme)).toContain('padding:2px 2px 2px 40px');
	});
});
