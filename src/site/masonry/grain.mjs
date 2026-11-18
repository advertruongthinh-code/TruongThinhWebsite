// The glass grain texture (glass-surface R4): static mono noise, one texel per device pixel. Shared by the grain Worker and the main-thread fallback.
export const GRAIN_SIZE = 160;

// Fill the two images: gray for the overlay (an overlay kept pure white stays white), and the same noise as white alpha for the arc (detail.css).
export function grainImages(createImageData) {
  const [grey, white] = [0, 1].map(() => createImageData(GRAIN_SIZE, GRAIN_SIZE));
  const [greyPixels, whitePixels] = [grey, white].map((image) => new Uint32Array(image.data.buffer));
  let state = 0x9e3779b9;
  for (let index = 0; index < greyPixels.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state >>> 24;
    greyPixels[index] = 0xff000000 | value * 0x10101;
    whitePixels[index] = (value << 24 | 0xffffff) >>> 0;
  }
  return [grey, white];
}
