export type EmptyCardFill =
	| { type: 'blank' }
	| { type: 'color'; color: string }
	| { type: 'gradient'; from: string; to: string; angle: number }
	| { type: 'image'; imageUrl: string; imageFormats?: string[]; positionX: number; positionY: number };
export type EmptyCardFillType = EmptyCardFill['type'];
export const EFFECTS = [
	{ id: 'blur', label: 'Blur', unit: 'px', max: 40 },
	{ id: 'transparency', label: 'Transparency', unit: '%', max: 100 },
	{ id: 'fade', label: 'Fade to the right', unit: '%', max: 100 },
	{ id: 'wash', label: 'Wash out', unit: '%', max: 100 }
] as const;
export type EmptyCardEffect = (typeof EFFECTS)[number]['id'];
/** Softening applied to a card. Unset effects are off. */
export type EmptyCardEffects = Partial<Record<EmptyCardEffect, number>>;
export interface EmptyCardTheme {
	id: string;
	name: string;
	updatedAt: string;
	fill: EmptyCardFill;
	effects?: EmptyCardEffects;
}
export const DEFAULT_THEME: EmptyCardTheme = {
	id: 'default',
	name: 'Blank',
	updatedAt: '1',
	fill: { type: 'blank' }
};
export const FILL_TYPES: Array<{ id: EmptyCardFillType; label: string }> = [
	{ id: 'blank', label: 'Blank' },
	{ id: 'color', label: 'Color' },
	{ id: 'gradient', label: 'Gradient' },
	{ id: 'image', label: 'Image' }
];
/** Styles for the card's outer clip, its fill, and its wash layer. */
export function effectStyles(effects: EmptyCardEffects = {}) {
	const { blur = 0, transparency = 0, fade = 0, wash = 0 } = effects;
	const filters = [
		blur > 0 ? `blur(${blur}px)` : '',
		wash > 0 ? `saturate(${1 - wash / 200})` : ''
	].filter(Boolean);
	return {
		opacity: transparency > 0 ? String(1 - transparency / 100) : undefined,
		mask:
			fade > 0 ? `linear-gradient(to right, black ${100 - fade}%, transparent 100%)` : undefined,
		filter: filters.length ? filters.join(' ') : undefined,
		// Extends the blurred layer past the clip so its soft edges stay out of view.
		inset: blur > 0 ? `${-2 * blur}px` : undefined,
		washOpacity: wash > 0 ? String(wash / 100) : undefined
	};
}
const BLANK_BACKGROUND = 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';
export function fillBackground(fill: EmptyCardFill): string | undefined {
	switch (fill.type) {
		case 'blank':
			return BLANK_BACKGROUND;
		case 'color':
			return fill.color;
		case 'gradient':
			return `linear-gradient(${fill.angle}deg, ${fill.from}, ${fill.to})`;
		case 'image':
			return undefined;
	}
}
