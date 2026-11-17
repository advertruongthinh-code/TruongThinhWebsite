// Reads a baseline or progressive JPEG's size from its SOF segment; null when the bytes are not such a JPEG.
const SOF = new Set([0xc0, 0xc1, 0xc2]);

export function jpegSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  let i = 2;
  while (i + 9 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (SOF.has(marker)) return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    if (marker === 0xda || marker === 0xd9) return null;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}
