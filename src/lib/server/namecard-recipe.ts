import { error } from '@sveltejs/kit';
import type { NamecardRecipe } from '$lib/types/site-settings';
import { NAMECARD_DEFAULTS, type NamecardDesign } from '$lib/utils/namecard';

export function validateNamecardRecipe(input: unknown): NamecardRecipe | undefined {
	if (input == null) return undefined;
	if (
		typeof input !== 'object' ||
		!('version' in input) ||
		input.version !== 1 ||
		!('design' in input) ||
		!input.design ||
		typeof input.design !== 'object'
	) {
		throw error(400, 'Invalid generator settings.');
	}
	const raw = input.design as Record<string, unknown>;
	const design: NamecardDesign = { ...NAMECARD_DEFAULTS };
	for (const [key, max] of [
		['title', 200],
		['subtitle', 300]
	] as const) {
		if (typeof raw[key] !== 'string' || raw[key].length > max)
			throw error(400, `Invalid generator ${key}.`);
		design[key] = raw[key];
	}
	for (const key of ['textColor', 'backgroundColor'] as const) {
		if (typeof raw[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw[key]))
			throw error(400, 'Invalid generator color.');
		design[key] = raw[key];
	}
	if (raw.gradient !== undefined && !['none', 'radial', 'linear'].includes(raw.gradient as string))
		throw error(400, 'Invalid gradient.');
	design.gradient = (raw.gradient ?? 'none') as NamecardDesign['gradient'];
	for (const key of ['gradientColor', 'subtitleColor'] as const) {
		if (raw[key] === undefined) continue;
		if (typeof raw[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw[key]))
			throw error(400, 'Invalid generator color.');
		design[key] = raw[key];
	}
	const optionalRanges = {
		gradientOpacity: [0, 100],
		gradientSize: [10, 150],
		gradientX: [0, 100],
		gradientY: [0, 100],
		gradientAngle: [0, 360],
		textPadding: [0, 240]
	} as const;
	for (const key of Object.keys(optionalRanges) as Array<keyof typeof optionalRanges>) {
		if (raw[key] === undefined) continue;
		const value = raw[key];
		const [min, max] = optionalRanges[key];
		if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
			throw error(400, `Invalid generator ${key}.`);
		design[key] = value;
	}
	const ranges = {
		titleSize: [72, 300],
		titleLineHeight: [0.8, 1.6],
		subtitleSize: [24, 96],
		subtitleLetterSpacing: [0, 24],
		titleGap: [0, 240],
		subtitleGap: [0, 240],
		dividerWidth: [48, 480],
		darkness: [0, 80],
		positionX: [0, 100],
		positionY: [0, 100],
		zoom: [1, 3],
		textPositionY: [20, 80]
	} as const;
	for (const key of Object.keys(ranges) as Array<keyof typeof ranges>) {
		const value = raw[key];
		const [min, max] = ranges[key];
		if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
			throw error(400, `Invalid generator ${key}.`);
		design[key] = value;
	}
	if (typeof raw.divider !== 'boolean' || (raw.alignment !== 'left' && raw.alignment !== 'center'))
		throw error(400, 'Invalid generator layout.');
	design.divider = raw.divider;
	design.alignment = raw.alignment;
	let background: NamecardRecipe['background'] = null;
	if ('background' in input && input.background != null) {
		const source = input.background as Record<string, unknown>;
		if (
			typeof source !== 'object' ||
			typeof source.imageUrl !== 'string' ||
			!/^\/artifacts\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp|avif|gif)$/i.test(source.imageUrl)
		) {
			throw error(400, 'Invalid generator background.');
		}
		if (
			source.imageFormats !== undefined &&
			(!Array.isArray(source.imageFormats) ||
				source.imageFormats.some((format) => !['avif', 'webp'].includes(format)))
		)
			throw error(400, 'Invalid background image formats.');
		background = {
			imageUrl: source.imageUrl,
			...(source.imageFormats ? { imageFormats: source.imageFormats as string[] } : {})
		};
	}
	return { version: 1, design, background };
}
