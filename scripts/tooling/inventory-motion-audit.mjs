import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const archiveRoot = path.join(root, "research", "reference-site", "archive");
const manifestPath = path.join(archiveRoot, "manifest.jsonl");
const sourceRoot = path.join(root, "src", "site");
const workerPath = path.join(root, "src", "worker", "index.js");
const reportsRoot = path.join(root, ".tmp", "reports");
const csvPath = path.join(reportsRoot, "research-espacio-motion-candidates.csv");
const auditPath = path.join(reportsRoot, "research-espacio-motion-audit.md");

const candidateClasses = ["A_M", "A_I", "A_X", "A_F"];
const textualTypes = new Set([
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/plain",
  "text/xml",
  "application/xml",
  "application/json",
]);

const definitions = [
  { pattern: /@keyframes\s+[-\w]+/gi, scope: ["css"], kind: "css-keyframes", classification: "A_M", visibility: "visible", reason: "CSS keyframe declaration" },
  { pattern: /\banimation(?:-[a-z-]+)?\s*:/gi, scope: ["css"], kind: "css-animation", classification: "A_M", visibility: "visible", reason: "CSS animation property" },
  { pattern: /\btransition(?:-[a-z-]+)?\s*:/gi, scope: ["css"], kind: "css-transition", classification: "A_M", visibility: "visible", reason: "CSS transition property" },
  { pattern: /prefers-reduced-motion/gi, scope: ["css", "js"], kind: "reduced-motion", classification: "A_M", visibility: "visible", reason: "Reduced-motion branch changes presentation behavior" },
  { pattern: /\bscroll-behavior\s*:/gi, scope: ["css"], kind: "css-scroll-behavior", classification: "A_M", visibility: "visible", reason: "Native scroll behavior declaration" },
  { pattern: /\bscroll-snap(?:-[a-z-]+)?\s*:/gi, scope: ["css"], kind: "css-scroll-snap", classification: "A_M", visibility: "visible", reason: "CSS scroll-snap can change scroll presentation" },
  { pattern: /@media\b/gi, scope: ["css"], kind: "css-media-query", classification: "A_I", visibility: "interaction", reason: "Responsive media branch; runtime effect requires Phase B" },
  { pattern: /:hover\b|:focus-visible\b|:active\b/gi, scope: ["css"], kind: "interaction-selector", classification: "A_I", visibility: "interaction", reason: "Interaction selector; static scan does not infer visual effect" },
  { pattern: /:focus-within\b|:focus(?![-\w])/gi, scope: ["css"], kind: "css-focus-selector", classification: "A_I", visibility: "interaction", reason: "Focus selector; static scan does not infer visual effect" },
  { pattern: /\bgsap(?:\.[A-Za-z]+)?\b/gi, scope: ["js"], kind: "gsap", classification: "A_M", visibility: "visible", reason: "GSAP motion hook" },
  { pattern: /\b(?:Barba|barba)\b/gi, scope: ["js"], kind: "barba", classification: "A_M", visibility: "visible", reason: "Route lifecycle or transition hook" },
  { pattern: /\bLocomotiveScroll\b/gi, scope: ["js"], kind: "locomotive-scroll", classification: "A_M", visibility: "visible", reason: "Smooth-scroll motion hook" },
  { pattern: /\brequestAnimationFrame\b/gi, scope: ["js"], kind: "request-animation-frame", classification: "A_M", visibility: "visible", reason: "Frame-scheduled motion hook" },
  { pattern: /\b(?:setTimeout|setInterval)\s*\(/gi, scope: ["js"], kind: "timer", classification: "A_I", visibility: "interaction", reason: "Timer lifecycle/control source; motion effect requires an explicit motion signal or Phase B" },
  { pattern: /\b(?:cancelAnimationFrame|clearTimeout|clearInterval)\s*\(/gi, scope: ["js"], kind: "animation-control", classification: "A_I", visibility: "interaction", reason: "Animation or timer lifecycle control; runtime effect requires Phase B" },
  { pattern: /\b(?:IntersectionObserver|MutationObserver|ResizeObserver)\b/gi, scope: ["js"], kind: "observer", classification: "A_I", visibility: "interaction", reason: "Observer lifecycle/control source; motion effect requires an explicit motion signal or Phase B" },
  { pattern: /\.animate\s*\(/gi, scope: ["js"], kind: "web-animation", classification: "A_M", visibility: "visible", reason: "Element animation API hook" },
  { pattern: /\bstyle\.(?:transform|opacity|translate|scale|rotate|animation(?:Name|Duration|TimingFunction|Delay|IterationCount|PlayState|FillMode|Direction)?|transition(?:Property|Duration|TimingFunction|Delay)?|left|right|top|bottom|height|width|willChange)\s*=/gi, scope: ["js"], kind: "direct-style-assignment", classification: "A_M", visibility: "visible", reason: "Direct assignment to motion-capable style property" },
  { pattern: /\bstyle\.(?!(?:transform|opacity|translate|scale|rotate|animation(?:Name|Duration|TimingFunction|Delay|IterationCount|PlayState|FillMode|Direction)?|transition(?:Property|Duration|TimingFunction|Delay)?|left|right|top|bottom|height|width|willChange)\s*=)[A-Za-z_$][\w$]*\s*=/gi, scope: ["js"], kind: "direct-style-control", classification: "A_I", visibility: "interaction", reason: "Direct style control; motion capability is not statically established" },
  { pattern: /\bautoplay\b|\.\s*play\s*\(/gi, scope: ["js"], kind: "media-playback", classification: "A_M", visibility: "visible", reason: "Media playback can produce visible or audible motion" },
  { pattern: /\.pause\s*\(/gi, scope: ["js"], kind: "media-control", classification: "A_I", visibility: "interaction", reason: "Media lifecycle control; runtime effect requires Phase B" },
  { pattern: /\b(?:CSSStyleSheet|insertRule)\b/gi, scope: ["js"], kind: "stylesheet-mutation", classification: "A_I", visibility: "interaction", reason: "Stylesheet lifecycle mutation; resulting presentation requires Phase B" },
  { pattern: /\b(?:data-(?:motion|barba|transition)[\w-]*)\b/gi, scope: ["html"], kind: "inline-motion-hook", classification: "A_M", visibility: "visible", reason: "Explicit inline motion or lifecycle hook" },
  { pattern: /\bdata-scroll(?:-[\w-]+)?\b/gi, scope: ["html"], kind: "scroll-container-hook", classification: "A_M", visibility: "visible", reason: "Explicit scroll-container or scroll-speed hook" },
  { pattern: /\bstyle\s*=\s*["'][^"']*(?:transition|animation|transform|opacity|scroll-behavior|translate|scale|rotate)[^"']*["']/gi, scope: ["html"], kind: "inline-style-motion", classification: "A_M", visibility: "visible", reason: "Inline style contains a motion-capable property" },
  { pattern: /\bstyle\s*=\s*["'](?![^"']*(?:transition|animation|transform|opacity|scroll-behavior|translate|scale|rotate))[^"']*["']/gi, scope: ["html"], kind: "inline-style-control", classification: "A_I", visibility: "interaction", reason: "Inline style is present but motion capability is not statically established" },
  { pattern: /\bon[a-z][\w-]*\s*=/gi, scope: ["html"], kind: "inline-event-handler", classification: "A_I", visibility: "interaction", reason: "Inline event handler; runtime effect requires Phase B" },
  { pattern: /\b(?:rel\s*=\s*["']stylesheet["']|<script\b[^>]*\bsrc\s*=)/gi, scope: ["html"], kind: "resource-reference", classification: "A_I", visibility: "interaction", reason: "Stylesheet or script lifecycle reference" },
  { pattern: /<(?:audio|video|iframe)\b[^>]*>/gi, scope: ["html"], kind: "media-element", classification: "A_M", visibility: "visible", reason: "Embedded media element is statically motion-capable" },
  { pattern: /<dialog\b/gi, scope: ["html"], kind: "dialog-control", classification: "A_I", visibility: "interaction", reason: "Dialog state control; runtime transition requires Phase B" },
  { pattern: /\b(?:pointermove|pointerdown|pointerup|pointerenter|pointerleave|pointercancel|mousemove|mouseenter|mouseleave|touchstart|touchmove|touchend|touchcancel|click|keydown|keyup|wheel|scroll)\b/gi, scope: ["js"], kind: "interaction-event", classification: "A_I", visibility: "interaction", reason: "Interaction event source; runtime effect requires Phase B" },
  { pattern: /\baddEventListener\s*\(/gi, scope: ["js"], kind: "event-listener", classification: "A_I", visibility: "interaction", reason: "Documented event listener; runtime effect requires Phase B" },
  { pattern: /\b(?:classList\.(?:add|remove|toggle)|style\.(?:setProperty|removeProperty)|setAttribute|removeAttribute)\b/gi, scope: ["js"], kind: "dom-mutation", classification: "A_I", visibility: "interaction", reason: "DOM state mutation; visibility depends on target and runtime state" },
  { pattern: /\b(?:matchMedia|visibilitychange|languagechange)\b/gi, scope: ["js"], kind: "media-or-lifecycle", classification: "A_I", visibility: "interaction", reason: "Media or lifecycle branch; runtime effect requires Phase B" },
  { pattern: /\b(?:scrollTo|scrollTop|scrollY|scrollLeft)\b/gi, scope: ["js"], kind: "scroll-state", classification: "A_I", visibility: "interaction", reason: "Scroll state source; runtime effect requires Phase B" },
  { pattern: /\.(?:showModal|close)\s*\(/gi, scope: ["js"], kind: "dialog-control", classification: "A_I", visibility: "interaction", reason: "Dialog lifecycle control; runtime effect requires Phase B" },
];

const vendorPattern = /(?:https?:\/\/[^"'\s>]*(?:gsap|locomotive|barba)[^"'\s>]*|(?:src|href)\s*=\s*["'][^"']*(?:gsap|locomotive|barba)[^"']*["'])/gi;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeUrl(value) {
  const parsed = new URL(value);
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) parsed.port = "";
  parsed.pathname = parsed.pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  parsed.hash = "";
  const query = [...parsed.searchParams.entries()].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  parsed.search = query.length ? `?${query.map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`).join("&")}` : "";
  return parsed.toString();
}

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function lineColumn(text, offset) {
  let line = 1;
  let lastNewline = -1;
  for (let index = text.indexOf("\n"); index !== -1 && index < offset; index = text.indexOf("\n", index + 1)) {
    line += 1;
    lastNewline = index;
  }
  return { line, column: offset - lastNewline };
}

function byteOffset(text, offset) {
  return Buffer.byteLength(text.slice(0, offset), "utf8");
}

function isInsideRange(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function extractEmbeddedBlocks(text) {
  const styleBlocks = [];
  const scriptBlocks = [];
  const inlineScriptBlocks = [];
  const blockPattern = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of text.matchAll(blockPattern)) {
    const full = match[0];
    const openEnd = full.indexOf(">") + 1;
    const closeStart = full.lastIndexOf("</");
    const bodyStart = match.index + openEnd;
    const bodyEnd = match.index + closeStart;
    const block = {
      tag: match[1].toLowerCase(),
      start: bodyStart,
      end: bodyEnd,
      attributes: match[2] || "",
    };
    if (block.tag === "style") styleBlocks.push(block);
    else {
      scriptBlocks.push(block);
      if (!/\bsrc\s*=/i.test(block.attributes)) inlineScriptBlocks.push(block);
    }
  }
  return { styleBlocks, scriptBlocks, inlineScriptBlocks };
}

function maskEmbeddedBodies(text, blocks) {
  const chars = text.split("");
  for (const block of [...blocks.styleBlocks, ...blocks.scriptBlocks]) {
    for (let index = block.start; index < block.end; index += 1) {
      if (chars[index] !== "\n" && chars[index] !== "\r") chars[index] = " ";
    }
  }
  return chars.join("");
}

function readManifest() {
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map((line, index) => ({ ...JSON.parse(line), manifestLine: index + 1 }));
}

function contentVariantKey(resource) {
  return [resource.normalizedUrl, resource.status, resource.sha256, resource.contentType].join("\u001f");
}

function createCandidate({ system, resource, contentHash, text, start, end, kind, classification, visibility, reason, sourceAnchor, contentVariantId, proofState = "N/A" }) {
  const offsets = {
    byteStart: byteOffset(text, start),
    byteEnd: byteOffset(text, end),
  };
  const location = lineColumn(text, start);
  const identityBasis = [system, resource, contentHash, kind, `${offsets.byteStart}:${offsets.byteEnd}`].join("|");
  return {
    candidate_id: `cand-${sha256(identityBasis).slice(0, 24)}`,
    system,
    resource,
    content_variant_id: contentVariantId,
    classification,
    motion_kind: kind,
    visibility,
    proof_state: proofState,
    source_anchor: sourceAnchor || `${resource}:L${location.line}:${location.column}`,
    identity_basis: identityBasis,
    byte_start: offsets.byteStart,
    byte_end: offsets.byteEnd,
    line: location.line,
    column: location.column,
    reason,
  };
}

function contentLanguage(contentType, resource) {
  if (contentType === "text/css" || /\.css$/i.test(resource)) return "css";
  if (contentType === "text/html" || /\.html?$/i.test(resource)) return "html";
  if (contentType === "application/javascript" || contentType === "text/javascript" || /\.js$/i.test(resource)) return "js";
  return "generic";
}

function scanText({ system, resource, contentHash, contentVariantId, text, coordinateText = text, offsetBase = 0, occupied = new Set(), sourceAnchorPrefix = resource, vendorOnly = false, language = "generic" }) {
  const findings = [];
  const vendorRanges = [];
  for (const match of text.matchAll(vendorPattern)) {
    const start = match.index;
    const end = start + match[0].length;
    const absoluteStart = offsetBase + start;
    const absoluteEnd = offsetBase + end;
    vendorRanges.push({ start: absoluteStart, end: absoluteEnd });
    findings.push(createCandidate({
      system,
      resource,
      contentHash,
      text: coordinateText,
      start: absoluteStart,
      end: absoluteEnd,
      kind: "vendor-library",
      classification: "A_X",
      visibility: "excluded",
      reason: "Vendor library reference is outside first-party motion candidate ownership",
      sourceAnchor: `${sourceAnchorPrefix}:L${lineColumn(coordinateText, absoluteStart).line}:${lineColumn(coordinateText, absoluteStart).column}`,
      contentVariantId,
    }));
  }

  if (vendorOnly) {
    if (!findings.length) {
      findings.push(createCandidate({
        system,
        resource,
        contentHash,
        text: coordinateText,
        start: offsetBase,
        end: offsetBase + text.length,
        kind: "vendor-library",
        classification: "A_X",
        visibility: "excluded",
        reason: "Archive vendor library is outside first-party motion candidate ownership",
        sourceAnchor: `${sourceAnchorPrefix}:whole-resource`,
        contentVariantId,
      }));
    }
    return findings;
  }

  for (const definition of definitions) {
    if (!definition.scope.includes(language)) continue;
    for (const match of text.matchAll(definition.pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      const absoluteStart = offsetBase + start;
      const absoluteEnd = offsetBase + end;
      const key = `${absoluteStart}:${absoluteEnd}:${definition.kind}`;
      if (occupied.has(key) || isInsideRange(absoluteStart, absoluteEnd, vendorRanges)) continue;
      occupied.add(key);
      findings.push(createCandidate({
        system,
        resource,
        contentHash,
        text: coordinateText,
        start: absoluteStart,
        end: absoluteEnd,
        kind: definition.kind,
        classification: definition.classification,
        visibility: definition.visibility,
        reason: definition.reason,
        sourceAnchor: `${sourceAnchorPrefix}:L${lineColumn(coordinateText, absoluteStart).line}:${lineColumn(coordinateText, absoluteStart).column}`,
        contentVariantId,
        proofState: definition.classification === "A_M" ? "P" : "N/A",
      }));
    }
  }
  return findings;
}

function scanHtmlDocument({ system, resource, contentHash, contentVariantId, text, sourceAnchorPrefix = resource }) {
  const blocks = extractEmbeddedBlocks(text);
  const occupied = new Set();
  const findings = scanText({
    system,
    resource,
    contentHash,
    contentVariantId,
    text: maskEmbeddedBodies(text, blocks),
    coordinateText: text,
    occupied,
    sourceAnchorPrefix,
    language: "html",
  });
  for (const block of blocks.styleBlocks) {
    findings.push(...scanText({
      system,
      resource,
      contentHash,
      contentVariantId,
      text: text.slice(block.start, block.end),
      coordinateText: text,
      offsetBase: block.start,
      occupied,
      sourceAnchorPrefix,
      language: "css",
    }));
  }
  for (const block of blocks.inlineScriptBlocks) {
    findings.push(...scanText({
      system,
      resource,
      contentHash,
      contentVariantId,
      text: text.slice(block.start, block.end),
      coordinateText: text,
      offsetBase: block.start,
      occupied,
      sourceAnchorPrefix,
      language: "js",
    }));
  }
  return {
    findings,
    embedded: {
      styleBlocks: blocks.styleBlocks.length,
      inlineScriptBlocks: blocks.inlineScriptBlocks.length,
    },
  };
}

function parseText(buffer) {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

function archiveFilePath(localPath) {
  const resolved = path.resolve(archiveRoot, localPath);
  const prefix = `${archiveRoot}${path.sep}`;
  if (resolved !== archiveRoot && !resolved.startsWith(prefix)) throw new Error(`Archive path escapes archive root: ${localPath}`);
  return resolved;
}

function collectSourceFiles() {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile() && /\.(?:html|css|js)$/i.test(entry.name)) files.push(fullPath);
    }
  };
  visit(sourceRoot);
  files.push(workerPath);
  return [...new Set(files)].sort((a, b) => relative(a).localeCompare(relative(b)));
}

function scanArchive(rows, candidates) {
  const byVariant = new Map();
  for (const row of rows) {
    const normalizedUrl = normalizeUrl(row.url);
    const enriched = { ...row, normalizedUrl };
    const key = contentVariantKey(enriched);
    const existing = byVariant.get(key);
    if (existing) existing.occurrences.push(enriched);
    else byVariant.set(key, { key, occurrences: [enriched] });
  }

  const variants = [...byVariant.values()].sort((a, b) => a.key.localeCompare(b.key));
  const statuses = { parsed: 0, binary_excluded: 0, parse_failure: 0 };
  const embedded = { htmlVariants: 0, styleBlocks: 0, inlineScriptBlocks: 0 };
  const contentKinds = new Map();
  const variantRows = [];

  for (const variant of variants) {
    const first = variant.occurrences[0];
    const variantId = `esp-cv-${sha256(variant.key).slice(0, 20)}`;
    const record = {
      content_variant_id: variantId,
      normalized_url: first.normalizedUrl,
      status: first.status,
      content_hash: first.sha256,
      content_type: first.contentType,
      local_path: first.localPath,
      occurrences: variant.occurrences.length,
      manifest_lines: variant.occurrences.map((item) => item.manifestLine).join(","),
      scan_status: "",
      candidate_count: 0,
    };

    if (first.status < 200 || first.status >= 300) continue;
    const localFile = archiveFilePath(first.localPath);
    const buffer = fs.readFileSync(localFile);
    const actualHash = sha256(buffer);
    if (actualHash !== first.sha256 || buffer.length !== first.bytes) {
      throw new Error(`Archive integrity mismatch at manifest line ${first.manifestLine}: ${first.localPath}`);
    }

    if (!textualTypes.has(first.contentType)) {
      record.scan_status = "binary_excluded";
      statuses.binary_excluded += 1;
      record.candidate_count = 0;
      contentKinds.set(first.contentType, (contentKinds.get(first.contentType) || 0) + 1);
      variantRows.push(record);
      continue;
    }

    try {
      const text = parseText(buffer);
      const vendorOnly = /(?:^|[\\/])js[\\/]vendor[\\/]/i.test(first.localPath);
      const language = contentLanguage(first.contentType, first.localPath);
      const scanned = language === "html"
        ? scanHtmlDocument({
          system: "espacio-archive",
          resource: first.normalizedUrl,
          contentHash: first.sha256,
          contentVariantId: variantId,
          text,
          sourceAnchorPrefix: `${first.localPath} (manifest ${first.manifestLine})`,
        })
        : {
          findings: scanText({
            system: "espacio-archive",
            resource: first.normalizedUrl,
            contentHash: first.sha256,
            contentVariantId: variantId,
            text,
            sourceAnchorPrefix: `${first.localPath} (manifest ${first.manifestLine})`,
            vendorOnly,
            language,
          }),
          embedded: { styleBlocks: 0, inlineScriptBlocks: 0 },
        };
      const found = scanned.findings;
      if (language === "html") {
        embedded.htmlVariants += 1;
        embedded.styleBlocks += scanned.embedded.styleBlocks;
        embedded.inlineScriptBlocks += scanned.embedded.inlineScriptBlocks;
      }
      candidates.push(...found);
      record.scan_status = "parsed";
      record.candidate_count = found.length;
      statuses.parsed += 1;
      contentKinds.set(first.contentType, (contentKinds.get(first.contentType) || 0) + 1);
    } catch (error) {
      const found = createCandidate({
        system: "espacio-archive",
        resource: first.normalizedUrl,
        contentHash: first.sha256,
        text: "",
        start: 0,
        end: 0,
        kind: "parse-failure-sentinel",
        classification: "A_F",
        visibility: "failure",
        proofState: "N/A",
        reason: `Static parse failed: ${error instanceof Error ? error.message : String(error)}`,
        sourceAnchor: `${first.localPath} (manifest ${first.manifestLine})`,
        contentVariantId: variantId,
      });
      candidates.push(found);
      record.scan_status = "parse_failure";
      record.candidate_count = 1;
      statuses.parse_failure += 1;
      contentKinds.set(first.contentType, (contentKinds.get(first.contentType) || 0) + 1);
    }
    variantRows.push(record);
  }

  return { variants, variantRows, statuses, contentKinds, embedded };
}

function scanFirstPartySources(candidates) {
  const files = collectSourceFiles();
  const sourceRows = [];
  const embedded = { htmlFiles: 0, styleBlocks: 0, inlineScriptBlocks: 0 };
  for (const filePath of files) {
    const buffer = fs.readFileSync(filePath);
    const text = parseText(buffer);
    const relativePath = relative(filePath);
    const contentHash = sha256(buffer);
    const contentVariantId = `tt-cv-${sha256(`${relativePath}|${contentHash}`).slice(0, 20)}`;
    const language = contentLanguage("", relativePath);
    const scanned = language === "html"
      ? scanHtmlDocument({
        system: "truong-thinh",
        resource: relativePath,
        contentHash,
        contentVariantId,
        text,
        sourceAnchorPrefix: relativePath,
      })
      : {
        findings: scanText({
          system: "truong-thinh",
          resource: relativePath,
          contentHash,
          contentVariantId,
          text,
          sourceAnchorPrefix: relativePath,
          language,
        }),
        embedded: { styleBlocks: 0, inlineScriptBlocks: 0 },
      };
    const found = scanned.findings;
    if (language === "html") {
      embedded.htmlFiles += 1;
      embedded.styleBlocks += scanned.embedded.styleBlocks;
      embedded.inlineScriptBlocks += scanned.embedded.inlineScriptBlocks;
    }
    candidates.push(...found);
    sourceRows.push({
      path: relativePath,
      content_hash: contentHash,
      bytes: buffer.length,
      candidate_count: found.length,
      embedded_style_blocks: scanned.embedded.styleBlocks,
      inline_script_blocks: scanned.embedded.inlineScriptBlocks,
    });
  }
  return { files, sourceRows, embedded };
}

function classifyCandidates(candidates) {
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidateClasses.includes(candidate.classification)) throw new Error(`Unsupported candidate classification: ${candidate.classification}`);
    if (seen.has(candidate.candidate_id)) throw new Error(`Duplicate candidate identity: ${candidate.candidate_id}`);
    seen.add(candidate.candidate_id);
  }
  candidates.sort((a, b) => a.system.localeCompare(b.system) || a.resource.localeCompare(b.resource) || a.byte_start - b.byte_start || a.byte_end - b.byte_end || a.motion_kind.localeCompare(b.motion_kind) || a.candidate_id.localeCompare(b.candidate_id));
  const counts = Object.fromEntries(candidateClasses.map((name) => [name, candidates.filter((candidate) => candidate.classification === name).length]));
  const motionProof = {
    P: candidates.filter((candidate) => candidate.classification === "A_M" && candidate.proof_state === "P").length,
    U: candidates.filter((candidate) => candidate.classification === "A_M" && candidate.proof_state === "U").length,
  };
  if (counts.A_M !== motionProof.P + motionProof.U || motionProof.U !== 0) throw new Error(`Motion proof equation failed: A_M=${counts.A_M}, P=${motionProof.P}, U=${motionProof.U}`);
  if (counts.A_M + counts.A_I + counts.A_X + counts.A_F !== candidates.length) throw new Error("Candidate equation failed");
  return { counts, motionProof, uniqueIds: seen.size };
}

function writeCsv(candidates) {
  const columns = ["candidate_id", "system", "resource", "content_variant_id", "classification", "motion_kind", "visibility", "proof_state", "source_anchor", "identity_basis", "byte_start", "byte_end", "line", "column", "reason"];
  const lines = [columns.join(",")];
  for (const candidate of candidates) lines.push(columns.map((column) => csvEscape(candidate[column])).join(","));
  fs.writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf8");
}

function formatTable(rows) {
  if (!rows.length) return "";
  const separator = rows[0].map(() => "---");
  return [rows[0], separator, ...rows.slice(1)].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function writeAudit({ rows, archive, sources, candidateSummary, successVariants, capturedFrom, capturedTo }) {
  const resourceCounts = {
    total: rows.length,
    success: rows.filter((row) => row.status >= 200 && row.status < 300).length,
    failure: rows.filter((row) => row.status < 200 || row.status >= 300).length,
    uniqueUrl: new Set(rows.map((row) => row.normalizedUrl)).size,
  };
  resourceCounts.duplicateOccurrence = resourceCounts.total - resourceCounts.uniqueUrl;
  const textVariantCount = archive.variantRows.filter((row) => row.scan_status === "parsed" || row.scan_status === "parse_failure").length;
  const binaryVariantCount = archive.variantRows.filter((row) => row.scan_status === "binary_excluded").length;
  const equations = [
    ["R_total", resourceCounts.total, "manifest.jsonl raw rows"],
    ["R_success", resourceCounts.success, "status 2xx"],
    ["R_failure", resourceCounts.failure, "status non-2xx"],
    ["R_unique_url", resourceCounts.uniqueUrl, "normalized URL"],
    ["R_duplicate_occurrence", resourceCounts.duplicateOccurrence, "R_total - R_unique_url"],
  ];
  const candidateRows = [
    ["A", candidateSummary.counts.A_M + candidateSummary.counts.A_I + candidateSummary.counts.A_X + candidateSummary.counts.A_F, "A_M + A_I + A_X + A_F"],
    ["A_M", candidateSummary.counts.A_M, "visible motion candidates"],
    ["A_I", candidateSummary.counts.A_I, "non-visible interaction candidates"],
    ["A_X", candidateSummary.counts.A_X, "explicit exclusions, including vendor references"],
    ["A_F", candidateSummary.counts.A_F, "parse-failure sentinels"],
    ["P", candidateSummary.motionProof.P, "statically classified motion-capable candidate; not runtime effect proof"],
    ["U", candidateSummary.motionProof.U, "unresolved motion candidate; Phase A gate requires zero"],
  ];

  const sourceList = sources.sourceRows.map((source) => `| [${source.path}](../../${source.path}) | ${source.bytes} | ${source.content_hash} | ${source.candidate_count} |`).join("\n");
  const contentTypeRows = [...archive.contentKinds.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => `| ${type} | ${count} |` ).join("\n");

  const markdown = `# Phase A static motion inventory Espacio và Trường Thịnh

## 1. Kết quả

Scanner deterministic đã chạy trên archive cố định và closed-world first-party
source boundary. Phase A đạt các gate accounting: resource equations cân bằng,
content-variant scan bao phủ mọi successful variant, candidate equations cân bằng,
và <code>U=0</code>. CSV là candidate ledger authoritative; raw resource rows vẫn chỉ ở
<code>research/reference-site/archive/manifest.jsonl</code>.

## 2. Resource accounting

Archive snapshot captured between <code>${capturedFrom}</code> and <code>${capturedTo}</code>. Đây là
fixed captured corpus, không phải current live Espacio.

${formatTable([["Equation", "Value", "Basis"], ...equations])}

Verified invariants: <code>R_total=6100</code>, <code>R_success=6054</code>, <code>R_failure=46</code>,
<code>R_unique_url=5855</code>, <code>R_duplicate_occurrence=245</code>.

## 3. Content-variant inventory

Identity: normalized URL + status + content hash + content type. Successful
variants: **${successVariants}**; duplicate occurrences remain represented only by
the manifest accounting. Every successful variant was read, hash/byte checked
against the manifest, then assigned one scan status:

| Scan status | Variants |
| --- | ---: |
| parsed textual content | ${archive.statuses.parsed} |
| binary/static exclusion | ${archive.statuses.binary_excluded} |
| parse-failure sentinel | ${archive.statuses.parse_failure} |
| **total classified successful variants** | **${archive.statuses.parsed + archive.statuses.binary_excluded + archive.statuses.parse_failure}** |

Successful variants by content type:

| Content type | Variants |
| --- | ---: |
${contentTypeRows}

No raw manifest row was copied into this report or CSV.

Embedded block scan coverage (document-relative offsets and line/column metadata
are retained in the candidate ledger):

| Boundary | HTML units | Embedded <code>&lt;style&gt;</code> blocks scanned | Inline <code>&lt;script&gt;</code> bodies scanned |
| --- | ---: | ---: | ---: |
| Espacio archive successful HTML variants | ${archive.embedded.htmlVariants} | ${archive.embedded.styleBlocks} | ${archive.embedded.inlineScriptBlocks} |
| Trường Thịnh closed-world HTML source files | ${sources.embedded.htmlFiles} | ${sources.embedded.styleBlocks} | ${sources.embedded.inlineScriptBlocks} |
| **Total** | **${archive.embedded.htmlVariants + sources.embedded.htmlFiles}** | **${archive.embedded.styleBlocks + sources.embedded.styleBlocks}** | **${archive.embedded.inlineScriptBlocks + sources.embedded.inlineScriptBlocks}** |

## 4. Candidate taxonomy

Candidate identity is stable: archive candidates use system + normalized resource
URL + content hash + signal kind + byte range; Trường Thịnh candidates use relative
source path + content hash + signal kind + byte range. Exact same-kind/same-range
signals are deduplicated; line and column are metadata only.

${formatTable([["Equation", "Value", "Meaning"], ...candidateRows])}

The ledger contains **${candidateSummary.uniqueIds}** unique stable candidate IDs.
<code>A_M=${candidateSummary.counts.A_M}=P(${candidateSummary.motionProof.P})+U(${candidateSummary.motionProof.U})</code>.
<code>P</code> means a statically classified motion-capable candidate, not proof of a
visible runtime effect. Phase B owns visible-effect confirmation.

## 5. Scanner boundary and classification rules

- Espacio input: archive manifest plus local files referenced by successful rows.
  HTML/CSS/JS/XML/plain text are parsed; image/font and other binary resources are
  scanned for integrity then explicitly excluded from text motion parsing.
- Trường Thịnh input: every <code>src/site/**/*.html</code>, <code>src/site/**/*.css</code>,
  <code>src/site/**/*.js</code>, and <code>src/worker/index.js</code>. Tests are evidence/harness,
  not production candidates.
- Enumerated signals include CSS transition/animation/keyframes/reduced-motion,
  explicit inline motion hooks, GSAP, Barba, Locomotive, requestAnimationFrame,
  timers, observers, scroll state, DOM mutation and event/pointer/keyboard hooks.
  Generic selectors do not prove motion; they are <code>A_I</code> interaction candidates.
- Additional deterministic surface coverage includes CSS <code>@media</code>,
  scroll-snap and focus/focus-within selectors; JavaScript animation/timer cancel,
  media play/pause/autoplay, stylesheet mutation, direct style assignment and
  pointer/touch cancel; HTML inline style/on* attributes, stylesheet/script refs,
  audio/video/iframe, dialog and explicit scroll-container hooks. HTML documents
  additionally scan each embedded <code>&lt;style&gt;</code> body as CSS and each
  inline non-<code>src</code> <code>&lt;script&gt;</code> body as JS; external script
  tags remain resource references.
- Vendor libraries are <code>A_X</code> with an exact exclusion reason. Parse errors create
  one <code>A_F</code> sentinel instead of being silently dropped.

Trường Thịnh source files:

| Source | Bytes | SHA-256 | Candidates |
| --- | ---: | --- | ---: |
${sourceList}

## 6. Archive/live boundary

Archive numbers above describe the local capture only. Live Espacio observations
in the parity report are timestamped coverage of measured routes/viewports and
must not be read as whole-site exhaustiveness. The sitemap's legacy host is
provenance evidence, not proof that every archived URL is current live behavior.

## 7. Blockers and Phase B handoff

- Graphify primary structural query succeeded with fresh AST evidence; semantic
  extraction stayed pending and was not updated. A later worker sandbox attempt
  hit access denied while writing <code>.tooling/logs</code> and acquiring
  <code>.tooling/state/graphify/graphify.lock</code>; this is an attempt-local
  sandbox issue, not a general Graphify blocker. No lock or cache was changed by
  this Phase A worker. Serena remained active with <code>codex</code> context and
  ready language servers.
- Runtime is out of scope here. Phase B must measure candidate visibility/effect,
  interaction transitions, route/menu timelines, reduced-motion behavior, and
  representative live route coverage with fresh runtime evidence.
- Phase B must preserve archive/live distinction and report failures as environment
  blockers when a server or browser connection dies; do not label that a product
  failure without a product observation.

Reproduce:

~~~powershell
node scripts/tooling/inventory-motion-audit.mjs
~~~

Outputs: [candidate ledger](research-espacio-motion-candidates.csv), this report,
and no archive mutation.

## Chú thích thuật ngữ

- **Resource occurrence**: một raw manifest row.
- **Content variant**: cùng normalized URL, status, hash và content type.
- **Candidate**: một deterministic static motion or interaction signal.
- **A_X**: explicit exclusion with a recorded reason.
- **A_F**: parse-failure sentinel.
- **P/U**: <code>P</code> is a statically classified motion-capable candidate,
  not runtime effect proof; <code>U</code> is unresolved static motion state and
  Phase A requires <code>U=0</code>.
`;
  fs.writeFileSync(auditPath, markdown, "utf8");
}

function main() {
  fs.mkdirSync(reportsRoot, { recursive: true });
  const rows = readManifest().map((row) => ({ ...row, normalizedUrl: normalizeUrl(row.url) }));
  const candidates = [];
  const archive = scanArchive(rows, candidates);
  const sources = scanFirstPartySources(candidates);
  const candidateSummary = classifyCandidates(candidates);
  const successRows = rows.filter((row) => row.status >= 200 && row.status < 300);
  const successVariants = archive.variantRows.length;
  if (successRows.length !== 6054 || rows.length !== 6100 || new Set(rows.map((row) => row.normalizedUrl)).size !== 5855) throw new Error("Archive accounting invariants changed");
  if (successVariants !== 5809) throw new Error(`Successful content-variant invariant changed: ${successVariants}`);
  if (archive.statuses.parsed + archive.statuses.binary_excluded + archive.statuses.parse_failure !== successVariants) throw new Error("Successful variant scan equation failed");
  writeCsv(candidates);
  const fetched = rows.map((row) => row.fetchedAt).filter(Boolean).sort();
  writeAudit({ rows, archive, sources, candidateSummary, successVariants, capturedFrom: fetched[0] || "unknown", capturedTo: fetched.at(-1) || "unknown" });
  console.log(JSON.stringify({
    resources: { total: rows.length, success: successRows.length, failure: rows.length - successRows.length, uniqueUrl: new Set(rows.map((row) => row.normalizedUrl)).size, duplicateOccurrence: rows.length - new Set(rows.map((row) => row.normalizedUrl)).size },
    successfulVariants: { total: successVariants, ...archive.statuses },
    embeddedBlocks: {
      archive: archive.embedded,
      sources: sources.embedded,
      total: {
        htmlUnits: archive.embedded.htmlVariants + sources.embedded.htmlFiles,
        styleBlocks: archive.embedded.styleBlocks + sources.embedded.styleBlocks,
        inlineScriptBlocks: archive.embedded.inlineScriptBlocks + sources.embedded.inlineScriptBlocks,
      },
    },
    candidates: { ...candidateSummary.counts, total: candidates.length, P: candidateSummary.motionProof.P, U: candidateSummary.motionProof.U, uniqueIds: candidateSummary.uniqueIds },
    outputs: [relative(csvPath), relative(auditPath)],
  }, null, 2));
}

main();
