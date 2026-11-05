export type HoverCardShape = 'partial' | 'full';
export type HoverCardSide = 'left' | 'right';
export type HoverCardScreen = 'desktop' | 'mobile';
/** Matches where the home gallery changes from three columns to two. */
export const MOBILE_MAX_WIDTH = 899;
export interface HoverCardTheme {
	id: string;
	name: string;
	updatedAt: string;
	/** Used at desktop widths, and on mobile too unless mobileShape is set. */
	shape: HoverCardShape;
	mobileShape?: HoverCardShape;
	/** Percent of the card covered at mid-height. Partial shape only. */
	width: number;
	/** Degrees the inner edge leans from vertical. Partial shape only. */
	angle: number;
}
export const WIDTH_RANGE = { min: 30, max: 90, default: 52 };
export const ANGLE_RANGE = { min: -25, max: 25, default: 9 };
export const DEFAULT_THEME: HoverCardTheme = {
	id: 'default',
	name: 'Angled partial',
	updatedAt: '1',
	shape: 'partial',
	width: WIDTH_RANGE.default,
	angle: ANGLE_RANGE.default
};
export function shapeForScreen(theme: HoverCardTheme, screen: HoverCardScreen): HoverCardShape {
	return screen === 'mobile' ? (theme.mobileShape ?? theme.shape) : theme.shape;
}
/** How far the edge moves from mid-height to the top or bottom, in container query height units. */
function edgeOffset(angle: number) {
	return Math.round(Math.tan((angle * Math.PI) / 180) * 50 * 100) / 100;
}
/** Uses height units so an angle looks the same on square and wide cards. */
export function panelClipPath(
	theme: HoverCardTheme,
	side: HoverCardSide,
	screen: HoverCardScreen = 'desktop'
): string | undefined {
	if (shapeForScreen(theme, screen) === 'full') return undefined;
	const offset = edgeOffset(theme.angle);
	return side === 'right'
		? `polygon(calc(${100 - theme.width}% - ${offset}cqh) 0%, 100% 0%, 100% 100%, calc(${100 - theme.width}% + ${offset}cqh) 100%)`
		: `polygon(0% 0%, calc(${theme.width}% + ${offset}cqh) 0%, calc(${theme.width}% - ${offset}cqh) 100%, 0% 100%)`;
}
/** Keeps the text inside the panel's narrowest point. */
export function panelTextWidth(theme: HoverCardTheme, screen: HoverCardScreen = 'desktop'): string {
	if (shapeForScreen(theme, screen) === 'full') return 'min(420px, 80%)';
	return `min(240px, calc(${theme.width - 4}% - ${Math.abs(edgeOffset(theme.angle))}cqh))`;
}
