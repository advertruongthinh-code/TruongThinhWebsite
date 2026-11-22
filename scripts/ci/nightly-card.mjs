// Nightly CI card (ci-test-suites R13, owner 2026-11-22): a red nightly run opens one Notion card in Tasks, or adds the
// new run to the card already open; a green run closes that card as Done with the run as Evidence. The job summary always
// lists the red suites. Without NOTION_TOKEN it only writes the summary and exits 1 on red so the run still shows it.
const { GITHUB_API_URL = "https://api.github.com", GITHUB_REPOSITORY, GITHUB_RUN_ID, GH_TOKEN, NOTION_TOKEN, RESULT, GITHUB_STEP_SUMMARY } = process.env;
export const TITLE = "Nightly CI đỏ";
const TASKS = "3b533284-9a0e-801b-ae03-000b19a87b7b";
const PROJECT = "3b7332849a0e81c6bd2be63fe44e67ac";
const NOT_SUITES = new Set(["select", "static-release", "deploy-demo", "nightly-card"]);

const request = async (url, { method = "GET", body, headers }) => {
  const res = await fetch(url, { method, headers: { "content-type": "application/json", ...headers }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`nightly-card: ${method} ${url} HTTP ${res.status} ${await res.text()}`);
  return res.json();
};
const github = (path) => request(`${GITHUB_API_URL}${path}`, { headers: { authorization: `Bearer ${GH_TOKEN}` } });
const notion = (path, method, body) =>
  request(`https://api.notion.com/v1${path}`, { method, body, headers: { authorization: `Bearer ${NOTION_TOKEN}`, "notion-version": "2025-09-03" } });
const paragraph = (content) => ({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content } }] } });

// One line per run: date, red suites, run link.
export const runLine = ({ date, failed, runUrl }) =>
  failed.length ? `${date}: đỏ ${failed.length} suite (${failed.join(", ")}) - ${runUrl}` : `${date}: xanh lại - ${runUrl}`;

export const redSuites = (jobs) => jobs.filter((job) => job.conclusion === "failure" && !NOT_SUITES.has(job.name)).map((job) => job.name).sort();

if (import.meta.url === `file://${process.argv[1]}`) {
  const runUrl = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  const failed = redSuites((await github(`/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs?per_page=100`)).jobs);
  const red = RESULT !== "success";
  const line = runLine({ date: new Date().toISOString().slice(0, 10), failed: red && !failed.length ? ["static-release"] : red ? failed : [], runUrl });
  if (GITHUB_STEP_SUMMARY) (await import("node:fs")).appendFileSync(GITHUB_STEP_SUMMARY, `## Nightly CI\n\n${line}\n`);
  console.log(line);
  if (!NOTION_TOKEN) {
    console.warn("nightly-card: secret NOTION_TOKEN is not set; no Notion card");
    process.exitCode = red ? 1 : 0;
  } else {
    const open = (await notion(`/data_sources/${TASKS}/query`, "POST", {
      filter: { and: [{ property: "Name", title: { equals: TITLE } }, { property: "Status", status: { does_not_equal: "Done" } }] },
    })).results[0];
    if (open) await notion(`/blocks/${open.id}/children`, "PATCH", { children: [paragraph(line)] });
    if (red && !open) {
      const page = await notion("/pages", "POST", {
        parent: { type: "data_source_id", data_source_id: TASKS },
        properties: {
          Name: { title: [{ text: { content: TITLE } }] },
          Status: { status: { name: "Up next" } },
          Priority: { select: { name: "P1" } },
          Project: { relation: [{ id: PROJECT }] },
          "Next action": { rich_text: [{ text: { content: "Điều phối giao thread sửa các suite đỏ (link run trong card)" } }] },
        },
        children: [paragraph(line)],
      });
      console.log(`nightly-card: opened ${page.url}`);
    } else if (!red && open) {
      await notion(`/pages/${open.id}`, "PATCH", { properties: { Status: { status: { name: "Done" } }, Evidence: { url: runUrl } } });
      console.log(`nightly-card: closed ${open.url}`);
    } else if (open) console.log(`nightly-card: updated ${open.url}`);
  }
}
