// AGENTS.md rules a machine can check (docs/specs/docs-system.md R11). Pure functions: callers pass file lists and a reader.
import { dirname, join, normalize } from 'node:path';
import { SECRET_FILE } from '../tooling/pre-tool-guard.mjs';

const TEXT = /\.(m?js|cjs|ts|css|html|md|json|ya?ml|toml|sh|ps1|psm1|py|txt|svg)$/i;
const CODE = /\.(m?js|cjs|ts|css|html|ya?ml|toml|sh|ps1|psm1|py)$/i;
const HASH_COMMENT = /\.(ya?ml|toml|sh|ps1|psm1|py)$/i;
// Pictographs and dingbats; plain symbols such as arrows or the check mark in box-drawing are not emoji.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}]/u;
const VI_LETTER = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;

export function emojiErrors(files, read) {
  const errors = [];
  for (const file of files.filter((f) => TEXT.test(f) && f !== 'pnpm-lock.yaml')) {
    read(file).split('\n').forEach((line, i) => {
      if (EMOJI.test(line)) errors.push(`emoji: ${file}:${i + 1}: AGENTS.md bans emoji; write plain words`);
    });
  }
  return errors;
}

// Comment text of each line: whole-line comments, block comment bodies and trailing comments.
function comments(file, text) {
  const hash = HASH_COMMENT.test(file);
  const out = [];
  let block = false;
  text.split('\n').forEach((line, i) => {
    const s = line.trim();
    let body = null;
    if (block) {
      body = line;
      if (/\*\/|-->/.test(line)) block = false;
    } else if (/^(\/\/|\/\*|\*|<!--)/.test(s) || (hash && s.startsWith('#'))) {
      body = s;
      block = (s.startsWith('/*') && !s.includes('*/')) || (s.startsWith('<!--') && !s.includes('-->'));
    } else {
      body = line.match(/\s\/\/\s(.*)$/)?.[1] ?? (hash ? line.match(/\s#\s(.*)$/)?.[1] : null) ?? line.match(/\/\*(.*?)\*\//)?.[1] ?? null;
    }
    if (body) out.push([i + 1, body]);
  });
  return out;
}

// A comment is Vietnamese prose when, after dropping quoted UI copy, at least 3 words and 30% of words carry Vietnamese letters.
// Quoting a Vietnamese label or name inside an English comment stays allowed (AGENTS.md: UI text is not code).
export function isVietnameseProse(comment) {
  const words = comment.replace(/"[^"]*"|`[^`]*`|“[^”]*”/g, ' ').split(/[^\p{L}]+/u).filter(Boolean);
  const vi = words.filter((w) => VI_LETTER.test(w)).length;
  return vi >= 3 && vi / words.length >= 0.3;
}

export function commentLanguageErrors(files, read) {
  const errors = [];
  for (const file of files.filter((f) => CODE.test(f) && !f.startsWith('design-system/'))) {
    for (const [line, body] of comments(file, read(file))) {
      if (isVietnameseProse(body)) errors.push(`comment language: ${file}:${line}: code comments are English (AGENTS.md); quote Vietnamese UI copy inside an English sentence`);
    }
  }
  return errors;
}

// The static site never loads CMS code: src/site may not import src/worker, src/admin or src/db.
export function cmsImportErrors(files, read) {
  const errors = [];
  for (const file of files.filter((f) => f.startsWith('src/site/') && /\.(m?js|cjs|html)$/.test(f))) {
    for (const [, spec] of read(file).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bsrc=)["']([^"']+)["']/g)) {
      const target = spec.startsWith('.') ? normalize(join(dirname(file), spec)) : spec.replace(/^\//, '');
      if (/^src\/(worker|admin|db)\//.test(target)) errors.push(`cms import: ${file} loads ${spec}; static pages never use CMS code (AGENTS.md)`);
    }
  }
  return errors;
}

// New Markdown files carry a descriptive slug: lowercase words joined by hyphens, no code prefix (F1, R4, P13) and no date.
const UPPER_NAMES = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md', 'SKILL.md', 'STATE.md', 'DESIGN.md', 'PRODUCT.md', 'TOOLING.md', 'CHANGELOG.md']);
export function markdownNameErrors(addedFiles) {
  const errors = [];
  for (const file of addedFiles.filter((f) => f.endsWith('.md'))) {
    const name = file.split('/').pop();
    if (UPPER_NAMES.has(name) || name.startsWith('_')) continue;
    const parts = name.slice(0, -3).split('-');
    const bad = !/^[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(name) || /^[a-z]?\d+[a-z]?$/.test(parts[0]) || /\d{4}/.test(name);
    if (bad) errors.push(`markdown name: ${file}: use a descriptive lowercase slug without code or date (AGENTS.md)`);
  }
  return errors;
}

// A PR that changes site source states its screenshot QA: a filled `Ảnh QA` line, or why there is none.
export function qaLineErrors(changedFiles, body) {
  const ui = changedFiles.some((f) => f.startsWith('src/site/') && !f.endsWith('.md'));
  if (!ui) return [];
  const line = body.match(/^Ảnh QA[^:\n]*:[ \t]*(.*)$/m)?.[1]?.trim() ?? '';
  if (line && !line.startsWith('<')) return [];
  return ['qa line: the PR changes src/site/ but has no filled line "Ảnh QA (UI): <links or measures at 384, 768, 1024, 1280, 1440, 1920>" (or "Ảnh QA (UI): không đổi UI - <lý do>")'];
}

// Every site image master has a row in docs/operations/png-goc.csv naming the approved AI PNG it came from
// (agent-rule-ad-images.md "PNG gốc"). Old rows may leave png empty (known gap from the audit); a master added
// by this branch needs png and sha256, unless the PR states why it has no AI PNG.
const SIZE_VARIANT = /-(240|480|960|1600)\.webp$/;
export const isImageMaster = (f) => /^src\/site\/assets\/content\/.+\.(webp|jpg|png)$/.test(f) && !SIZE_VARIANT.test(f);
export const masterKey = (f) => f.replace(/^src\/site\/assets\/content\//, '').replace(/\.(webp|jpg|png)$/, '');

export function pngOriginErrors(masters, addedMasters, csvText, body) {
  const rows = new Map(csvText.split('\n').slice(1).filter(Boolean).map((line) => {
    const [anh, png = '', sha256 = ''] = line.split(',');
    return [anh, { png, sha256 }];
  }));
  const errors = [];
  for (const key of new Set(masters.map(masterKey))) {
    if (!rows.has(key)) errors.push(`png goc: ${key} has no row in docs/operations/png-goc.csv (anh,png,sha256)`);
  }
  const waived = /^PNG gốc: không có - (?!<)\S/m.test(body);
  for (const key of new Set(addedMasters.map(masterKey))) {
    const row = rows.get(key);
    if (row && !(row.png && /^[0-9a-f]{64}$/.test(row.sha256)) && !waived) {
      errors.push(`png goc: new image ${key} needs the approved AI PNG path and its sha256 in docs/operations/png-goc.csv, or this line in the PR body: PNG gốc: không có - <lý do>`);
    }
  }
  return errors;
}

// SSoT (AGENTS.md "SSoT"): GitHub holds the product only. Decisions (ADR) and work state live on Notion.
const OFF_SSOT = [/^docs\/decisions\//, /^docs\/STATE\.md$/];
export function ssotPathErrors(files) {
  return files.filter((f) => OFF_SSOT.some((re) => re.test(f)))
    .map((f) => `ssot: ${f} belongs on Notion (ADR, work state), not in Git (AGENTS.md SSoT)`);
}

// Secrets never enter Git: env files, keytabs, private keys, real databases (AGENTS.md SSoT).
export function secretFileErrors(files) {
  return files.filter((f) => SECRET_FILE.test(f)).map((f) => `secret file: ${f} is tracked; remove it from Git and rotate the secret if it was real`);
}

// Token shapes anchored on length so ordinary words (kiosk-posm, --mask-x) never match. The value is never printed.
const SECRET_TEXT = [
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/],
  ['Cloudflare token', /\bcfat_[A-Za-z0-9_-]{20,}/],
  ['Notion token', /\b(ntn|secret)_[A-Za-z0-9]{40,}/],
  ['Slack token', /\bxox[abpr]-[A-Za-z0-9-]{20,}/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
export function secretTextErrors(files, read) {
  const errors = [];
  for (const file of files.filter((f) => TEXT.test(f) && f !== 'pnpm-lock.yaml')) {
    read(file).split('\n').forEach((line, i) => {
      const hit = SECRET_TEXT.find(([, re]) => re.test(line));
      if (hit) errors.push(`secret text: ${file}:${i + 1}: looks like a ${hit[0]}; never commit secrets (value not shown)`);
    });
  }
  return errors;
}

// No application code before an owner-approved design (AGENTS.md "Mức 0/Mức 1"): a PR that changes application
// source names the approved design, or declares the change level 0 with a reason.
const APP_SOURCE = /^src\/(site|search|worker|admin|db)\/(?!.*\.md$)/;
export function designLineErrors(changedFiles, body) {
  if (!changedFiles.some((f) => APP_SOURCE.test(f))) return [];
  if (/^Design: (https?:\/\/\S+|docs\/specs\/\S+)/m.test(body) || /^Mức 0: (?!<)\S/m.test(body)) return [];
  return ['design line: the PR changes application source but has no line "Design: <link to the approved spec or Notion page>" or "Mức 0: <lý do>" (AGENTS.md)'];
}

// One PR per card (AGENTS.md, owner 2026-11-21): the Notion page id of the PR's `Card:` line, or null for `Card: chờ tạo`.
export function cardId(body) {
  const url = body.match(/^Card: (https:\/\/(?:app\.notion\.com|www\.notion\.so)\/\S+)/m)?.[1];
  return url?.split('?')[0].match(/([0-9a-f]{32})$/i)?.[1].toLowerCase() ?? null;
}

// Another open PR naming the same card fails: finish or close it first, or open a new card.
export function sameCardErrors(prNumber, body, openPrs) {
  const id = cardId(body);
  if (!id) return [];
  return openPrs.filter((pr) => pr.number !== Number(prNumber) && cardId(pr.body ?? '') === id)
    .map((pr) => `one pr per card: #${pr.number} is already open for this card; one card has exactly one PR (AGENTS.md)`);
}

// The card is claimed before the work: Status In progress (Done once merged) and the Agent column filled (owner 2026-11-21).
export function cardClaimErrors(page) {
  const status = page?.properties?.Status?.status?.name;
  const agent = (page?.properties?.Agent?.rich_text ?? []).map((t) => t.plain_text).join('').trim();
  if (['In progress', 'Done'].includes(status) && agent) return [];
  return [`card claim: the card is "${status ?? 'unknown'}" with Agent "${agent}"; set Status In progress and fill Agent before opening the PR (AGENTS.md)`];
}
