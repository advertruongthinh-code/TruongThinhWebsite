#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DELAY_MS = 750;
const DEFAULT_MAX_RESPONSE_BYTES = 256 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 10 * 1024 * 1024 * 1024;
const USER_AGENT =
  "ReferenceWebArchiver/1.0 (+local design research; sequential sitemap crawler)";
const ASSET_EXTENSION =
  /\.(?:avif|bmp|css|eot|gif|ico|jpe?g|js|mjs|mov|mp3|mp4|mpeg|ogg|ogv|otf|pdf|png|svg|ttf|webm|webp|woff2?)$/i;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const TRACKING_PARAM =
  /^(?:fbclid|gclid|msclkid|utm_(?:campaign|content|medium|source|term))$/i;

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const defaultArchiveDir = path.join(
  repoRoot,
  "research",
  "reference-site",
  "archive",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function decodeEntities(value) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeUrl(input, base) {
  let url;
  try {
    url = new URL(input, base);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return null;
  }

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url;
}

export function canonicalizeSitemapUrl(
  input,
  targetOrigin,
  legacyOrigins = new Set(),
) {
  const source = normalizeUrl(input);
  const target = new URL(targetOrigin);
  if (!source) {
    return null;
  }
  if (source.origin !== target.origin && !legacyOrigins.has(source.origin)) {
    return null;
  }
  return normalizeUrl(`${source.pathname}${source.search}`, target);
}

export function isEnglishPageUrl(url) {
  if (!(url instanceof URL)) {
    return false;
  }
  const isEnglishPath =
    url.pathname === "/en" || url.pathname.startsWith("/en/");
  return isEnglishPath && !ASSET_EXTENSION.test(url.pathname);
}

function safeSegment(segment) {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep malformed percent escapes verbatim so the mapping remains stable.
  }
  let safe = decoded
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[ .]+$/g, "");
  if (!safe || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe)) {
    safe = `_${safe || "empty"}`;
  }
  return safe;
}

function addQueryHash(filePath, search) {
  if (!search) {
    return filePath;
  }
  const extension = path.posix.extname(filePath);
  const stem = extension ? filePath.slice(0, -extension.length) : filePath;
  return `${stem}.q-${sha256(search.slice(1)).slice(0, 12)}${extension}`;
}

export function archiveRelativePath(url, kind, primaryOrigin = url.origin) {
  const segments = url.pathname.split("/").filter(Boolean).map(safeSegment);

  const prefix =
    url.origin === new URL(primaryOrigin).origin ? "site" : "site-api";
  let relative;
  if (kind === "html") {
    const last = segments.at(-1) ?? "";
    if (/\.html?$/i.test(last)) {
      relative = path.posix.join(prefix, ...segments);
    } else {
      relative = path.posix.join(prefix, ...segments, "index.html");
    }
  } else {
    relative = path.posix.join(
      prefix,
      ...(segments.length ? segments : ["root-resource"]),
    );
  }
  return addQueryHash(relative, url.search);
}

function addUrlHash(filePath, url, hashLength = 16) {
  const extension = path.posix.extname(filePath);
  const stem = extension ? filePath.slice(0, -extension.length) : filePath;
  return `${stem}.u-${sha256(url.href).slice(0, hashLength)}${extension}`;
}

export function createArchivePathAllocator(primaryOrigin) {
  const pathsByUrl = new Map();
  const urlsByFoldedPath = new Map();

  const allocate = (url, kind, preferredPath = null) => {
    const existingPath = pathsByUrl.get(url.href);
    if (existingPath) {
      return existingPath;
    }

    let candidate =
      preferredPath ?? archiveRelativePath(url, kind, primaryOrigin);
    let folded = candidate.toLowerCase();
    if (
      urlsByFoldedPath.has(folded) &&
      urlsByFoldedPath.get(folded) !== url.href
    ) {
      candidate = addUrlHash(candidate, url);
      folded = candidate.toLowerCase();
      if (urlsByFoldedPath.has(folded)) {
        candidate = addUrlHash(candidate, url, 32);
        folded = candidate.toLowerCase();
      }
    }

    pathsByUrl.set(url.href, candidate);
    urlsByFoldedPath.set(folded, url.href);
    return candidate;
  };

  allocate.reserve = (url, localPath) => {
    if (!localPath) return;
    pathsByUrl.set(url.href, localPath);
    urlsByFoldedPath.set(localPath.toLowerCase(), url.href);
  };

  return allocate;
}

