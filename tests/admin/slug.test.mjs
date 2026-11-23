import assert from "node:assert/strict";
import test from "node:test";
import { ID } from "../../src/cms/contract.mjs";
import { slugOf } from "../../src/admin/slug.mjs";

test("slugOf drops Vietnamese marks and joins words", () => {
  assert.equal(slugOf("Chọn màu gỗ cho phòng ngủ"), "chon-mau-go-cho-phong-ngu");
  assert.equal(slugOf("Đèn LED đường phố Đà Nẵng"), "den-led-duong-pho-da-nang");
  assert.equal(slugOf("  Tủ   bếp\tgỗ  "), "tu-bep-go");
  assert.equal(slugOf("Bàn & ghế (2026) — mẫu #1!"), "ban-ghe-2026-mau-1");
  assert.equal(slugOf("Ứng dụng Ưu đãi Ổn định"), "ung-dung-uu-dai-on-dinh");
  assert.equal(slugOf("!!!"), "");
});

test("slugOf cuts at 80 characters without a trailing dash and always matches the record id pattern", () => {
  const long = slugOf("Thiết kế nội thất căn hộ ".repeat(10));
  assert.ok(long.length <= 80);
  assert.ok(!long.endsWith("-"));
  for (const name of ["Chọn màu gỗ", "a".repeat(200), `${"b".repeat(79)} c`, "Gỗ 100%"]) assert.match(slugOf(name), ID);
});
