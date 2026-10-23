export const FONTS = [
	'Playfair Display',
	'Cormorant Garamond',
	'DM Sans',
	'Georgia',
	'Arial'
] as const;
export type Font = (typeof FONTS)[number];
export interface TextStyle {
	font: Font;
	weight: number;
	italic: boolean;
	size: number;
	mobileSize: number;
	lineHeight: number;
	tracking: number;
	transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
	decoration: 'none' | 'underline' | 'line-through';
}
export interface RoleDefinition {
	id: string;
	label: string;
	group: string;
	parent?: string;
	defaults: Partial<TextStyle>;
}
const role = (
	id: string,
	label: string,
	group: string,
	parent: string | undefined,
	defaults: Partial<TextStyle> = {}
): RoleDefinition => ({ id, label, group, parent, defaults });
export const ROLES: RoleDefinition[] = [
	role('body', 'Body defaults', 'Foundations', undefined, {
		font: 'DM Sans',
		weight: 400,
		italic: false,
		size: 16,
		mobileSize: 16,
		lineHeight: 1.5,
		tracking: 0,
		transform: 'none',
		decoration: 'none'
	}),
	role('display', 'Display defaults', 'Foundations', 'body', {
		font: 'Cormorant Garamond',
		size: 30,
		mobileSize: 30,
		lineHeight: 1.25,
		tracking: 0.02
	}),
	role('label', 'Label defaults', 'Foundations', 'body', {
		weight: 500,
		size: 11,
		mobileSize: 11,
		tracking: 0.2,
		transform: 'uppercase'
	}),
	role('name-title', 'Shared name card title', 'Name cards', 'display', {
		font: 'Playfair Display',
		size: 44,
		mobileSize: 44,
		lineHeight: 1.05,
		tracking: 0
	}),
	role('name-subtitle', 'Shared name card subtitle', 'Name cards', 'label', {
		weight: 400,
		size: 12,
		mobileSize: 12,
		tracking: 0.32
	}),
	role('landing-title', 'Landing title', 'Name cards', 'name-title'),
	role('landing-subtitle', 'Landing subtitle', 'Name cards', 'name-subtitle'),
	role('project-card-title', 'Project card title', 'Name cards', 'name-title', {
		size: 38,
		mobileSize: 38,
		lineHeight: 1.2
	}),
	role('project-card-subtitle', 'Project card subtitle', 'Name cards', 'name-subtitle', {
		size: 11,
		mobileSize: 11
	}),
	role('expanded-title', 'Expanded card title', 'Name cards', 'name-title', {
		size: 48,
		mobileSize: 48,
		lineHeight: 1.2
	}),
	role('expanded-subtitle', 'Expanded card subtitle', 'Name cards', 'name-subtitle', {
		size: 11,
		mobileSize: 11
	}),
	role('preview-title', 'Preview image title', 'Name cards', 'name-title'),
	role('preview-subtitle', 'Preview image subtitle', 'Name cards', 'name-subtitle'),
	role('category-nav', 'Category navigation', 'Gallery', 'label', { size: 14, mobileSize: 14 }),
	role('project-list', 'Project list title', 'Gallery', 'name-title', {
		// Match the original sidebar row height and underline spacing.
		lineHeight: 1.5,
		tracking: 0,
		size: 13.6,
		mobileSize: 17.6
	}),
	role('project-list-active', 'Active project list title', 'Gallery', 'project-list', {
		weight: 500,
		size: 16.8,
		mobileSize: 21.6
	}),
	role('gallery-number', 'Gallery item number', 'Gallery', 'display', { size: 14, mobileSize: 14 }),
	role('hover-title', 'Hover title', 'Hover cards', 'display'),
	role('hover-description', 'Hover description', 'Hover cards', 'body', {
		tracking: 0.01,
		lineHeight: 1.625
	}),
	role('hover-category', 'Hover category', 'Hover cards', 'label', { size: 10, mobileSize: 10 }),
	role('hover-label', 'Hover metadata label', 'Hover cards', 'label', {
		size: 10,
		mobileSize: 10,
		weight: 400
	}),
	role('hover-value', 'Hover metadata value', 'Hover cards', 'display', {
		size: 16,
		mobileSize: 16
	}),
	role('tile-title', 'Neighbor tile title', 'Hover cards', 'hover-title', {
		size: 30,
		mobileSize: 17.6
	}),
	role('tile-description', 'Neighbor tile description', 'Hover cards', 'hover-description', {
		size: 13,
		mobileSize: 10.4
	}),
	role('tile-category', 'Neighbor tile category', 'Hover cards', 'hover-category', {
		size: 10,
		mobileSize: 8
	}),
	role('tile-label', 'Neighbor tile metadata label', 'Hover cards', 'hover-label', {
		size: 11,
		mobileSize: 8
	}),
	role('tile-value', 'Neighbor tile metadata value', 'Hover cards', 'hover-value', {
		size: 16,
		mobileSize: 11.2
	}),
	role('project-title', 'Project title', 'Project header', 'hover-title'),
	role('project-category', 'Project category', 'Project header', 'hover-category'),
	role('project-intro', 'Project introduction', 'Project header', 'hover-description', {
		size: 14,
		mobileSize: 14,
		lineHeight: 2
	}),
	role('project-label', 'Project metadata label', 'Project header', 'hover-label', {
		size: 11,
		mobileSize: 11
	}),
	role('project-value', 'Project metadata value', 'Project header', 'hover-value'),
	role('section-title', 'Section title', 'Project content', 'display', {
		font: 'Georgia',
		size: 20,
		mobileSize: 20
	}),
	role('section-subtitle', 'Section subtitle', 'Project content', 'body', {
		size: 14,
		mobileSize: 14,
		weight: 300,
		tracking: 0.02
	}),
	role('narrative', 'Narrative text', 'Project content', 'display', {
		size: 18,
		mobileSize: 18,
		lineHeight: 1.625,
		tracking: 0.01
	}),
	role('narrative-emphasis', 'Narrative emphasis', 'Project content', 'narrative', {
		italic: true
	}),
	role('caption', 'Image caption', 'Project content', 'body', { size: 12, mobileSize: 12 }),
	role('social', 'Social links', 'Navigation', 'label'),
	role('expanded-social', 'Expanded social links', 'Navigation', 'social', {
		size: 14,
		mobileSize: 14,
		tracking: 0.18
	}),
	role('previous-next-label', 'Previous / next label', 'Navigation', 'label', {
		size: 10,
		mobileSize: 10
	}),
	role('previous-next-title', 'Previous / next project title', 'Navigation', 'display', {
		size: 20,
		mobileSize: 20
	}),
	role('counter', 'Position counter', 'Navigation', 'label', {
		size: 10,
		mobileSize: 10,
		weight: 400
	}),
	role('scroll-hint', 'Scroll hint', 'Navigation', 'label', {
		size: 12,
		mobileSize: 12,
		weight: 400
	}),
	role('status', 'Status and empty text', 'Supporting text', 'body', { size: 14, mobileSize: 14 })
];
export interface TypographyTheme {
	id: string;
	name: string;
	updatedAt: string;
	roles: Record<string, Partial<TextStyle>>;
}
export const DEFAULT_THEME: TypographyTheme = {
	id: 'default',
	name: 'Original typography',
	updatedAt: '1',
	roles: {}
};
export function resolveRole(theme: TypographyTheme, id: string): TextStyle {
	const definition = ROLES.find((item) => item.id === id);
	if (!definition) throw new Error('Unknown typography role');
	return {
		...(definition.parent ? resolveRole(theme, definition.parent) : {}),
		...definition.defaults,
		...theme.roles[id]
	} as TextStyle;
}
export function fontStack(font: Font) {
	return `"${font}", ${font === 'DM Sans' || font === 'Arial' ? 'sans-serif' : 'serif'}`;
}
export function textStyleCss(style: TextStyle, mobile = false, important = false) {
	const suffix = important ? ' !important' : '';
	const properties = {
		'font-family': fontStack(style.font),
		'font-weight': style.weight,
		'font-style': style.italic ? 'italic' : 'normal',
		'font-size': `calc(${mobile ? style.mobileSize : style.size}px * var(--typo-scale, 1))`,
		'line-height': style.lineHeight,
		'letter-spacing': `${style.tracking}em`,
		'text-transform': style.transform,
		'text-decoration': style.decoration
	};
	return Object.entries(properties)
		.map(([key, value]) => `${key}:${value}${suffix}`)
		.join(';');
}
export function themeCss(theme: TypographyTheme) {
	const sidebarRoles = new Set(['project-list', 'project-list-active']);
	const rules = (roles: RoleDefinition[], mobile: boolean) =>
		roles
			.map(
				(role) =>
					`[data-typo="${role.id}"]{${textStyleCss(resolveRole(theme, role.id), mobile, true)}}`
			)
			.join('\n');
	// The sidebar switches to its compact layout at lg (1024px), independently
	// of the general text breakpoint. Keep its original larger type below lg.
	return `${rules(ROLES, false)}\n@media(max-width:767px){${rules(
		ROLES.filter((role) => !sidebarRoles.has(role.id)),
		true
	)}}\n@media(max-width:1023px){${rules(
		ROLES.filter((role) => sidebarRoles.has(role.id)),
		true
	)}}`;
}

export const FONT_STYLESHEET =
	'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap';
export type TypographyContext = 'landing' | 'project' | 'preview';
export interface TypographySnapshot {
	themeId: string;
	themeName: string;
	revision: string;
	context: TypographyContext;
	title: TextStyle;
	subtitle: TextStyle;
}
export function snapshotTypography(
	theme: TypographyTheme,
	context: TypographyContext
): TypographySnapshot {
	const prefix = context === 'project' ? 'project-card' : context;
	return {
		themeId: theme.id,
		themeName: theme.name,
		revision: theme.updatedAt,
		context,
		title: resolveRole(theme, `${prefix}-title`),
		subtitle: resolveRole(theme, `${prefix}-subtitle`)
	};
}
