// Eleven's Sensory tank (Lv 6), her held Special (hold.ts): for 6 MP she reaches out with her mind for 8 s. While it lasts and she is
// the active hero, hidden foes within senseR px of her show and take Cold spot's 15 percent more (cold.ts), and a `hidden` path in that
// range opens as if she stood beside it (combat/props.ts). Swapping away ends it (talents6.ts).
//
// What gfx sees: a 'ring' as wide as her reach when she casts it, and a SENSE floater.
import { HERO_DEFS } from './defs.ts';
import type { Hero, S } from '../combat/state.ts';
import { activeHero } from '../combat/state.ts';
import { dist } from '../combat/space.ts';
import { addFx, floater, sfx } from '../combat/fx.ts';
import { beginAct } from './common.ts';

/** Casts it. The caller has taken the MP. */
export function sensoryTank(s: S, h: Hero): void {
  const d = HERO_DEFS.eleven.special;
  beginAct(h, d, 'special');
  s.t6.sense = d.x.sense;
  sfx(s, 'reveal');
  addFx(s, 'ring', h.x, h.y - 6, h.dir, 0, 30, d.x.senseR * 2, d.x.senseR);
  floater(s, 'SENSE', h.x, h.y - 24, 'pink', false, 40);
}

/** True while Eleven is the active hero with Sensory tank running and (x, y) is within its reach. */
export function sensing(s: S, x: number, y: number): boolean {
  const h = activeHero(s);
  return h.id === 'eleven' && !h.ko && s.t6.sense > 0 && dist(h.x, h.y, x, y) <= HERO_DEFS.eleven.special.x.senseR;
}

/** How far the active hero senses a `hidden` path: `base`, or Sensory tank's reach while it runs. */
export function senseRange(s: S, base: number): number {
  const h = activeHero(s);
  return h.id === 'eleven' && !h.ko && s.t6.sense > 0 ? HERO_DEFS.eleven.special.x.senseR : base;
}
