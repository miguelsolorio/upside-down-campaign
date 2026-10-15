// The bot's way out of a hold (bot.ts calls this). A Flayed holding the active hero shows pose 'grab' and Grigori does too, from the
// wind-up of his lunge to the throw. The hold itself is a 'grab' pose with no "!" and not the lunge's 'dash' anim, and the holder is
// on top of the hero. The way out is a swap: it frees the hero, and the incoming one gets the usual invulnerability.
import type { SimView } from '../core/types.ts';

/** How close the holder stands to the hero it holds, at most, in px. */
const NEAR = 26;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** True when something has hold of the hero standing at (hx, hy). */
export function isHeldView(v: SimView, hx: number, hy: number): boolean {
  return v.actors.some((a) => a.kind === 'enemy' && a.pose === 'grab' && !a.alert && a.anim !== 'dash' && a.anim !== 'ko' && dist(hx, hy, a.x, a.y) <= NEAR);
}

/** The party slot to swap to when the hero is held: the healthiest standing bench hero. -1 when he isn't held or nobody can take over. */
export function holdSwap(v: SimView, hx: number, hy: number): number {
  if (!isHeldView(v, hx, hy)) return -1;
  let best = -1, bestFrac = -1;
  v.hud.party.forEach((p, i) => {
    if (p.ko || p.active || p.hp / p.hpMax <= bestFrac) return;
    best = i; bestFrac = p.hp / p.hpMax;
  });
  return best;
}
