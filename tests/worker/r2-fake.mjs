// In-memory R2 bucket stand-in for Worker tests (CMS plan S5); covers the calls the admin Worker makes.
import { createHash } from "node:crypto";

export function createR2() {
  const objects = new Map();
  const meta = (key, { body, ...rest }) => ({ key, ...rest });
  return {
    objects,
    async put(key, body, options = {}) {
      const bytes = Buffer.from(await new Response(body).arrayBuffer());
      const md5 = createHash("md5").update(bytes).digest();
      const object = {
        body: bytes,
        size: bytes.byteLength,
        uploaded: options.uploaded ?? new Date(),
        httpMetadata: options.httpMetadata ?? {},
        checksums: { md5: md5.buffer.slice(md5.byteOffset, md5.byteOffset + md5.byteLength) },
      };
      objects.set(key, object);
      return meta(key, object);
    },
    async get(key, { range } = {}) {
      const object = objects.get(key);
      if (!object) return null;
      const start = range?.offset ?? 0;
      const end = range?.length === undefined ? object.size : start + range.length;
      const bytes = object.body.subarray(start, end);
      return { ...meta(key, object), body: new Response(bytes).body, arrayBuffer: async () => bytes, text: async () => bytes.toString(), json: async () => JSON.parse(bytes.toString()) };
    },
    async head(key) {
      const object = objects.get(key);
      return object ? meta(key, object) : null;
    },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const keys = [...objects.keys()].filter((key) => key.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = keys.slice(start, start + limit);
      const truncated = start + limit < keys.length;
      return { objects: page.map((key) => meta(key, objects.get(key))), truncated, cursor: truncated ? String(start + limit) : undefined };
    },
    async delete(keys) {
      for (const key of [].concat(keys)) objects.delete(key);
    },
  };
}
