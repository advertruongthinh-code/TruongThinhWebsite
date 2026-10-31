import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { palette } from "../../scripts/site/image-palette.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { MEDIA_COLORS } = await import(pathToFileURL(path.join(root, "src/site/advertising-products/media-colors.mjs")).href);

// advertising-skeleton R3: ảnh tổng hợp bốn mảng màu (diện tích khác nhau) ra đúng bốn màu, sắp từ sáng tới tối.
const blocks = [[[20, 30, 200], 700], [[240, 230, 210], 300], [[200, 40, 40], 500], [[30, 20, 10], 900]];
const pixels = Uint8Array.from(blocks.flatMap(([color, count]) => Array.from({ length: count }, () => color).flat()));
const result = palette(pixels);
assert.deepEqual(result, [[240, 230, 210], [200, 40, 40], [20, 30, 200], [30, 20, 10]]);
assert.deepEqual(palette(pixels), result, "running twice gives the same colours");

// Ảnh ít hơn bốn màu không làm hỏng: vẫn trả bốn màu hợp lệ.
const flat = palette(Uint8Array.from(Array.from({ length: 64 }, () => [90, 90, 90]).flat()));
assert.equal(flat.length, 4);
assert(flat.every((color) => color.join() === "90,90,90"));

// File sinh: mỗi ảnh có màu chủ đạo card và 4 màu Flow dạng hex.
const entries = Object.values(MEDIA_COLORS);
assert(entries.length > 0);
assert(entries.every((colors) => colors.length === 5 && colors.every((color) => /^#[0-9a-f]{6}$/.test(color))));
