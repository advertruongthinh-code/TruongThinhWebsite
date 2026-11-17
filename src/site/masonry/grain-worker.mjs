// Draws the glass grain off the main thread (glass-surface R4): two PNG blobs, gray and white, from an OffscreenCanvas. A failure answers null
// and the page draws the grain on the main thread instead.
import { GRAIN_SIZE, grainImages } from "./grain.mjs";

onmessage = async () => {
  try {
    const canvas = new OffscreenCanvas(GRAIN_SIZE, GRAIN_SIZE);
    const context = canvas.getContext("2d");
    const blobs = [];
    for (const image of grainImages((width, height) => context.createImageData(width, height))) {
      context.putImageData(image, 0, 0);
      blobs.push(await canvas.convertToBlob({ type: "image/png" }));
    }
    postMessage(blobs);
  } catch {
    postMessage(null);
  }
};
