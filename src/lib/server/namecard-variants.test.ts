import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { siteSettings } from './db/schema';
import { NAMECARD_DEFAULTS } from '$lib/utils/namecard';
import {
	getNamecardImageReferences,
	removeNamecardVariant,
	listNamecardVariants,
	promoteNamecardVariant,
	saveNamecardVariant
} from './namecard-variants';

let client: Client;
let db: Db;
const original = { imageUrl: '/artifacts/original.png', positionX: 50, positionY: 50, zoom: 1 };
const input = {
	name: ' Warm paper ',
	imageUrl: '/artifacts/variant.avif',
	positionX: 23,
	positionY: 71,
	zoom: 1.4,
	imageFormats: ['avif', 'webp']
};

beforeEach(async () => {
	client = createClient({ url: ':memory:' });
	await client.execute(
		'CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'
	);
	// Both drivers execute SQLite SQL; production uses the D1 adapter.
	db = drizzle(client) as unknown as Db;
	await db.insert(siteSettings).values({ key: 'namecard_image', value: original });
});
afterEach(() => client.close());

async function active(key = 'namecard_image') {
	const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
	return row?.value;
}

describe('saved name card lifecycle', () => {
	it('saves multiple crops without changing the live image and retains them on re-read', async () => {
		const first = await saveNamecardVariant(db, input);
		const second = await saveNamecardVariant(db, { ...input, name: 'Wide crop', zoom: 0.8 });
		expect(first.id).not.toBe(second.id);
		expect(first.name).toBe('Warm paper');
		expect(await active()).toEqual(original);
		expect(await listNamecardVariants(db)).toEqual(expect.arrayContaining([first, second]));
	});

	it('promotes the exact saved crop to one target and can restore an earlier variant', async () => {
		const first = await saveNamecardVariant(db, input);
		const second = await saveNamecardVariant(db, {
			...input,
			name: 'Alternate',
			positionX: 80,
			zoom: 0.8
		});
		const promoted = await promoteNamecardVariant(db, first.id, 'project');
		expect(promoted).toEqual({
			imageUrl: input.imageUrl,
			positionX: 23,
			positionY: 71,
			zoom: 1.4,
			imageFormats: input.imageFormats
		});
		expect(await active()).toEqual(original);
		expect(await active('project_namecard_image')).toEqual(promoted);
		await promoteNamecardVariant(db, second.id, 'landing');
		expect((await active()) as object).toMatchObject({ positionX: 80, zoom: 0.8 });
		await promoteNamecardVariant(db, first.id, 'landing');
		expect(await active()).toEqual(promoted);
		expect(await listNamecardVariants(db)).toHaveLength(2);
	});

	it('keeps inactive variants in image cleanup references including their optimized formats', async () => {
		const variant = await saveNamecardVariant(db, input);
		const references = await getNamecardImageReferences(db);
		expect(references).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ value: original }),
				expect.objectContaining({ label: 'Namecard variant: Warm paper', value: variant })
			])
		);
		expect(
			references.find((ref) => ref.value.imageUrl === input.imageUrl)?.value.imageFormats
		).toEqual(['avif', 'webp']);
	});

	it.each([
		{ ...input, name: 42 },
		{ ...input, name: 'x'.repeat(101) },
		{ ...input, positionX: 101 },
		{ ...input, positionY: -1 },
		{ ...input, zoom: 0 },
		{ ...input, zoom: Infinity },
		{ ...input, imageUrl: 'https://example.com/image.png' }
	])('rejects invalid drafts without saving or changing the active card', async (draft) => {
		await expect(saveNamecardVariant(db, draft)).rejects.toMatchObject({ status: 400 });
		expect(await listNamecardVariants(db)).toEqual([]);
		expect(await active()).toEqual(original);
	});

	it.each([undefined, null, '', '   '])(
		'generates and persists a name when the supplied name is %s',
		async (name) => {
			const variant = await saveNamecardVariant(db, { ...input, name });
			expect(variant.name).toBe(
				`Name card ${variant.createdAt.slice(0, 10)} · ${variant.id.slice(0, 8)}`
			);
			expect(await listNamecardVariants(db)).toContainEqual(variant);
			expect(await active()).toEqual(original);
		}
	);

	it('retains editable generator settings and protects the original background', async () => {
		const recipe = {
			version: 1,
			design: {
				...NAMECARD_DEFAULTS,
				title: 'Custom title',
				titleGap: 120,
				positionX: 20,
				zoom: 1.8
			},
			background: { imageUrl: '/artifacts/background.avif', imageFormats: ['avif', 'webp'] }
		};
		const saved = await saveNamecardVariant(db, { ...input, recipe });
		const [reloaded] = await listNamecardVariants(db);
		expect(reloaded.recipe).toEqual(recipe);
		expect(reloaded.zoom).toBe(input.zoom);
		expect(await getNamecardImageReferences(db)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ value: expect.objectContaining(recipe.background) })
			])
		);
		const promoted = await promoteNamecardVariant(db, saved.id, 'landing');
		expect(promoted).not.toHaveProperty('recipe');
		expect(promoted.imageUrl).toBe(input.imageUrl);
	});

	it.each([
		{ version: 2, design: NAMECARD_DEFAULTS, background: null },
		{ version: 1, design: { ...NAMECARD_DEFAULTS, titleSize: -10 }, background: null },
		{ version: 1, design: { ...NAMECARD_DEFAULTS, textColor: 'invalid' }, background: null },
		{
			version: 1,
			design: NAMECARD_DEFAULTS,
			background: { imageUrl: 'https://example.com/private.png' }
		}
	])('rejects invalid generator settings', async (recipe) => {
		await expect(saveNamecardVariant(db, { ...input, recipe })).rejects.toMatchObject({
			status: 400
		});
		expect(await listNamecardVariants(db)).toEqual([]);
	});

	it('removes a saved variant while preserving active snapshots and other variants', async () => {
		const first = await saveNamecardVariant(db, input);
		const second = await saveNamecardVariant(db, { ...input, name: 'Keep this one', zoom: 0.8 });
		const promoted = await promoteNamecardVariant(db, first.id, 'landing');
		await removeNamecardVariant(db, first.id);
		expect(await listNamecardVariants(db)).toEqual([second]);
		expect(await active()).toEqual(promoted);
		await expect(removeNamecardVariant(db, first.id)).rejects.toMatchObject({ status: 404 });
		expect(await getNamecardImageReferences(db)).toEqual(expect.arrayContaining([
			expect.objectContaining({ key: 'namecard_image', value: promoted })
		]));
	});

	it('rejects missing variants and invalid destinations without replacing the active card', async () => {
		await expect(promoteNamecardVariant(db, 'missing', 'landing')).rejects.toMatchObject({
			status: 404
		});
		await expect(promoteNamecardVariant(db, 'missing', 'other')).rejects.toMatchObject({
			status: 400
		});
		expect(await active()).toEqual(original);
	});
});
