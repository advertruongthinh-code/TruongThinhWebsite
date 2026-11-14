// Nightly card report (docs/operations/notion.md rule 9): PRs merged in the last 24 hours without a Notion card link.
// Writes a table to the job summary and exits 1 when one is missing, so the coordinator's morning nightly check sees it.
const { GITHUB_API_URL = 'https://api.github.com', GITHUB_REPOSITORY, GH_TOKEN, GITHUB_STEP_SUMMARY, HOURS = '24' } = process.env;
const since = new Date(Date.now() - Number(HOURS) * 3600e3).toISOString();
const q = encodeURIComponent(`repo:${GITHUB_REPOSITORY} is:pr is:merged merged:>=${since}`);
const res = await fetch(`${GITHUB_API_URL}/search/issues?q=${q}&per_page=100`, { headers: { authorization: `Bearer ${GH_TOKEN}` } });
if (!res.ok) throw new Error(`card-report: search HTTP ${res.status}`);
const card = (body) => body?.match(/^Card: (https:\/\/(app\.notion\.com|www\.notion\.so)\/\S+|chờ tạo)/m)?.[1];
const rows = (await res.json()).items.map((pr) => ({ number: pr.number, title: pr.title, card: card(pr.body) }));
const missing = rows.filter((r) => !r.card || r.card === 'chờ tạo');
const table = ['| PR | Card |', '| --- | --- |', ...rows.map((r) => `| #${r.number} ${r.title.replaceAll('|', '/')} | ${r.card ?? 'thiếu'} |`)].join('\n');
const report = `## Card Notion của PR merge từ ${since}\n\n${rows.length ? table : 'Không có PR merge.'}\n\nCần backfill: ${missing.map((r) => `#${r.number}`).join(', ') || 'không'}\n`;
if (GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(GITHUB_STEP_SUMMARY, report);
console.log(report);
process.exitCode = missing.length ? 1 : 0;
