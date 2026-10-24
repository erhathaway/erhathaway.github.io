import { expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { inArray } from 'drizzle-orm';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { getDb } from './db';
import { siteSettings } from './db/schema';
import { isAppearanceKey, exportAppearance } from './appearance-backup';
import { POST as exportRoute } from '../../routes/api/admin/export/+server';
import { POST as importRoute } from '../../routes/api/admin/import/+server';
import { saveTypography, activateTypography, activeTypography } from './typography';
import {
	saveNamecardVariant,
	promoteNamecardVariant,
	listNamecardVariants
} from './namecard-variants';
import { NAMECARD_DEFAULTS } from '$lib/utils/namecard';
import { snapshotTypography } from '$lib/typography';
import type { ExportManifest } from '$lib/types/export-manifest';

// Explicit opt-in: this temporarily replaces LOCAL dev appearance data, then
// restores the exact original rows and removes every test-created R2 object.
it.skipIf(process.env.RUN_DEV_BACKUP_RESTORE !== '1')(
	'round-trips real dev D1/R2 through ZIP export and import handlers',
	async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; ARTIFACTS: R2Bucket }>({
			configPath: 'wrangler.toml',
			persist: { path: '.wrangler/state/v3' }
		});
		const db = getDb(proxy.env.DB);
		const bucket = proxy.env.ARTIFACTS;
		const original = (await db.select().from(siteSettings)).filter((row) =>
			isAppearanceKey(row.key)
		);
		const unrelated = (await db.select().from(siteSettings)).filter(
			(row) => !isAppearanceKey(row.key)
		);
		const directory = await mkdtemp(join(tmpdir(), 'portfolio-backup-restore-'));
		await writeFile(join(directory, 'original-appearance.json'), JSON.stringify(original, null, 2));
		const written: string[] = [];
		const recordingBucket = new Proxy(bucket, {
			get(target, key) {
				if (key === 'put')
					return async (...args: Parameters<R2Bucket['put']>) => {
						written.push(args[0]);
						return target.put(...args);
					};
				const value = Reflect.get(target, key);
				return typeof value === 'function' ? value.bind(target) : value;
			}
		});
		const context = { locals: { db }, platform: { env: { ARTIFACTS: recordingBucket } } };
		async function exportZip() {
			const response = await exportRoute({
				...context,
				request: new Request('http://localhost/api/admin/export', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						projectNames: ['__backup_test_no_projects__'],
						categoryNames: ['__backup_test_no_categories__']
					})
				})
			} as never);
			return new Uint8Array(await response.arrayBuffer());
		}
		async function restoreZip(bytes: Uint8Array, appearanceResolution = 'clobber') {
			const form = new FormData();
			form.set(
				'file',
				new File([new Uint8Array(bytes)], 'backup.zip', { type: 'application/zip' })
			);
			form.set(
				'conflicts',
				JSON.stringify({
					defaultResolution: 'skip',
					perProject: {},
					perCategory: {},
					appearanceResolution
				})
			);
			const response = await importRoute({
				...context,
				request: new Request('http://localhost/api/admin/import', { method: 'POST', body: form })
			} as never);
			return response.json();
		}
		try {
			// Exercise the user's actual saved settings and media as well as complete fixtures.
			const beforeArchive = await exportZip();
			await writeFile(join(directory, 'original-appearance.zip'), beforeArchive);
			const theme = await saveTypography(db, {
				name: 'Backup round-trip fixture',
				roles: {
					'tile-title': { size: 39, weight: 600 },
					'project-title': { font: 'Georgia', size: 45 }
				}
			});
			await activateTypography(db, theme.id);
			const stem = `artifacts/backup-fixture-${crypto.randomUUID()}`;
			for (const ext of ['png', 'webp', 'avif'])
				await recordingBucket.put(
					`${stem}.${ext}`,
					new TextEncoder().encode(`fixture-image-${ext}`),
					{ httpMetadata: { contentType: `image/${ext}` } }
				);
			const backgroundKey = `artifacts/backup-background-${crypto.randomUUID()}.png`;
			await recordingBucket.put(backgroundKey, new TextEncoder().encode('fixture-background'), {
				httpMetadata: { contentType: 'image/png' }
			});
			const variant = await saveNamecardVariant(db, {
				name: 'Backup card fixture',
				imageUrl: `/${stem}.png`,
				imageFormats: ['webp', 'avif'],
				positionX: 31,
				positionY: 72,
				zoom: 1.3,
				recipe: {
					version: 1,
					design: {
						...NAMECARD_DEFAULTS,
						gradient: 'linear',
						gradientAngle: 42,
						typography: snapshotTypography(theme, 'landing')
					},
					background: { imageUrl: `/${backgroundKey}` }
				}
			});
			for (const target of ['landing', 'project', 'preview'])
				await promoteNamecardVariant(db, variant.id, target);
			const snapshot = await exportAppearance(db);
			const archive = await exportZip();
			await writeFile(join(directory, 'round-trip.zip'), archive);
			const zip = await JSZip.loadAsync(archive);
			const manifest = JSON.parse(
				await zip.file('manifest-with-hashes.json')!.async('text')
			) as ExportManifest;
			expect(manifest.version).toBe(2);
			expect(manifest.appearance).toEqual(snapshot);
			const hashes = new Map<string, string>();
			for (const image of snapshot.images) {
				const bytes = await zip.file(image.path)!.async('uint8array');
				hashes.set(image.key, Buffer.from(bytes).toString('base64'));
			}
			// Remove all saved appearance to demonstrate a genuine restore, then add an extra entry.
			await db.delete(siteSettings).where(
				inArray(
					siteSettings.key,
					snapshot.settings.map((row) => row.key)
				)
			);
			await saveTypography(db, { name: 'Must disappear on replace', roles: {} });
			const result = await restoreZip(archive);
			expect(result.success).toBe(true);
			expect(result.summary.appearanceSettingsRestored).toBe(snapshot.settings.length);
			expect((await activeTypography(db)).id).toBe(theme.id);
			const restored = await exportAppearance(db);
			const restoredRows = new Map(restored.settings.map((row) => [row.key, row.value]));
			// Compare every field recursively; only image URLs may change, and their bytes must match.
			async function compare(old: unknown, actual: unknown): Promise<void> {
				if (old && typeof old === 'object') {
					expect(Object.keys(actual as object).sort()).toEqual(Object.keys(old).sort());
					for (const [key, value] of Object.entries(old)) {
						const next = (actual as Record<string, unknown>)[key];
						if (key === 'imageUrl' && typeof value === 'string') {
							const oldKey = value.startsWith('/')
								? value.slice(1)
								: new URL(value).pathname.slice(1);
							const newKey = String(next).slice(1);
							const obj = await bucket.get(newKey);
							expect(obj).not.toBeNull();
							expect(Buffer.from(await obj!.arrayBuffer()).toString('base64')).toBe(
								hashes.get(oldKey)
							);
							for (const format of (old as { imageFormats?: string[] }).imageFormats ?? []) {
								const formatted = await bucket.get(newKey.replace(/\.[^.]+$/, `.${format}`));
								expect(formatted).not.toBeNull();
								expect(Buffer.from(await formatted!.arrayBuffer()).toString('base64')).toBe(
									hashes.get(oldKey.replace(/\.[^.]+$/, `.${format}`))
								);
							}
						} else await compare(value, next);
					}
				} else expect(actual).toEqual(old);
			}
			expect(restored.settings.length).toBe(snapshot.settings.length);
			for (const row of snapshot.settings) await compare(row.value, restoredRows.get(row.key));
			const savedVariant = (await listNamecardVariants(db)).find((card) => card.id === variant.id)!;
			for (const key of ['namecard_image', 'project_namecard_image', 'preview_namecard_image'])
				expect((restoredRows.get(key) as { imageUrl: string }).imageUrl).toBe(
					savedVariant.imageUrl
				);
			// A second restore is stable (no duplicate themes or variants).
			await restoreZip(archive);
			expect((await exportAppearance(db)).settings.length).toBe(snapshot.settings.length);
			const beforeSkip = await exportAppearance(db);
			await restoreZip(archive, 'skip');
			expect(await exportAppearance(db)).toEqual(beforeSkip);
			// Legacy archives still restore the two older destination fields.
			const legacy = new JSZip();
			legacy.file(
				'manifest.json',
				JSON.stringify({
					version: 1,
					exportedAt: new Date().toISOString(),
					categories: [],
					projects: [],
					siteSettings: {
						namecardImage: {
							imageUrl: '/artifacts/legacy.png',
							positionX: 12,
							positionY: 34,
							zoom: 1.1,
							_localImagePath: 'images/legacy.png'
						}
					}
				})
			);
			legacy.file('images/legacy.png', 'legacy-bytes');
			expect((await restoreZip(await legacy.generateAsync({ type: 'uint8array' }))).success).toBe(
				true
			);
			expect((await activeTypography(db)).id).toBe(theme.id);
			// Reject incomplete archives before changing the existing database.
			zip.remove(snapshot.images[0].path);
			const beforeInvalid = await exportAppearance(db);
			await expect(
				restoreZip(await zip.generateAsync({ type: 'uint8array' }))
			).rejects.toMatchObject({ status: 400 });
			expect(await exportAppearance(db)).toEqual(beforeInvalid);
			// Missing source images must fail export rather than produce a partial backup.
			await saveNamecardVariant(db, {
				name: 'Missing image fixture',
				imageUrl: '/artifacts/backup-missing-source.png',
				positionX: 50,
				positionY: 50,
				zoom: 1
			});
			await expect(exportZip()).rejects.toThrow('Backup image is missing');
			// Restore the actual original dev backup using the same import path.
			expect((await restoreZip(beforeArchive)).success).toBe(true);
			expect((await exportAppearance(db)).settings.map((row) => row.key).sort()).toEqual(
				original.map((row) => row.key).sort()
			);
			expect(
				(await db.select().from(siteSettings)).filter((row) => !isAppearanceKey(row.key))
			).toEqual(unrelated);
			console.log(`Dev restore verified; archives retained at ${directory}`);
		} finally {
			const current = (await db.select().from(siteSettings)).filter((row) =>
				isAppearanceKey(row.key)
			);
			const writes = original.map((row) => db.insert(siteSettings).values(row));
			await db.batch([
				db.delete(siteSettings).where(
					inArray(
						siteSettings.key,
						current.map((row) => row.key)
					)
				),
				...writes
			]);
			for (const key of written) await bucket.delete(key);
			await proxy.dispose();
		}
	},
	120000
);
