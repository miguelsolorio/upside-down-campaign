// The Blue storm's lightning over 4.3 (docs/level-12.md): a bolt every 6 to 10 s floods the lit edges red, then fades back to blue
// over a step. The play scene draws the stage's 'flash' bake over its own at stormFlash's strength. Pure: the bolts come from the
// frame counter alone, so the same frame always looks the same, and Node can test it.

/** Frames between bolts: 6 to 10 s. */
const MIN_GAP = 360, MAX_GAP = 600;
/** A bolt is at full strength for FULL frames, then fades over FADE. */
const FULL = 6, FADE = 24;

/** A small hash of a whole number, 0..1. */
const unit = (n: number): number => (((Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0) % 1000) / 1000);

/** The frame of bolt k: each gap is MIN_GAP to MAX_GAP frames, picked by k. */
export function boltAt(k: number): number {
  let f = 0;
  for (let i = 0; i < k; i++) f += MIN_GAP + Math.floor(unit(i + 1) * (MAX_GAP - MIN_GAP));
  return f;
}

/** 0..1, how strong the flash is at `frame`. Calm (reduce flashing) halves it and stretches the fade. */
export function stormFlash(frame: number, calm = false): number {
  let k = 1;
  while (boltAt(k) + MAX_GAP < frame) k++;
  let best = 0;
  for (const at of [boltAt(k - 1), boltAt(k), boltAt(k + 1)]) {
    const t = frame - at;
    if (t < 0) continue;
    const fade = calm ? FADE * 2 : FADE;
    const v = t < FULL ? 1 : t < FULL + fade ? 1 - (t - FULL) / fade : 0;
    best = Math.max(best, v);
  }
  return calm ? best * 0.5 : best;
}
