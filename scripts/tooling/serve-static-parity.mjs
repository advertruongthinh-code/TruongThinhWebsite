import { createReadStream, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ADVERTISING_PAGES } from "../../src/site/advertising-products/catalog.mjs";

export const ROUTES = new Map([
  ["/vi/", "index.html"],
  ["/en/", "index.html"],
  ["/vi/residential/", "residential/index.html"],
  ["/en/residential/", "residential/index.html"],
  ["/vi/commercial/", "commercial/index.html"],
  ["/en/commercial/", "commercial/index.html"],
  ["/vi/advertising-products/", "advertising-products/index.html"],
  ["/en/advertising-products/", "advertising-products/index.html"],
  ...["kiosk-posm", "mobile-retail", "signage-raised-letters", "office-signs-wayfinding", "led-displays-lightboxes", "print-decals"].flatMap((slug) => [[`/vi/advertising-products/${slug}/`, `advertising-products/${slug}/index.html`], [`/en/advertising-products/${slug}/`, `advertising-products/${slug}/index.html`]]),
  // Trang cụm, sản phẩm Advertising (taxonomy R4): build ghi sẵn file theo slug từng locale.
  ...ADVERTISING_PAGES.flatMap((page) => ["vi", "en"].map((locale) => [`/${locale}/advertising-products/${page[locale]}/`, `${locale}/advertising-products/${page[locale]}/index.html`])),
  ["/vi/about/", "about/index.html"],
  ["/en/about/", "about/index.html"],
]);

const MIME = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=UTF-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=UTF-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=UTF-8"],
  [".mjs", "text/javascript; charset=UTF-8"],
  [".json", "application/json; charset=UTF-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function parseArgs(argv) {
  const value = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index === -1 ? fallback : argv[index + 1];
  };
  return {
    root: resolve(value("--root", ".site-output")),
    host: value("--host", "127.0.0.1"),
    port: Number(value("--port", "8787")),
    selfTest: argv.includes("--self-test"),
  };
}

function attribute(tag, name) {
  return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") }="([^"]*)"`, "i").exec(tag)?.[1] ?? null;
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") }="[^"]*"`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, `${name}="${value}"`);
  return tag.replace(/\s*\/?\s*>$/, (ending) => ` ${name}="${value}"${ending}`);
}

export function localeHtml(source, locale = "vi") {
  let html = source.replace(/<html\b[^>]*>/i, (tag) => setAttribute(setAttribute(tag, "lang", locale), "data-route-locale", locale));
  if (locale === "en") {
    html = html.replace(/<[^>]+>/g, (tag) => {
      let output = tag;
      for (const name of ["alt", "aria-label", "content", "href"]) {
        const english = attribute(output, `data-en-${name}`);
        if (english === null) continue;
        const vietnamese = attribute(output, name);
        if (vietnamese !== null && attribute(output, `data-vi-${name}`) === null) output = setAttribute(output, `data-vi-${name}`, vietnamese);
        output = setAttribute(output, name, english);
      }
      return output;
    });
    html = html.replace(/<([a-z][\w:-]*)\b([^>]*\bdata-en="([^"]*)"[^>]*)>[\s\S]*?<\/\1\s*>/gi, (_match, tag, attributes, english) => `<${tag}${attributes}>${english}</${tag}>`);
  }
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    if (/\bdata-language-option\s*=/.test(tag)) return tag;
    const href = attribute(tag, "href");
    if (!href?.startsWith("/") || href.startsWith("//")) return tag;
    const path = href.replace(/^\/(?:vi|en)(?=\/|$)/, "");
    return setAttribute(tag, "href", `/${locale}${path || "/"}`);
  });
}

function requestFile(root, pathname) {
  const route = ROUTES.get(pathname);
  const relative = route || decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) return null;
  const file = resolve(root, relative);
  return file.startsWith(`${root}${sep}`) ? { file, html: Boolean(route), locale: pathname.startsWith("/en/") ? "en" : "vi" } : null;
}

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

