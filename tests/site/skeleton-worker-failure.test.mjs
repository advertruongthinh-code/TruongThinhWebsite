import assert from "node:assert/strict";
import { test } from "node:test";

for (const failure of ["onerror", "onmessageerror", "postMessage"]) {
  test(`skeleton still falls back after ${failure} and existing renderers clean up safely`, async (t) => {
    const originals = Object.fromEntries(["Worker", "OffscreenCanvas", "HTMLCanvasElement"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    t.after(() => {
      for (const [name, descriptor] of Object.entries(originals)) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
      }
    });
    let worker;
    globalThis.Worker = class {
      constructor() { worker = this; }
      postMessage(message) { if (failure === "postMessage" && message.type === "still") throw new Error("worker stopped"); }
      terminate() { this.terminated = true; }
    };
    globalThis.OffscreenCanvas = class {};
    globalThis.HTMLCanvasElement = class { transferControlToOffscreen() {} };
    const flow = await import(`../../src/site/advertising-products/skeleton-flow.mjs?failure=${failure}`);
    const preset = flow.SKELETON_FLOW_PRESETS[0];
    const canvas = { dataset: {}, transferControlToOffscreen: () => ({}) };
    const renderer = flow.createSkeletonFlowWorkerRenderer(canvas, { preset, speedScale: 1, direction: 1, initialPhase: 21 });
    renderer.start();
    const pending = flow.requestSkeletonFlowStill(preset, 21);
    if (failure !== "postMessage") {
      assert.equal(typeof worker[failure], "function");
      worker[failure]();
    }
    assert.equal(await pending, flow.skeletonFlowStill(preset, 21));
    assert.equal(worker.terminated, true);
    assert.equal(flow.skeletonFlowWorkerSupported(), false);
    assert.equal(flow.requestSkeletonFlowStill(preset, 22), null);
    assert.doesNotThrow(() => { renderer.draw(); renderer.stop(); renderer.destroy(); });
  });
}
