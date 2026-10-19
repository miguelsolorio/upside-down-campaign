// The bot under the clock curse (bot.ts calls this). It reads only what a player sees: the chimes on the party's slots, the clocks still
// standing, and the Walkman on the HUD. Nothing here reaches into the sim.
//
//   With Max in the party, the Walkman ready and Max standing, it swaps to her: the swap plays it and every curse counting ends. If Max is
//   the one up, it tags out to someone else first, and the next frame swaps back to her.
//   Otherwise it swaps to Eddie (or keeps whoever is up, if he is down), walks up to the nearest clock still standing and attacks it. Eddie's
//   swing breaks it at once, anyone else takes a few hits.
// In Vecna's fight (memory orbs in the view) only the Walkman is here: the attic's clock never breaks, and the marked orb is bot_vecna.ts's.
// The careless bot does the same: it is the lesson, not a dodge.
import type { HeroId, PropView, SimView } from '../core/types.ts';
import type { Finish } from './bot_boss.ts';

/** How close the bot stands to the clock before it swings, in px from its nearest edge. A basic attack smashes from 18. */
const SWING = 12;
/** A step too small to walk anywhere, big enough to turn the hero to face the clock. */
const NUDGE = 0.2;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export interface CurseSense {
  /** The plan while a curse counts and its clock stands, or null. */
  plan(v: SimView, hx: number, hy: number, walkTo: (hx: number, hy: number, gx: number, gy: number) => [number, number]): Finish | null;
}

/** The nearest point of a prop's rectangle to a point. */
function nearest(p: PropView, x: number, y: number): { x: number; y: number } {
  return { x: Math.max(p.x, Math.min(x, p.x + p.w)), y: Math.max(p.y, Math.min(y, p.y + p.h)) };
}

export function createCurseSense(): CurseSense {
  return {
    plan(v, hx, hy, walkTo) {
      if (!v.hud.party.some((p) => (p.curse ?? 0) > 0)) return null;
      // In Vecna's fight the attic's clock never breaks: after the Walkman, the way out is the marked orb (bot_vecna.ts).
      const fight = v.actors.some((a) => a.kind === 'enemy' && a.id === 'orb');
      const clocks = v.props.filter((p) => p.kind === 'clock' && p.state !== 'open');
      if (clocks.length === 0 && !fight) return null;
      const near = (p: PropView): number => { const q = nearest(p, hx, hy); return dist(hx, hy, q.x, q.y); };
      const clock = clocks.length > 0 ? clocks.reduce((a, b) => (near(b) < near(a) ? b : a)) : null;
      const me = v.hud.party.find((p) => p.active);
      if (!me) return null;
      const slot = (id: HeroId): number => v.hud.party.findIndex((p) => p.id === id && !p.ko && (p.curse ?? 0) === 0);
      const out: Finish = { swapTo: -1, mv: [0, 0], cast: false };
      // Max's music ends the curse the moment she is swapped to.
      const wm = v.hud.walkman;
      if (wm && wm.ready >= 1 && wm.on <= 0 && slot('max') >= 0) {
        if (me.id !== 'max') { out.swapTo = slot('max'); return out; }
        const other = v.hud.party.findIndex((p) => p.id !== 'max' && !p.ko && (p.curse ?? 0) === 0);
        if (other >= 0) { out.swapTo = other; return out; }
      }
      if (fight || !clock) return null;
      if (me.id !== 'eddie') out.swapTo = slot('eddie');
      const q = nearest(clock, hx, hy);
      const d = dist(hx, hy, q.x, q.y);
      if (d > SWING) {
        // Walk to a spot just off the clock's edge, on this side of it: the clock is solid.
        const k = d > 0 ? 6 / d : 0;
        out.mv = walkTo(hx, hy, q.x + (hx - q.x) * k, q.y + (hy - q.y) * k);
      } else {
        const a = Math.atan2(q.y - (hy - 2), q.x - hx);
        out.mv = [Math.cos(a) * NUDGE, Math.sin(a) * NUDGE];
        out.attack = true;
      }
      return out;
    },
  };
}
