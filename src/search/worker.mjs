// Entry of the demo Worker: only /api/* reaches this script (run_worker_first in wrangler.static.toml).

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/api/search") return json({ status: "not_found" }, 404);
    if (request.method !== "POST") return json({ status: "method_not_allowed" }, 405);
    // Real search arrives in a later PR; until then the client falls back to keywords.
    return json({ status: "unavailable" }, 503);
  },
};
