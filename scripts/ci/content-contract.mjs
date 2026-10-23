// Bộ kiểm nội dung thật (docs/specs/content-independent-tests.md R2): node scripts/ci/content-contract.mjs
// Advertising và rail trang chủ dùng lại validator đang có; HTML, CSS được kiểm ở đây. Biến thể ảnh do
// scripts/site/build-image-variants.mjs --check giữ, cùng bộ fast.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectReel } from "../site/project-reel.mjs";

// Bỏ `$`: đường dẫn ghép trong script inline (`${name}`) không phải file.
const CONTENT_PATH = /\/assets\/content\/[^"')\s?#$`]+/g;

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function filesUnder(root, extension) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

// Trả danh sách lỗi dạng "<file>: <đường dẫn ảnh>: <luật>", không dừng ở lỗi đầu.
export async function checkSiteContent(siteRoot) {
  const { default: sharp } = await import("sharp");
  const errors = [];
  const at = (file) => path.relative(siteRoot, file);
  const sizes = new Map();
  const pixelSize = async (file) => {
    if (!sizes.has(file)) sizes.set(file, await sharp(file).metadata());
    return sizes.get(file);
  };

  for (const file of [...filesUnder(siteRoot, ".html"), ...filesUnder(siteRoot, ".css")]) {
    const text = readFileSync(file, "utf8");
    for (const src of new Set(text.match(CONTENT_PATH) ?? [])) {
      if (!existsSync(path.join(siteRoot, src))) errors.push(`${at(file)}: ${src}: file không tồn tại`);
    }
    if (!file.endsWith(".html")) continue;
    for (const tag of text.match(/<img\b[^>]*>/g) ?? []) {
      const src = attribute(tag, "src") ?? attribute(tag, "data-src");
      if (!src?.startsWith("/assets/content/")) continue;
      const alt = attribute(tag, "alt");
      if (alt === undefined) errors.push(`${at(file)}: ${src}: thiếu alt`);
      // Logo SVG là tên riêng nên không cần bản EN; ảnh chụp có alt thì phải có data-en-alt.
      else if (src.endsWith(".webp") && alt.trim() && !attribute(tag, "data-en-alt")?.trim()) errors.push(`${at(file)}: ${src}: alt VI có nhưng thiếu data-en-alt`);
      const image = path.join(siteRoot, src);
      const width = Number(attribute(tag, "width"));
      const height = Number(attribute(tag, "height"));
      if (!src.endsWith(".webp") || !existsSync(image) || !width || !height) continue;
      const real = await pixelSize(image);
      if (real.width !== width || real.height !== height) {
        errors.push(`${at(file)}: ${src}: khai ${width}x${height}, pixel thật ${real.width}x${real.height}`);
      }
    }
    // Hero slideshow (page-home R3, detail-pages R5): mảng `slides` của script head chọn ảnh đầu theo chỉ số,
    // nên phải trùng tên, độ rộng và thứ tự với figure.hero-slide; data-slide liên tục từ 0.
    const slidesArray = text.match(/const slides = (\[[\s\S]*?\]);/)?.[1];
    if (slidesArray) {
      const slides = [...slidesArray.matchAll(/\["([^"]+)",\s*(\d+)\]/g)].map(([, name, width]) => `${name} ${width}`);
      const figures = [...text.matchAll(/<figure class="hero-slide(?:\s[^"]*)?" data-slide="(\d+)">\s*(<img\b[^>]*>)/g)];
      figures.forEach(([, index], position) => {
        if (Number(index) !== position) errors.push(`${at(file)}: hero-slide thứ ${position} có data-slide="${index}"`);
      });
      const markup = figures.map(([, , tag]) => {
        const src = attribute(tag, "src") ?? attribute(tag, "data-src") ?? "";
        return `${path.basename(src, ".webp")} ${attribute(tag, "width")}`;
      });
      if (slides.join("|") !== markup.join("|")) {
        errors.push(`${at(file)}: mảng slides [${slides.join(", ")}] khác figure.hero-slide [${markup.join(", ")}]`);
      }
    }
  }

  const reelFile = path.join(siteRoot, "content/project-reel.json");
  if (existsSync(reelFile)) {
    await validateProjectReel(JSON.parse(readFileSync(reelFile, "utf8")), siteRoot).catch((error) => errors.push(error.message));
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Import catalog chạy validator Advertising (media-contract.mjs): alt, phân loại, kích thước, tỷ lệ.
  await import("../../src/site/advertising-products/catalog.mjs");
  const errors = await checkSiteContent(path.resolve("src/site"));
  if (errors.length) {
    console.error(`content-contract FAIL: ${errors.length} lỗi\n${errors.join("\n")}`);
    process.exit(1);
  }
  console.log("content-contract PASS");
}