export async function readResponseBuffer(response, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error(
      "Response byte budget must be a non-negative safe integer.",
    );
  }
  const declaredLength = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error(
      `Response byte budget exceeded: ${declaredLength} > ${maxBytes}.`,
    );
  }
  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error(`Response byte budget exceeded: ${bytes} > ${maxBytes}.`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, bytes);
}

export function toManifestRecord(record) {
  const metadata = {
    url: record.url,
    localPath: record.localPath,
    status: record.status,
    contentType: record.contentType,
    bytes: record.bytes,
    sha256: record.sha256,
    fetchedAt: record.fetchedAt,
  };
  if (record.reason) metadata.reason = record.reason;
  return metadata;
}

function robotsPatternMatch(pathAndQuery, pattern) {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regexBody = body
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regexBody}${anchored ? "$" : ""}`).test(pathAndQuery);
}

export function parseRobots(text, userAgent) {
  const groups = [];
  const sitemaps = [];
  let currentGroup = null;
  let currentHasDirectives = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    if (!line) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "sitemap") {
      if (value) {
        sitemaps.push(value);
      }
      continue;
    }

    if (key === "user-agent") {
      if (!currentGroup || currentHasDirectives) {
        currentGroup = {
          agents: [],
          rules: [],
          crawlDelayMs: null,
        };
        groups.push(currentGroup);
        currentHasDirectives = false;
      }
      currentGroup.agents.push(value.toLowerCase());
      continue;
    }

    if (!currentGroup) {
      continue;
    }

    if (key === "allow" || key === "disallow") {
      currentHasDirectives = true;
      if (value) {
        currentGroup.rules.push({
          allow: key === "allow",
          pattern: value,
        });
      }
    } else if (key === "crawl-delay") {
      currentHasDirectives = true;
      const seconds = Number.parseFloat(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        currentGroup.crawlDelayMs = seconds * 1000;
      }
    }
  }

  const agentToken = userAgent.split("/")[0].toLowerCase();
  const exactGroups = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && agentToken.startsWith(agent)),
  );
  const selectedGroups = exactGroups.length
    ? exactGroups
    : groups.filter((group) => group.agents.includes("*"));
  const rules = selectedGroups.flatMap((group) => group.rules);
  const crawlDelayMs = selectedGroups.reduce(
    (maximum, group) => Math.max(maximum, group.crawlDelayMs ?? 0),
    0,
  );

  return {
    crawlDelayMs,
    sitemaps: [...new Set(sitemaps)],
    isAllowed(url) {
      const candidate = `${url.pathname}${url.search}`;
      const matches = rules
        .filter((rule) => robotsPatternMatch(candidate, rule.pattern))
        .map((rule) => ({
          ...rule,
          specificity: rule.pattern.replace(/[*$]/g, "").length,
        }))
        .sort(
          (left, right) =>
            right.specificity - left.specificity ||
            Number(right.allow) - Number(left.allow),
        );
      return matches.length === 0 || matches[0].allow;
    },
  };
}

export function extractSitemapLocs(xml) {
  const locations = [];
  const locPattern = /<(?:[\w-]+:)?loc\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?loc>/gi;
  for (const match of xml.matchAll(locPattern)) {
    const decoded = decodeEntities(match[1].trim());
    if (decoded) {
      locations.push(decoded);
    }
  }
  return locations;
}

function parseAttributes(source) {
  const attributes = new Map();
  const pattern =
    /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of source.matchAll(pattern)) {
    attributes.set(
      match[1].toLowerCase(),
      decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""),
    );
  }
  return attributes;
}

function srcsetUrls(value) {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function cssRawUrls(css) {
  const urls = [];
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s][^)]*))\s*\)/gi;
  for (const match of css.matchAll(pattern)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (value) {
      urls.push(decodeEntities(value));
    }
  }
  const quotedImportPattern = /@import\s+(?:"([^"]+)"|'([^']+)')/gi;
  for (const match of css.matchAll(quotedImportPattern)) {
    urls.push(decodeEntities(match[1] ?? match[2]));
  }
  return urls;
}

function sorted(values) {
  return [...values].sort();
}

export function extractCssAssetUrls(css, stylesheetUrl, allowedAssetOrigins) {
  const allowedOrigins =
    allowedAssetOrigins instanceof Set
      ? allowedAssetOrigins
      : new Set([allowedAssetOrigins]);
  const assets = new Set();
  for (const rawUrl of cssRawUrls(css)) {
    const url = normalizeUrl(rawUrl, stylesheetUrl);
    if (url && allowedOrigins.has(url.origin)) {
      assets.add(url.href);
    }
  }
  return sorted(assets);
}

export function extractHtmlReferences(
  html,
  pageUrl,
  targetOrigin,
  allowedAssetOrigins = new Set([targetOrigin]),
) {
  const allowedOrigins =
    allowedAssetOrigins instanceof Set
      ? allowedAssetOrigins
      : new Set([allowedAssetOrigins]);
  const pages = new Set();
  const assets = new Set();
  const excludedOrigins = new Set();
  const assetAttributes = new Set([
    "data-background",
    "data-background-image",
    "data-bg",
    "data-poster",
    "data-src",
    "data-video",
  ]);
  const srcsetAttributes = new Set(["data-srcset", "srcset"]);

  const resolve = (rawValue) => {
    const url = normalizeUrl(rawValue, pageUrl);
    if (url && url.origin !== targetOrigin && !allowedOrigins.has(url.origin)) {
      excludedOrigins.add(url.origin);
    }
    return url;
  };
  const addPage = (rawValue) => {
    const url = resolve(rawValue);
    if (url?.origin === targetOrigin && isEnglishPageUrl(url)) {
      pages.add(url.href);
    }
  };
  const addAsset = (rawValue) => {
    if (!rawValue || rawValue.startsWith("#")) {
      return;
    }
    const url = resolve(rawValue);
    if (url && allowedOrigins.has(url.origin)) {
      assets.add(url.href);
    }
  };

  const tagPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  for (const tagMatch of html.matchAll(tagPattern)) {
    const tag = tagMatch[1].toLowerCase();
    const attributes = parseAttributes(tagMatch[2]);

    if (tag === "a" && attributes.has("href")) {
      addPage(attributes.get("href"));
    } else if (tag === "iframe" && attributes.has("src")) {
      const iframeUrl = resolve(attributes.get("src"));
      if (iframeUrl?.origin === targetOrigin && isEnglishPageUrl(iframeUrl)) {
        pages.add(iframeUrl.href);
      }
    } else if (tag === "link" && attributes.has("href")) {
      const rel = new Set(
        (attributes.get("rel") ?? "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      );
      if (
        rel.has("stylesheet") ||
        rel.has("preload") ||
        rel.has("modulepreload") ||
        rel.has("manifest") ||
        [...rel].some((value) => value.includes("icon"))
      ) {
        addAsset(attributes.get("href"));
      }
    } else if (tag === "script" && attributes.has("src")) {
      addAsset(attributes.get("src"));
    } else if (
      ["img", "input", "source", "video", "audio", "embed"].includes(tag) &&
      attributes.has("src")
    ) {
      addAsset(attributes.get("src"));
    } else if (tag === "object" && attributes.has("data")) {
      addAsset(attributes.get("data"));
    }

    if (tag === "video" && attributes.has("poster")) {
      addAsset(attributes.get("poster"));
    }
    if (
      tag === "meta" &&
      /^(?:og:|twitter:)?(?:image|video|audio)(?::(?:url|secure_url))?$/i.test(
        attributes.get("property") ?? attributes.get("name") ?? "",
      ) &&
      attributes.has("content")
    ) {
      addAsset(attributes.get("content"));
    }

    for (const name of assetAttributes) {
      if (attributes.has(name)) {
        addAsset(attributes.get(name));
      }
    }
    for (const name of srcsetAttributes) {
      if (attributes.has(name)) {
        for (const rawUrl of srcsetUrls(attributes.get(name))) {
          addAsset(rawUrl);
        }
      }
    }
    if (attributes.has("style")) {
      for (const rawUrl of cssRawUrls(attributes.get("style"))) {
        addAsset(rawUrl);
      }
    }
  }

  return {
    pageUrls: sorted(pages),
    assetUrls: sorted(assets),
    excludedOrigins: sorted(excludedOrigins),
  };
}

function parseArguments(argv) {
  const options = {
    archiveDir: defaultArchiveDir,
    delayMs: DEFAULT_DELAY_MS,
    maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
    maxTotalBytes: DEFAULT_MAX_TOTAL_BYTES,
    maxPages: Number.POSITIVE_INFINITY,
    maxAssets: Number.POSITIVE_INFINITY,
    origin: null,
    sitemap: null,
    assetOrigins: [],
    legacyOrigins: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--archive-dir" && value) {
      options.archiveDir = path.resolve(value);
      index += 1;
    } else if (argument === "--delay-ms" && value) {
      options.delayMs = Number.parseInt(value, 10);
      index += 1;
    } else if (argument === "--max-pages" && value) {
      options.maxPages = Number.parseInt(value, 10);
      index += 1;
    } else if (argument === "--max-assets" && value) {
      options.maxAssets = Number.parseInt(value, 10);
      index += 1;
    } else if (argument === "--max-response-bytes" && value) {
      options.maxResponseBytes = Number.parseInt(value, 10);
      index += 1;
    } else if (argument === "--max-total-bytes" && value) {
      options.maxTotalBytes = Number.parseInt(value, 10);
      index += 1;
    } else if (argument === "--origin" && value) {
      options.origin = new URL(value).origin;
      index += 1;
    } else if (argument === "--asset-origin" && value) {
      options.assetOrigins.push(new URL(value).origin);
      index += 1;
    } else if (argument === "--legacy-origin" && value) {
      options.legacyOrigins.push(new URL(value).origin);
      index += 1;
    } else if (argument === "--sitemap" && value) {
      options.sitemap = new URL(value).href;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }

  if (!options.help && !options.origin) {
    throw new Error("--origin is required.");
  }
  options.sitemap ??= options.origin
    ? new URL("/sitemap.xml", options.origin).href
    : null;

  if (!Number.isInteger(options.delayMs) || options.delayMs < 250) {
    throw new Error("--delay-ms must be an integer of at least 250.");
  }
  if (
    options.maxPages !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(options.maxPages) || options.maxPages < 1)
  ) {
    throw new Error("--max-pages must be a positive integer.");
  }
  if (
    options.maxAssets !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(options.maxAssets) || options.maxAssets < 1)
  ) {
    throw new Error("--max-assets must be a positive integer.");
  }
  if (
    !Number.isSafeInteger(options.maxResponseBytes) ||
    options.maxResponseBytes < 1
  ) {
    throw new Error("--max-response-bytes must be a positive safe integer.");
  }
  if (
    !Number.isSafeInteger(options.maxTotalBytes) ||
    options.maxTotalBytes < 1
  ) {
    throw new Error("--max-total-bytes must be a positive safe integer.");
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/reference/archive-reference.mjs --origin <url> [options]

Options:
  --archive-dir <path>  Output directory (default: reference audit archive)
  --delay-ms <number>   Minimum sequential request interval (default: 750)
  --max-pages <number>  Limit HTML pages for a smoke run
  --max-assets <number> Limit assets for a smoke run
  --max-response-bytes <number>
                        Per-response safety cap (default: 268435456)
  --max-total-bytes <number>
                        Whole-run safety cap (default: 10737418240)
  --origin <url>        Target origin (required)
  --asset-origin <url>  Additional first-party asset origin (repeatable)
  --legacy-origin <url> Legacy sitemap origin to map to target (repeatable)
  --sitemap <url>       Sitemap URL (default: <origin>/sitemap.xml)
  -h, --help            Show this help
`);
}

