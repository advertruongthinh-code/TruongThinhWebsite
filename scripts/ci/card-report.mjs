// Nightly card report (docs/operations/notion.md rule 9): PRs merged in the last 24 hours without a Notion card link,
// and PRs unlocked with an `Owner đổi:` line (docs-system.md R11 owner lock) for the coordinator to match against the owner's words.
// plus plan cards missing their plan (agent-rule-verification-roles.md trust tiers).
// Writes a table to the job summary and exits 1 when one is missing, so the coordinator's morning nightly check sees it.
import { blockLines, parentIds, planErrors } from '../docs/agents-rules.mjs';

const { GITHUB_API_URL = 'https://api.github.com', GITHUB_REPOSITORY, GH_TOKEN, GITHUB_STEP_SUMMARY, HOURS = '24' } = process.env;
const since = new Date(Date.now() - Number(HOURS) * 3600e3).toISOString();
const q = encodeURIComponent(`repo:${GITHUB_REPOSITORY} is:pr is:merged merged:>=${since}`);
const res = await fetch(`${GITHUB_API_URL}/search/issues?q=${q}&per_page=100`, { headers: { authorization: `Bearer ${GH_TOKEN}` } });
if (!res.ok) throw new Error(`card-report: search HTTP ${res.status}`);
const card = (body) => body?.match(/^Card: (https:\/\/(app\.notion\.com|www\.notion\.so)\/\S+|chờ tạo)/m)?.[1];
const rows = (await res.json()).items.map((pr) => ({ number: pr.number, title: pr.title, card: card(pr.body), owner: pr.body?.match(/^Owner đổi: (\S+)/m)?.[1] }));
const missing = rows.filter((r) => !r.card || r.card === 'chờ tạo');
const table = ['| PR | Card |', '| --- | --- |', ...rows.map((r) => `| #${r.number} ${r.title.replaceAll('|', '/')} | ${r.card ?? 'thiếu'} |`)].join('\n');
const unlocked = rows.filter((r) => r.owner).map((r) => `- #${r.number}: ${r.owner}`).join('\n') || 'không';
let report = `## Card Notion của PR merge từ ${since}\n\n${rows.length ? table : 'Không có PR merge.'}\n\nCần backfill: ${missing.map((r) => `#${r.number}`).join(', ') || 'không'}\n\nPR mở khóa quyết định owner (Owner đổi):\n${unlocked}\n`;

// Trust tiers (agent-rule-verification-roles.md, owner 2026-11-23): a plan approved before any PR exists has no PR check to
// catch a missing plan, so the night lists In progress cards at Plan level 2-3 without a plan (on the card or its parent),
// and cards done in the last day with unticked steps.
const plans = await planReport();
report += plans.text;
if (GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(GITHUB_STEP_SUMMARY, report);
console.log(report);
process.exitCode = missing.length || plans.bad ? 1 : 0;

async function planReport() {
  const { NOTION_TOKEN, TASKS_DB = '3b5332849a0e80689b46e724fa43e480', PROJECT_ID = '3b7332849a0e81c6bd2be63fe44e67ac' } = process.env;
  if (!NOTION_TOKEN) return { bad: 0, text: '\nPlan trên card: không kiểm (thiếu secret NOTION_TOKEN)\n' };
  const notion = async (path, body) => {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${NOTION_TOKEN}`, 'notion-version': '2022-06-28', 'content-type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`card-report: Notion ${path} HTTP ${res.status}`);
    return res.json();
  };
  const blocks = async (id) => {
    const all = [];
    let cursor = '';
    do {
      const json = await notion(`/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
      all.push(...json.results);
      cursor = json.has_more ? json.next_cursor : '';
    } while (cursor);
    return blockLines(all);
  };
  const query = async (filter) => (await notion(`/databases/${TASKS_DB}/query`, { filter: { and: [{ property: 'Project', relation: { contains: PROJECT_ID } }, ...filter] }, page_size: 100 })).results;
  const name = (p) => (p.properties.Name?.title ?? []).map((t) => t.plain_text).join('');
  const lines = [];
  const open = await query([{ property: 'Status', status: { equals: 'In progress' } }, { or: ['2', '3'].map((v) => ({ property: 'Plan level', select: { equals: v } })) }]);
  for (const card of open) {
    const own = planErrors(await blocks(card.id));
    const parent = parentIds(card)[0];
    if (own.length && (!parent || planErrors(await blocks(parent)).length)) lines.push(`- Thiếu plan: ${name(card)} ${card.url}`);
  }
  const done = await query([{ property: 'Status', status: { equals: 'Done' } }, { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } }]);
  for (const card of done) {
    const left = (await blocks(card.id)).filter((l) => l.type === 'to_do' && l.checked === false).length;
    if (left) lines.push(`- Done còn ${left} bước chưa tick: ${name(card)} ${card.url}`);
  }
  return { bad: lines.length, text: `\nPlan trên card (Plan level 2-3 đang làm; Done còn bước chưa tick):\n${lines.join('\n') || 'không'}\n` };
}
