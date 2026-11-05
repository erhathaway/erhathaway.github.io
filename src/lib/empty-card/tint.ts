const SAMPLE_SIZE = 32;
const TINT_SATURATION = 70;
const TINT_LIGHTNESS = 97.5;
const NEUTRAL_TINT = 'hsl(42, 50%, 98%)';
const MIN_IMAGE_SATURATION = 0.08;
const GOLDEN_HUE = 45;
const GOLDEN_PULL = 0.5;

/**
 * Finds a bright, sunny tint from RGBA pixels. Colorful pixels count most, so a neutral wall doesn't
 * drown out the wood in front of it. Only the hue comes from the image, which keeps the tint light
 * whatever the image's brightness, and warm hues lean golden.
 */
export function softTintFromPixels(pixels: ArrayLike<number>): string | null {
	let red = 0;
	let green = 0;
	let blue = 0;
	let totalWeight = 0;
	for (let i = 0; i + 3 < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
		const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
		const weight = (max - min) ** 2 + 1;
		red += pixels[i] * weight;
		green += pixels[i + 1] * weight;
		blue += pixels[i + 2] * weight;
		totalWeight += weight;
	}
	if (!totalWeight) return null;
	const [r, g, b] = [red, green, blue].map((channel) => channel / totalWeight);
	const max = Math.max(r, g, b);
	const chroma = max - Math.min(r, g, b);
	if (!max || chroma / max < MIN_IMAGE_SATURATION) return NEUTRAL_TINT;
	const sector = max === r ? (g - b) / chroma : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
	const hue = (sector * 60 + 360) % 360;
	const warmHue = hue <= 70 ? hue + (GOLDEN_HUE - hue) * GOLDEN_PULL : hue;
	return `hsl(${Math.round(warmHue)}, ${TINT_SATURATION}%, ${TINT_LIGHTNESS}%)`;
}

const cache = new Map<string, Promise<string | null>>();

/** Resolves to null when the image can't be read, so the page simply goes untinted. */
export function softTintFromImage(url: string): Promise<string | null> {
	let tint = cache.get(url);
	if (!tint) {
		tint = new Promise((resolve) => {
			const image = new Image();
			image.onerror = () => resolve(null);
			image.onload = () => {
				try {
					const canvas = document.createElement('canvas');
					canvas.width = canvas.height = SAMPLE_SIZE;
					const context = canvas.getContext('2d', { willReadFrequently: true });
					if (!context) return resolve(null);
					context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
					resolve(softTintFromPixels(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data));
				} catch {
					resolve(null);
				}
			};
			image.src = url;
		});
		cache.set(url, tint);
	}
	return tint;
}
