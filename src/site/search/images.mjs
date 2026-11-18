// Images the visitor adds to a search (advertising-search R8, R4): read in the browser, redrawn on white as a small JPEG, so
// EXIF and GPS never leave the device.
export const MAX_IMAGES = 5;
const MAX_FILE = 25 * 1024 * 1024;
const MAX_JPEG = 300 * 1024;
const LONG_SIDE = 768;
const QUALITIES = [0.85, 0.75, 0.65];

const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
const base64Of = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(",") + 1));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

// Identity of a prepared image, for dropping duplicates (also used for images restored from the session).
export const hashOf = async (blob) => hex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));

// Why a file is turned away before it is read, or null.
export function rejectReason(file) {
  if (file.type.startsWith("video/")) return "videoOnly";
  if (file.type === "image/svg+xml" || file.type === "application/pdf" || (file.type && !file.type.startsWith("image/"))) return "unsupported";
  if (file.size > MAX_FILE) return "tooLarge";
  return null;
}

async function toJpeg(bitmap, quality) {
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  // Safari before 16.4 has no OffscreenCanvas.convertToBlob: fall back to a DOM canvas.
  const offscreen = typeof OffscreenCanvas === "function" && OffscreenCanvas.prototype.convertToBlob;
  const canvas = offscreen ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff"; // transparent PNG and GIF on white
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  return offscreen
    ? canvas.convertToBlob({ type: "image/jpeg", quality })
    : new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// { blob, base64, hash } or { error }. createImageBitmap applies the EXIF orientation: no manual rotation.
export async function prepareImage(file) {
  const reason = rejectReason(file);
  if (reason) return { error: reason };
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { error: "unreadable" };
  }
  try {
    for (const quality of QUALITIES) {
      const blob = await toJpeg(bitmap, quality);
      if (blob && blob.size <= MAX_JPEG) {
        return { blob, base64: await base64Of(blob), hash: await hashOf(blob) };
      }
    }
    return { error: "tooLarge" };
  } finally {
    bitmap.close?.();
  }
}
