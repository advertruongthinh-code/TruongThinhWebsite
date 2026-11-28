import assert from "node:assert/strict";
import test from "node:test";
import { explain } from "../../src/cms/errors-vi.mjs";

test("explain words an error and says where it is", () => {
  assert.deepEqual(explain({ message: "chon: blocks[3].text: missing VI text", level: "missing" }), { text: "Chưa có chữ tiếng Việt.", block: 3, field: null });
  assert.deepEqual(explain({ message: "chon.title: missing VI text", level: "missing" }), { text: "Chưa có chữ tiếng Việt.", block: null, field: "title" });
  assert.equal(explain({ message: "x", code: "layout-locked", missing: 1 }).text, "Layout này cần thêm 1 media.");
  assert.equal(explain({ message: "chon: crop must be 3:2", code: "crop-ratio" }).text, "Khung cắt ảnh chưa đúng tỉ lệ của chỗ đặt.");
  assert.equal(explain({ message: "something new" }).text, "Chưa hợp lệ: something new");
});

test("explain names the media and the record of a reused photo", () => {
  const message = "tu-ao: media backdrop is already used by advertising-card kiosk-1 (one photo, one page)";
  assert.equal(explain({ message, code: "media-reuse" }).text, "Ảnh backdrop đã dùng ở advertising-card kiosk-1. Mỗi ảnh chỉ đặt ở một trang.");
});
