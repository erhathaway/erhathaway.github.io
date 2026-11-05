import { describe, expect, it } from 'vitest';
import { softTintFromPixels } from './tint';

const pixel = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
const NEUTRAL = 'hsl(42, 50%, 98%)';

describe('softTintFromPixels', () => {
	it('keeps the tint equally bright for dark and light images of one hue', () => {
		expect(softTintFromPixels(pixel(0, 0, 200))).toBe('hsl(240, 70%, 97.5%)');
		expect(softTintFromPixels(pixel(150, 150, 255))).toBe('hsl(240, 70%, 97.5%)');
	});
	it('leans warm hues golden', () => {
		expect(softTintFromPixels(pixel(180, 90, 0))).toBe('hsl(38, 70%, 97.5%)');
	});
	it('favors colorful pixels over a larger neutral area', () => {
		const wall = Array.from({ length: 50 }, () => pixel(235, 235, 235)).flat();
		expect(softTintFromPixels([...wall, ...pixel(180, 90, 0)])).toMatch(/^hsl\(3\d, 70%, 97\.5%\)$/);
	});
	it('uses a warm neutral for images without color', () => {
		expect(softTintFromPixels(pixel(0, 0, 0))).toBe(NEUTRAL);
		expect(softTintFromPixels(pixel(128, 128, 128))).toBe(NEUTRAL);
	});
	it('ignores transparent pixels and returns null when nothing is visible', () => {
		expect(softTintFromPixels(pixel(10, 200, 10, 0))).toBeNull();
		expect(softTintFromPixels([])).toBeNull();
		expect(softTintFromPixels([...pixel(0, 255, 0, 0), ...pixel(0, 0, 0)])).toBe(NEUTRAL);
	});
});
