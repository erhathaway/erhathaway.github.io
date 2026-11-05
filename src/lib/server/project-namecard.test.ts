import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { Db } from './db';
import { projectNamecardBackground, setProjectNamecardBackground } from './project-namecard';
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
describe('project name card background', () => {
	it('is on by default, including without a database', async () => {
		expect(await projectNamecardBackground(db)).toBe(true);
		expect(await projectNamecardBackground(null)).toBe(true);
	});
	it('can be turned off and back on', async () => {
		expect(await setProjectNamecardBackground(db, false)).toEqual({ showBackground: false });
		expect(await projectNamecardBackground(db)).toBe(false);
		await setProjectNamecardBackground(db, true);
		expect(await projectNamecardBackground(db)).toBe(true);
	});
	it('rejects anything other than true or false', async () => {
		for (const value of ['false', 0, null, undefined, {}])
			await expect(setProjectNamecardBackground(db, value)).rejects.toMatchObject({ status: 400 });
		expect(await projectNamecardBackground(db)).toBe(true);
	});
});
