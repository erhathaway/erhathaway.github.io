import { error } from '@sveltejs/kit';
import { eq, inArray, like, or } from 'drizzle-orm';
import type { Db } from './db';
import { siteSettings } from './db/schema';
import type { NamecardImageSetting, NamecardVariant } from '$lib/types/site-settings';
import { validateNamecardRecipe } from './namecard-recipe';

export const NAMECARD_VARIANT_PREFIX = 'namecard-variant:';
const activeKeys = {
	landing: 'namecard_image',
	project: 'project_namecard_image',
	preview: 'preview_namecard_image'
} as const;

export async function listNamecardVariants(db: Db): Promise<NamecardVariant[]> {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(like(siteSettings.key, `${NAMECARD_VARIANT_PREFIX}%`));
	return rows
		.map((row) => row.value as NamecardVariant)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export async function saveNamecardVariant(
	db: Db,
	input: unknown,
	existingId?: string
): Promise<NamecardVariant> {
	if (!input || typeof input !== 'object') throw error(400, 'A name card is required.');
	const body = input as Record<string, unknown>;
	if (body.name != null && (typeof body.name !== 'string' || body.name.trim().length > 100)) {
		throw error(400, 'Variant names must be text with at most 100 characters.');
	}
	if (
		typeof body.imageUrl !== 'string' ||
		!/^\/artifacts\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp|avif|gif)$/i.test(body.imageUrl)
	) {
		throw error(400, 'Choose an uploaded name card image.');
	}
	function number(key: string, fallback: number, min: number, max: number) {
		const value = body[key] ?? fallback;
		if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
			throw error(400, `Invalid ${key}.`);
		}
		return value;
	}
	if (
		body.imageFormats !== undefined &&
		(!Array.isArray(body.imageFormats) ||
			body.imageFormats.some((format) => !['avif', 'webp'].includes(format)))
	) {
		throw error(400, 'Invalid image formats.');
	}
	let existing: NamecardVariant | undefined;
	if (existingId) {
		const [row] = await db
			.select()
			.from(siteSettings)
			.where(eq(siteSettings.key, `${NAMECARD_VARIANT_PREFIX}${existingId}`));
		if (!row) throw error(404, 'Name card variant not found.');
		existing = row.value as NamecardVariant;
	}
	const id = existing?.id ?? crypto.randomUUID();
	const createdAt = existing?.createdAt ?? new Date().toISOString();
	const recipe = validateNamecardRecipe(body.recipe);
	const variant: NamecardVariant = {
		id,
		name:
			(typeof body.name === 'string' ? body.name.trim() : '') ||
			`Name card ${createdAt.slice(0, 10)} · ${id.slice(0, 8)}`,
		createdAt,
		...(recipe ? { recipe } : {}),
		imageUrl: body.imageUrl,
		positionX: number('positionX', 50, 0, 100),
		positionY: number('positionY', 50, 0, 100),
		zoom: number('zoom', 1, 0.5, 2),
		...(body.imageFormats ? { imageFormats: body.imageFormats as string[] } : {})
	};
	const key = `${NAMECARD_VARIANT_PREFIX}${variant.id}`;
	if (existing) {
		await db
			.update(siteSettings)
			.set({ value: variant, updatedAt: new Date().toISOString() })
			.where(eq(siteSettings.key, key));
	} else {
		await db.insert(siteSettings).values({ key, value: variant });
	}
	return variant;
}

export async function promoteNamecardVariant(
	db: Db,
	id: string,
	target: unknown
): Promise<NamecardImageSetting> {
	if (target !== 'landing' && target !== 'project' && target !== 'preview')
		throw error(400, 'Choose landing, project, or preview.');
	const [row] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, `${NAMECARD_VARIANT_PREFIX}${id}`));
	if (!row) throw error(404, 'Name card variant not found.');
	const variant = row.value as NamecardVariant;
	const setting: NamecardImageSetting = {
		imageUrl: variant.imageUrl,
		positionX: variant.positionX,
		positionY: variant.positionY,
		zoom: variant.zoom,
		...(variant.imageFormats?.length ? { imageFormats: variant.imageFormats } : {})
	};
	// One upsert prevents a momentary missing live card during promotion.
	await db
		.insert(siteSettings)
		.values({ key: activeKeys[target], value: setting })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value: setting, updatedAt: new Date().toISOString() }
		});
	return setting;
}

// Include variants in image-library attribution and deletion protection.
export async function getNamecardImageReferences(db: Db) {
	const rows = await db
		.select()
		.from(siteSettings)
		.where(
			or(
				inArray(siteSettings.key, Object.values(activeKeys)),
				like(siteSettings.key, `${NAMECARD_VARIANT_PREFIX}%`)
			)
		);
	return rows.flatMap((row) => {
		const background = (row.value as NamecardVariant).recipe?.background;
		return [
			{
				key: row.key,
				label:
					row.key === activeKeys.landing
						? 'Namecard (Landing)'
						: row.key === activeKeys.project
							? 'Namecard (Project)'
							: row.key === activeKeys.preview
								? 'Namecard (Preview)'
								: `Namecard variant: ${(row.value as NamecardVariant).name}`,
				value: row.value as NamecardImageSetting
			},
			...(background
				? [
						{
							key: row.key,
							label: `Namecard background: ${(row.value as NamecardVariant).name}`,
							value: { ...background, positionX: 50, positionY: 50, zoom: 1 }
						}
					]
				: [])
		];
	});
}

export async function removeNamecardVariant(db: Db, id: string): Promise<void> {
	const key = `${NAMECARD_VARIANT_PREFIX}${id}`;
	const [row] = await db
		.select({ key: siteSettings.key })
		.from(siteSettings)
		.where(eq(siteSettings.key, key));
	if (!row) throw error(404, 'Name card variant not found.');
	// Active cards contain their own image/framing snapshot. Keep those settings
	// and the stored images intact when removing an entry from the variant library.
	await db.delete(siteSettings).where(eq(siteSettings.key, key));
}