function handler(root) {
  return (request, response) => {
    const pathname = new URL(request.url, "http://local").pathname;
    let resolved;
    try {
      resolved = requestFile(root, pathname);
      if (!resolved) throw new Error("not-found");
      const info = statSync(resolved.file);
      if (!info.isFile()) throw new Error("not-found");

      const headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Type": MIME.get(extname(resolved.file).toLowerCase()) || "application/octet-stream",
      };
      if (resolved.html) {
        const body = Buffer.from(localeHtml(readFileSync(resolved.file, "utf8"), resolved.locale));
        response.writeHead(200, { ...headers, "Content-Language": resolved.locale, Vary: "Accept-Language", "Content-Length": body.length });
        if (request.method !== "HEAD") response.end(body); else response.end();
        return;
      }

      const range = byteRange(request.headers.range, info.size);
      if (request.headers.range && !range) {
        response.writeHead(416, { ...headers, "Content-Range": `bytes */${info.size}` });
        response.end();
        return;
      }
      const status = range ? 206 : 200;
      const start = range?.start ?? 0;
      const end = range?.end ?? info.size - 1;
      response.writeHead(status, {
        ...headers,
        "Content-Length": end - start + 1,
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(resolved.file, { start, end }).pipe(response);
    } catch {
      // Giống demo (not_found_handling = "404-page"): 404.html gần nhất theo path (en, cụm Advertising), thiếu file thì về text.
      let page;
      for (let directory = pathname.replace(/[^/]*$/, ""); !page && directory; directory = directory.replace(/[^/]*\/$/, "")) {
        try {
          page = readFileSync(resolve(root, `.${directory}404.html`));
        } catch {}
      }
      response.writeHead(404, { "Content-Type": page ? MIME.get(".html") : "text/plain; charset=UTF-8", "Cache-Control": "no-store" });
      response.end(page ?? "Not Found");
    }
  };
}

function selfTest() {
  const root = resolve(".site-output");
  const checks = [
    requestFile(root, "/vi/")?.file === resolve(root, "index.html"),
    requestFile(root, "/en/")?.locale === "en",
    requestFile(root, "/vi/about/")?.file === resolve(root, "about/index.html"),
    requestFile(root, "/en/advertising-products/kiosk-posm/")?.file === resolve(root, "advertising-products/kiosk-posm/index.html"),
    requestFile(root, "/style.css")?.file === resolve(root, "style.css"),
    requestFile(root, "/../package.json") === null,
    byteRange("bytes=10-19", 100)?.end === 19,
    byteRange("bytes=100-101", 100) === null,
    localeHtml('<html lang="vi"><a href="/">A</a><a data-language-option="en" href="/en/">E</a>') ===
      '<html lang="vi" data-route-locale="vi"><a href="/vi/">A</a><a data-language-option="en" href="/en/">E</a>',
    localeHtml('<html lang="vi"><body><p data-en="English">Tiếng Việt</p><img alt="Vi" data-en-alt="En"><a href="/vi/about/">A</a></body></html>', "en") ===
      '<html lang="en" data-route-locale="en"><body><p data-en="English">English</p><img alt="En" data-en-alt="En" data-vi-alt="Vi"><a href="/en/about/">A</a></body></html>',
    localeHtml('<nav><a data-en="Residential">Nhà ở</a\n><a href="/vi/about/">Về chúng tôi</a></nav>', "en") ===
      '<nav><a data-en="Residential">Residential</a><a href="/en/about/">Về chúng tôi</a></nav>',
  ];
  if (checks.some((check) => !check)) throw new Error(`Static parity server self-test failed: ${checks.filter(Boolean).length}/${checks.length}`);
  console.log(`Static parity server self-test passed: ${checks.length}/${checks.length}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) selfTest();
  else {
    const server = createServer(handler(options.root));
    server.listen(options.port, options.host, () => {
      console.log(`Static parity server: http://${options.host}:${options.port} root=${options.root}`);
    });
  }
}
