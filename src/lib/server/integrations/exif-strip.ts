/**
 * Minimal EXIF stripping for JPEG files.
 * Removes APP1 (EXIF) segments from JPEG byte streams.
 * For PNG/WebP, removes known metadata chunks.
 */

/**
 * Strip EXIF data from image bytes based on content type.
 * Returns cleaned bytes. If not a recognized image type, returns original bytes.
 */
export function stripExif(bytes: ArrayBuffer, contentType: string): ArrayBuffer {
	const type = contentType.toLowerCase();

	if (type === 'image/jpeg' || type === 'image/jpg') {
		return stripJpegExif(bytes);
	}
	if (type === 'image/png') {
		return stripPngMetadata(bytes);
	}
	// WebP, GIF, HEIC — return as-is (metadata stripping for these is complex
	// and low-value since EXIF is rare in WebP/GIF)
	return bytes;
}

/**
 * Strip EXIF APP1 segments from a JPEG file.
 * Preserves all other segments (APP0/JFIF, quantization tables, Huffman tables, SOF, SOS, etc.)
 */
function stripJpegExif(bytes: ArrayBuffer): ArrayBuffer {
	const view = new DataView(bytes);
	const u8 = new Uint8Array(bytes);

	// Verify JPEG SOI marker
	if (view.getUint16(0) !== 0xffd8) {
		return bytes; // Not a JPEG
	}

	const segments: { start: number; length: number; keep: boolean }[] = [];

	// SOI marker
	segments.push({ start: 0, length: 2, keep: true });

	let offset = 2;
	while (offset < bytes.byteLength - 1) {
		if (u8[offset] !== 0xff) break;

		const marker = view.getUint16(offset);

		// SOS marker — rest of file is image data
		if (marker === 0xffda) {
			segments.push({ start: offset, length: bytes.byteLength - offset, keep: true });
			break;
		}

		// Markers without length (RST, SOI, EOI)
		if (
			(marker >= 0xffd0 && marker <= 0xffd7) ||
			marker === 0xffd8 ||
			marker === 0xffd9
		) {
			segments.push({ start: offset, length: 2, keep: true });
			offset += 2;
			continue;
		}

		// Segment with length
		if (offset + 3 >= bytes.byteLength) break;
		const segmentLength = view.getUint16(offset + 2);
		const totalLength = 2 + segmentLength;

		// APP1 = 0xFFE1 (EXIF data) — skip it
		const keep = marker !== 0xffe1;
		segments.push({ start: offset, length: totalLength, keep });
		offset += totalLength;
	}

	// Rebuild file without EXIF segments
	const keptSize = segments.reduce((sum, s) => sum + (s.keep ? s.length : 0), 0);
	const result = new Uint8Array(keptSize);
	let pos = 0;
	for (const seg of segments) {
		if (seg.keep) {
			result.set(u8.subarray(seg.start, seg.start + seg.length), pos);
			pos += seg.length;
		}
	}

	return result.buffer;
}

/**
 * Strip metadata chunks from a PNG file.
 * Removes tEXt, iTXt, zTXt, eXIf chunks while preserving IHDR, PLTE, IDAT, IEND, etc.
 */
function stripPngMetadata(bytes: ArrayBuffer): ArrayBuffer {
	const u8 = new Uint8Array(bytes);
	const view = new DataView(bytes);

	// Verify PNG signature
	const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for (let i = 0; i < pngSig.length; i++) {
		if (u8[i] !== pngSig[i]) return bytes; // Not a PNG
	}

	const metadataChunks = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf']);

	const chunks: { start: number; length: number; keep: boolean }[] = [];

	// PNG signature
	chunks.push({ start: 0, length: 8, keep: true });

	let offset = 8;
	while (offset + 8 <= bytes.byteLength) {
		const chunkDataLength = view.getUint32(offset);
		const chunkType = String.fromCharCode(u8[offset + 4], u8[offset + 5], u8[offset + 6], u8[offset + 7]);
		const totalLength = 4 + 4 + chunkDataLength + 4; // length + type + data + crc

		if (offset + totalLength > bytes.byteLength) break;

		const keep = !metadataChunks.has(chunkType);
		chunks.push({ start: offset, length: totalLength, keep });
		offset += totalLength;
	}

	const keptSize = chunks.reduce((sum, c) => sum + (c.keep ? c.length : 0), 0);
	const result = new Uint8Array(keptSize);
	let pos = 0;
	for (const chunk of chunks) {
		if (chunk.keep) {
			result.set(u8.subarray(chunk.start, chunk.start + chunk.length), pos);
			pos += chunk.length;
		}
	}

	return result.buffer;
}