function retryDelay(response, attempt) {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(seconds * 1000, 60_000);
    }
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), 60_000);
    }
  }
  return 1000 * 2 ** attempt;
}

async function runCrawler(options) {
  const targetOrigin = new URL(options.origin).origin;
  const allowedAssetOrigins = new Set([
    targetOrigin,
    ...options.assetOrigins,
  ]);
  const legacyOrigins = new Set(options.legacyOrigins);
  const manifestPath = path.join(options.archiveDir, "manifest.jsonl");
  const manifestTempPath = `${manifestPath}.tmp`;
  const allocateLocalPath = createArchivePathAllocator(targetOrigin);
  const records = new Map();
  const excludedOrigins = new Set();
  const policies = new Map();
  let lastRequestAt = 0;
  let requestCount = 0;
  let totalBytesRead = 0;

  await mkdir(options.archiveDir, { recursive: true });
  let resumeContent = "";
  let resumeSource = null;
  for (const candidate of [manifestTempPath, manifestPath]) {
    try {
      resumeContent = await readFile(candidate, "utf8");
      resumeSource = candidate;
      break;
    } catch {
      // Start a new manifest when no resumable file exists.
    }
  }
  if (resumeSource !== manifestTempPath) {
    await writeFile(manifestTempPath, resumeContent, "utf8");
  }
  for (const line of resumeContent.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      const reusable =
        record.localPath ||
        (record.status >= 400 && record.status < 500) ||
        record.reason === "blocked-by-robots";
      if (!reusable) continue;
      records.set(record.url, record);
      allocateLocalPath.reserve(new URL(record.url), record.localPath);
      totalBytesRead += Number(record.bytes) || 0;
    } catch {
      // Ignore a truncated final line after an interrupted crawl.
    }
  }
  if (records.size) {
    console.log(`[resume] records=${records.size} source=${resumeSource}`);
  }

  const appendRecord = async (record) => {
    const metadata = toManifestRecord(record);
    records.set(metadata.url, metadata);
    await appendFile(manifestTempPath, `${JSON.stringify(metadata)}\n`, "utf8");
  };

  const waitForRateLimit = async (url) => {
    const policyDelay = policies.get(url.origin)?.crawlDelayMs ?? 0;
    const interval = Math.max(options.delayMs, policyDelay);
    const remaining = interval - (Date.now() - lastRequestAt);
    if (remaining > 0) {
      await sleep(remaining);
    }
    lastRequestAt = Date.now();
  };

  const request = async (inputUrl, { bypassRobots = false } = {}) => {
    let currentUrl = new URL(inputUrl);
    for (let redirect = 0; redirect <= 5; redirect += 1) {
      if (!allowedAssetOrigins.has(currentUrl.origin)) {
        return {
          response: null,
          status: 0,
          reason: "redirect-outside-origin",
        };
      }
      const currentPolicy = policies.get(currentUrl.origin);
      if (
        !bypassRobots &&
        currentPolicy &&
        !currentPolicy.isAllowed(currentUrl)
      ) {
        return { response: null, status: 0, reason: "blocked-by-robots" };
      }

      let response;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await waitForRateLimit(currentUrl);
        requestCount += 1;
        try {
          response = await fetch(currentUrl, {
            headers: {
              Accept: "*/*",
              "User-Agent": USER_AGENT,
            },
            redirect: "manual",
            signal: AbortSignal.timeout(60_000),
          });
        } catch (error) {
          if (attempt === 2) {
            return { response: null, status: 0, reason: error.message };
          }
          await sleep(1000 * 2 ** attempt);
          continue;
        }

        if (
          (response.status === 429 || response.status >= 500) &&
          attempt < 2
        ) {
          await response.body?.cancel();
          await sleep(retryDelay(response, attempt));
          continue;
        }
        break;
      }

      if (!response) {
        return { response: null, status: 0, reason: "request-failed" };
      }
      if (!REDIRECT_STATUSES.has(response.status)) {
        return { response, status: response.status, finalUrl: currentUrl };
      }

      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) {
        return {
          response: null,
          status: response.status,
          reason: "redirect-without-location",
        };
      }
      const nextUrl = normalizeUrl(location, currentUrl);
      if (!nextUrl || !allowedAssetOrigins.has(nextUrl.origin)) {
        return {
          response: null,
          status: response.status,
          reason: "redirect-outside-origin",
        };
      }
      currentUrl = nextUrl;
    }
    return { response: null, status: 0, reason: "too-many-redirects" };
  };

  const download = async (
    inputUrl,
    kind,
    { bypassRobots = false, localPath = null } = {},
  ) => {
    const url = normalizeUrl(inputUrl);
    if (!url || !allowedAssetOrigins.has(url.origin)) {
      throw new Error(`Refusing non-first-party URL: ${inputUrl}`);
    }
    if (records.has(url.href)) {
      const cached = records.get(url.href);
      if (!cached.localPath) {
        return cached;
      }
      const cachedPath = path.join(
        options.archiveDir,
        ...cached.localPath.split("/"),
      );
      try {
        return {
          ...cached,
          body: await readFile(cachedPath),
        };
      } catch {
        records.delete(url.href);
      }
    }

    const fetchedAt = new Date().toISOString();
    const result = await request(url, { bypassRobots });
    if (!result.response) {
      const record = {
        url: url.href,
        localPath: null,
        status: result.status,
        contentType: null,
        bytes: 0,
        sha256: null,
        fetchedAt,
        reason: result.reason ?? "unknown",
      };
      await appendRecord(record);
      console.error(
        `[skip] ${result.status} ${url.href} (${result.reason ?? "unknown"})`,
      );
      return record;
    }

    const remainingRunBytes = options.maxTotalBytes - totalBytesRead;
    if (remainingRunBytes < 1) {
      await result.response.body?.cancel();
      throw new Error(
        `Total byte budget exhausted at ${totalBytesRead} bytes.`,
      );
    }
    let buffer;
    try {
      buffer = await readResponseBuffer(
        result.response,
        Math.min(options.maxResponseBytes, remainingRunBytes),
      );
    } catch (error) {
      await result.response.body?.cancel().catch(() => {});
      const record = {
        url: url.href,
        localPath: null,
        status: 0,
        contentType: null,
        bytes: 0,
        sha256: null,
        fetchedAt,
        reason: `body-read-failed: ${error.message}`,
      };
      await appendRecord(record);
      console.error(`[skip] 0 ${url.href} (${record.reason})`);
      return record;
    }
    totalBytesRead += buffer.length;
    const contentType =
      result.response.headers.get("content-type")?.split(";")[0].trim() ?? null;
    const successful = result.response.ok;
    const relativePath = successful
      ? allocateLocalPath(url, kind, localPath)
      : null;
    if (relativePath) {
      const absolutePath = path.join(
        options.archiveDir,
        ...relativePath.split("/"),
      );
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, buffer);
    }

    const record = toManifestRecord({
      url: url.href,
      localPath: relativePath,
      status: result.response.status,
      contentType,
      bytes: buffer.length,
      sha256: sha256(buffer),
      fetchedAt,
    });
    await appendRecord(record);
    return {
      ...record,
      body: buffer,
    };
  };

  const loadRobotsPolicy = async (origin, localPath) => {
    const robotsUrl = new URL("/robots.txt", origin);
    const robotsRecord = await download(robotsUrl, "asset", {
      bypassRobots: true,
      localPath,
    });
    let robotsPolicy;
    if (robotsRecord.status === 404 || robotsRecord.status === 410) {
      robotsPolicy = parseRobots("", USER_AGENT);
    } else if (robotsRecord.status >= 200 && robotsRecord.status < 300) {
      robotsPolicy = parseRobots(
        robotsRecord.body.toString("utf8"),
        USER_AGENT,
      );
    } else {
      throw new Error(
        `Cannot safely continue: ${robotsUrl.href} returned ${robotsRecord.status}.`,
      );
    }
    policies.set(origin, robotsPolicy);
    return robotsPolicy;
  };

  const mainPolicy = await loadRobotsPolicy(targetOrigin, "meta/robots.txt");
  for (const assetOrigin of options.assetOrigins) {
    await loadRobotsPolicy(
      assetOrigin,
      `meta/assets-${sha256(assetOrigin).slice(0, 12)}.robots.txt`,
    );
  }

  const sitemapQueue = [];
  const configuredSitemaps = mainPolicy.sitemaps.length
    ? mainPolicy.sitemaps
    : [options.sitemap];
  for (const sitemap of configuredSitemaps) {
    const canonical = canonicalizeSitemapUrl(
      sitemap,
      targetOrigin,
      legacyOrigins,
    );
    if (canonical) {
      sitemapQueue.push(canonical.href);
    }
  }
  if (sitemapQueue.length === 0) {
    throw new Error("No same-origin sitemap is available.");
  }

  const sitemapSeen = new Set();
  const sitemapPageUrls = new Set();
  let legacyMappings = 0;
  while (sitemapQueue.length) {
    const sitemapUrl = sitemapQueue.shift();
    if (sitemapSeen.has(sitemapUrl)) {
      continue;
    }
    sitemapSeen.add(sitemapUrl);
    const sitemapRecord = await download(sitemapUrl, "asset", {
      localPath:
        sitemapSeen.size === 1
          ? "meta/sitemap.xml"
          : `meta/sitemaps/${sha256(sitemapUrl).slice(0, 16)}.xml`,
    });
    if (sitemapRecord.status < 200 || sitemapRecord.status >= 300) {
      continue;
    }
    const xml = sitemapRecord.body.toString("utf8");
    const isIndex = /<(?:[\w-]+:)?sitemapindex\b/i.test(xml);
    for (const location of extractSitemapLocs(xml)) {
      const raw = normalizeUrl(location);
      const canonical = canonicalizeSitemapUrl(
        location,
        targetOrigin,
        legacyOrigins,
      );
      if (!canonical) {
        continue;
      }
      if (raw && raw.origin !== targetOrigin) {
        legacyMappings += 1;
      }
      if (isIndex) {
        sitemapQueue.push(canonical.href);
      } else if (isEnglishPageUrl(canonical)) {
        sitemapPageUrls.add(canonical.href);
      }
    }
  }

  if (sitemapPageUrls.size === 0) {
    throw new Error("The sitemap did not yield any English HTML URLs.");
  }

  console.log(
    `[scope] robots=allow firstPartyOrigins=${allowedAssetOrigins.size} sitemapPages=${sitemapPageUrls.size} legacyMappings=${legacyMappings} delayMs=${Math.max(options.delayMs, ...[...policies.values()].map((entry) => entry.crawlDelayMs))}`,
  );

  const pageQueue = [...sitemapPageUrls].sort();
  const pageQueued = new Set(pageQueue);
  const assetUrls = new Set();
  let pageIndex = 0;
  let htmlSaved = 0;

  while (pageIndex < pageQueue.length && pageIndex < options.maxPages) {
    const pageUrl = pageQueue[pageIndex];
    pageIndex += 1;
    const record = await download(pageUrl, "html");
    if (
      record.status >= 200 &&
      record.status < 300 &&
      record.contentType === "text/html"
    ) {
      htmlSaved += 1;
      const references = extractHtmlReferences(
        record.body.toString("utf8"),
        new URL(pageUrl),
        targetOrigin,
        allowedAssetOrigins,
      );
      for (const discoveredPage of references.pageUrls) {
        if (!pageQueued.has(discoveredPage)) {
          pageQueued.add(discoveredPage);
          pageQueue.push(discoveredPage);
        }
      }
      for (const assetUrl of references.assetUrls) {
        assetUrls.add(assetUrl);
      }
      for (const excludedOrigin of references.excludedOrigins) {
        excludedOrigins.add(excludedOrigin);
      }
    }
    if (pageIndex % 10 === 0 || pageIndex === pageQueue.length) {
      console.log(
        `[pages] ${pageIndex}/${pageQueue.length} saved=${htmlSaved} assets=${assetUrls.size}`,
      );
    }
  }

  const assetQueue = [...assetUrls].sort();
  const assetQueued = new Set(assetQueue);
  let assetIndex = 0;
  let assetsSaved = 0;
  while (
    assetIndex < assetQueue.length &&
    assetIndex < options.maxAssets
  ) {
    const assetUrl = assetQueue[assetIndex];
    assetIndex += 1;
    const record = await download(assetUrl, "asset");
    if (record.status >= 200 && record.status < 300 && record.localPath) {
      assetsSaved += 1;
      if (
        record.contentType === "text/css" ||
        new URL(assetUrl).pathname.toLowerCase().endsWith(".css")
      ) {
        for (const nestedAsset of extractCssAssetUrls(
          record.body.toString("utf8"),
          new URL(assetUrl),
          allowedAssetOrigins,
        )) {
          if (!assetQueued.has(nestedAsset)) {
            assetQueued.add(nestedAsset);
            assetQueue.push(nestedAsset);
          }
        }
      }
    }
    if (assetIndex % 10 === 0 || assetIndex === assetQueue.length) {
      console.log(
        `[assets] ${assetIndex}/${assetQueue.length} saved=${assetsSaved}`,
      );
    }
  }

  const summary = {
    origin: targetOrigin,
    firstPartyAssetOrigins: sorted(allowedAssetOrigins),
    sitemapPages: sitemapPageUrls.size,
    pagesQueued: pageQueue.length,
    pagesFetched: pageIndex,
    htmlSaved,
    assetsFetched: assetIndex,
    assetsSaved,
    manifestEntries: records.size,
    requestsIncludingRetriesAndRedirects: requestCount,
    responseByteBudget: options.maxResponseBytes,
    totalByteBudget: options.maxTotalBytes,
    totalBytesRead,
    excludedOrigins: sorted(excludedOrigins),
  };
  await rename(manifestTempPath, manifestPath);
  console.log(`[done] ${JSON.stringify(summary)}`);
  return summary;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    printHelp();
    return;
  }
  await runCrawler(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(`[fatal] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
