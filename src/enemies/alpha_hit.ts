// What a hit does to the Demodog Alpha, and how it looks (docs/level-6.md, "Demodog Alpha"). The hit pipeline in
// combat/damage.ts and the death in combat/kills.ts call these; the brain is alpha.ts.
//
// Nothing staggers or stuns it. It takes double damage while it howls and half again as much while it is dazed after a
// pounce. It cannot be shoved off its line while it lunges, leaps or howls.
import type { ActorView } from '../core/types.ts';
import type { AlphaState, Enemy, S } from '../combat/state.ts';
import { ENEMY_DEFS } from './defs.ts';

const X = ENEMY_DEFS.alpha.x;
/** The HP shares at which it howls, once each. */
export const HOWL_AT: readonly number[] = [X.howl1 as number, X.howl2 as number, X.howl3 as number];

export function newAlpha(): AlphaState {
  return { move: 'walk', t: 0, lungeCd: 60, pounceCd: 120, howls: 0, sx: 0, sy: 0, tx: 0, ty: 0, mark: null };
}

/** The pose gfx draws for what it is doing, or undefined while it walks, bites or recovers. */
export function alphaPose(a: AlphaState): ActorView['pose'] {
  switch (a.move) {
    case 'crouch': return 'crouch';
    case 'air': return 'leap';
    case 'howl': return 'howl';
    case 'stun': return 'stun';
    default: return undefined;
  }
}

export const alphaHowling = (e: Enemy): boolean => e.alpha?.move === 'howl';

/** How much of a hit it takes: double while it howls, half again while it is dazed, else 1. */
export function alphaTakes(e: Enemy): number {
  const m = e.alpha?.move;
  return m === 'howl' ? X.howlMul as number : m === 'stun' ? X.stunMul as number : 1;
}

/** A hit while it lunges, leaps or howls does not move it. */
export function alphaImmovable(e: Enemy): boolean {
  const m = e.alpha?.move;
  return m === 'run' || m === 'air' || m === 'howl';
}

/** It died with a pounce on the way: the growing mark under it goes too. */
export function clearAlpha(s: S, e: Enemy): void {
  const a = e.alpha;
  if (!a || !a.mark) return;
  const mark = a.mark;
  s.fx = s.fx.filter((f) => f !== mark);
  a.mark = null;
}
