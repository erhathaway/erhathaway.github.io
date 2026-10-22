export interface NamecardDesign {
	title: string;
	subtitle: string;
	titleSize: number;
	titleLineHeight: number;
	subtitleSize: number;
	subtitleLetterSpacing: number;
	titleGap: number;
	subtitleGap: number;
	dividerWidth: number;
	backgroundColor: string;
	divider: boolean;
	textColor: string;
	darkness: number;
	positionX: number;
	positionY: number;
	zoom: number;
	alignment: 'left' | 'center';
	textPositionY: number;
}

export const NAMECARD_DEFAULTS: Readonly<NamecardDesign> = {
	title: 'Ethan\nHathaway',
	subtitle: 'THINGS I MAKE',
	titleSize: 156,
	titleLineHeight: 0.98,
	subtitleSize: 44,
	subtitleLetterSpacing: 10,
	titleGap: 64,
	subtitleGap: 52,
	dividerWidth: 136,
	backgroundColor: '#f8f3e9',
	divider: true,
	textColor: '#705638',
	darkness: 0,
	positionX: 50,
	positionY: 50,
	zoom: 1,
	alignment: 'center',
	textPositionY: 52
};

const SIZE = 1200;

// Preview and export share this renderer so their typography and crop match.
export async function renderNamecard(image: HTMLImageElement | null, design: NamecardDesign) {
	await document.fonts.ready;
	await Promise.all([
		document.fonts.load('400 132px "Playfair Display"'),
		document.fonts.load('400 36px "DM Sans"')
	]);
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = SIZE;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Your browser could not create the name card preview.');

	ctx.fillStyle = design.backgroundColor;
	ctx.fillRect(0, 0, SIZE, SIZE);
	if (image) {
		const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight) * design.zoom;
		const width = image.naturalWidth * scale;
		const height = image.naturalHeight * scale;
		ctx.drawImage(
			image,
			((SIZE - width) * design.positionX) / 100,
			((SIZE - height) * design.positionY) / 100,
			width,
			height
		);
	}
	ctx.fillStyle = `rgba(0, 0, 0, ${design.darkness / 100})`;
	ctx.fillRect(0, 0, SIZE, SIZE);

	function measure(text: string, spacing: number) {
		if (!spacing) return ctx!.measureText(text).width;
		const characters = Array.from(text);
		return (
			characters.reduce((sum, character) => sum + ctx!.measureText(character).width, 0) +
			Math.max(0, characters.length - 1) * spacing
		);
	}

	function wrap(text: string, maxWidth: number, spacing = 0): string[] {
		return text.split('\n').flatMap((paragraph) => {
			const lines: string[] = [];
			let line = '';
			for (const word of paragraph.trim().split(/\s+/)) {
				if (line && measure(`${line} ${word}`, spacing) > maxWidth) {
					lines.push(line);
					line = '';
				}
				// Split long words as well as wrapping at spaces.
				for (const character of (line ? ' ' : '') + word) {
					if (line && measure(line + character, spacing) > maxWidth) {
						lines.push(line);
						line = '';
					}
					line += character;
				}
			}
			lines.push(line);
			return lines;
		});
	}

	const padding = 48;
	let titleSize = design.titleSize;
	let subtitleSize = design.subtitleSize;
	let titleLines: string[] = [];
	let subtitleLines: string[] = [];
	let totalHeight = 0;
	// Fit the full text block inside the card, including explicit line breaks.
	for (let attempt = 0; attempt < 50; attempt++) {
		ctx.font = `400 ${titleSize}px "Playfair Display", Georgia, serif`;
		titleLines = wrap(design.title.trim(), SIZE - padding * 2);
		ctx.font = `400 ${subtitleSize}px "DM Sans", sans-serif`;
		subtitleLines = design.subtitle.trim()
			? wrap(design.subtitle.trim(), SIZE - padding * 2, design.subtitleLetterSpacing)
			: [];
		totalHeight =
			titleLines.length * titleSize * design.titleLineHeight +
			(subtitleLines.length
				? design.titleGap + design.subtitleGap + subtitleLines.length * subtitleSize * 1.5
				: 0);
		if (totalHeight <= SIZE - padding * 2) break;
		titleSize *= 0.94;
		subtitleSize *= 0.94;
	}
	let y = Math.max(
		padding,
		Math.min(SIZE - padding - totalHeight, (SIZE * design.textPositionY) / 100 - totalHeight / 2)
	);
	ctx.fillStyle = design.textColor;
	ctx.textBaseline = 'middle';
	ctx.textAlign = design.alignment;
	const textX = design.alignment === 'center' ? SIZE / 2 : padding;
	ctx.font = `400 ${titleSize}px "Playfair Display", Georgia, serif`;
	for (const line of titleLines) {
		ctx.fillText(line, textX, y + (titleSize * design.titleLineHeight) / 2);
		y += titleSize * design.titleLineHeight;
	}
	if (subtitleLines.length) {
		if (design.divider) {
			ctx.globalAlpha = 0.65;
			ctx.fillRect(
				design.alignment === 'center' ? (SIZE - design.dividerWidth) / 2 : padding,
				y + design.titleGap,
				design.dividerWidth,
				4
			);
			ctx.globalAlpha = 1;
		}
		y += design.titleGap + design.subtitleGap;
		ctx.font = `400 ${subtitleSize}px "DM Sans", sans-serif`;
		for (const line of subtitleLines) {
			ctx.textAlign = 'left';
			let x =
				design.alignment === 'center'
					? (SIZE - measure(line, design.subtitleLetterSpacing)) / 2
					: padding;
			for (const character of Array.from(line)) {
				ctx.fillText(character, x, y + (subtitleSize * 1.5) / 2);
				x += ctx.measureText(character).width + design.subtitleLetterSpacing;
			}
			y += subtitleSize * 1.5;
		}
	}
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Could not generate the name card.'))),
			'image/png'
		);
	});
}

export async function renderNamecardPreview(
	image: HTMLImageElement | null,
	design: NamecardDesign
) {
	const blob = await renderNamecard(image, design);
	const url = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Could not load the name card preview.'));
		reader.readAsDataURL(blob);
	});
	return { blob, url };
}
