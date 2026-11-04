export const FIELDS = [
	{ id: 'rowGap', label: 'Space between rows' },
	{ id: 'columnGap', label: 'Space between columns' },
	{ id: 'top', label: 'Top margin' },
	{ id: 'right', label: 'Right margin' },
	{ id: 'bottom', label: 'Bottom margin' },
	{ id: 'left', label: 'Left margin' }
] as const;
export type SpacingField = (typeof FIELDS)[number]['id'];
export type SpacingValues = Record<SpacingField, number>;
export type Viewport = 'desktop' | 'mobile';
export interface SpacingTheme {
	id: string;
	name: string;
	updatedAt: string;
	values: Record<Viewport, Partial<SpacingValues>>;
}
export const DEFAULT_VALUES: SpacingValues = {
	rowGap: 2,
	columnGap: 2,
	top: 2,
	right: 2,
	bottom: 2,
	left: 2
};
export const DEFAULT_THEME: SpacingTheme = {
	id: 'default',
	name: 'Original spacing',
	updatedAt: '1',
	values: { desktop: {}, mobile: {} }
};
export function resolveSpacing(theme: SpacingTheme, viewport: Viewport): SpacingValues {
	return { ...DEFAULT_VALUES, ...theme.values[viewport] };
}
export function spacingStyle(values: SpacingValues) {
	return `row-gap:${values.rowGap}px;column-gap:${values.columnGap}px;padding:${values.top}px ${values.right}px ${values.bottom}px ${values.left}px`;
}
export function themeCss(theme: SpacingTheme) {
	return `[data-home-spacing]{${spacingStyle(resolveSpacing(theme, 'desktop'))}}@media(max-width:899px){[data-home-spacing]{${spacingStyle(resolveSpacing(theme, 'mobile'))}}}`;
}
