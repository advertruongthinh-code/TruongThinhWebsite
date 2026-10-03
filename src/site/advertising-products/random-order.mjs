import { fnv1a32 } from "./layout-core.mjs";

export function createAdvertisingSeed() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);
}

export function createSeededRandom(seed, scope = "") {
  let state = fnv1a32(String(seed) + "\u0000" + String(scope));
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

export function shuffleWithSeed(items, seed, scope = "") {
  const result = items.slice();
  const random = createSeededRandom(seed, scope);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
