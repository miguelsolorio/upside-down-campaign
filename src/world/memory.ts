// The memory skin's fade (docs/level-11.md, "The curse"): while a curse counts on a stage with a `memory` rect, that room is drawn
// in the Creel House's Blood red skin, fading in over FADE frames and back out when the curse ends. Pure, so Node can test it.
import type { SimView } from '../core/types.ts';

const FADE = 20;

export interface MemoryFade {
  /** Call once a tick with the view. */
  step(view: SimView): void;
  /** 0..1, how much of the memory skin shows. */
  k(): number;
  reset(): void;
}

/** True while any hero is under the curse, benched or not. */
export const cursing = (view: SimView): boolean => view.hud.party.some((p) => (p.curse ?? 0) > 0);

export function createMemoryFade(): MemoryFade {
  let k = 0;
  return {
    step(view) { k = Math.max(0, Math.min(1, k + (cursing(view) ? 1 : -1) / FADE)); },
    k: () => k,
    reset() { k = 0; },
  };
}
