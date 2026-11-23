// The admin Worker bundles for workerd without Node built-ins and stays well under the Workers Free size limit.
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

test("the Worker bundle has no node: import and stays under 1 MB", async () => {
  const result = await build({
    entryPoints: [new URL("../../src/worker/index.js", import.meta.url).pathname],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    conditions: ["workerd"],
  });
  const code = result.outputFiles[0].text;
  assert.doesNotMatch(code, /node:/);
  assert.ok(code.length < 1_000_000, `bundle is ${code.length} bytes`);
});
