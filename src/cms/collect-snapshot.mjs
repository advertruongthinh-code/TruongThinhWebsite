// Puts the paged admin snapshot (src/worker/commands/snapshot.mjs) back into one { schema, takenAt, records, redirects, held }
// for snapshotToFiles. get(query) returns the parsed JSON of /api/admin/snapshot?<query> and throws on a non-2xx answer.
// A write between two calls changes
// the stamp; then every page is read again, at most `tries` times.
export async function collectSnapshot(get, tries = 3) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const index = await get("");
    if (typeof index?.stamp !== "string" || !(index.pageSize > 0) || typeof index.types !== "object") throw new Error("snapshot index has no stamp, pageSize or types");
    const records = {};
    let changed = false;
    for (const [type, count] of Object.entries(index.types)) {
      records[type] = [];
      for (let page = 0; page * index.pageSize < count && !changed; page += 1) {
        const part = await get(`type=${encodeURIComponent(type)}&page=${page}`);
        changed = part.stamp !== index.stamp;
        records[type].push(...part.records);
      }
      if (changed) break;
      if (records[type].length !== count) throw new Error(`snapshot type ${type}: ${records[type].length} records, index says ${count}`);
    }
    // A write to a type read earlier shows only in a fresh index.
    if (!changed && (await get("")).stamp === index.stamp) {
      return { schema: index.schema, takenAt: index.takenAt, records, redirects: index.redirects, held: index.held };
    }
  }
  throw new Error(`snapshot kept changing while it was read (${tries} tries)`);
}
