// The bot's play in a defense (bot.ts calls this). It reads only what a player sees in the view: the ward bar on the HUD and
// the npc standing with a bar over her. In a defense the bot stays within 48 px of her and fights whatever is nearest her; with
// Steve in the party it tags him in and casts Babysit when two or more enemies are on her. In the final fight's channel (docs/level-16.md) the
// ward is the channeler with the nearest foe on them, with a longer leash so the bot can stand between a wave and them; with no foe up it is
// the point between the two, where it waits.
import type { SimInput, SimView } from '../core/types.ts';
import { HERO_DEFS } from '../heroes/defs.ts';

/** How far from the ward the bot lets itself stray, in px, and how far in the channel, where there are two to cover. */
export const LEASH = 48;
export const CHANNEL_LEASH = 110;
/** A foe this far from her, or less, is worth fighting. */
export const WARD_REACH = 150;
/** Enemies this close to her are on her. */
const ON_HER = 64;
/** The bot stands this close to her when there is nothing to fight. */
const HOLD = 28;
/** Frames between Babysit casts. Its taunt lasts 180 and its guard 300. */
const BABYSIT_GAP = 240;
/** Steve stands this close to her to cast: the pulse is 72 px wide and the foes circle her about 48 px out. */
const CAST_NEAR = 32;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export interface Ward { x: number; y: number; leash?: number }

export interface WardSense {
  /** Where she stands, while the defense runs and she is up, or the channeler to guard while the channel runs. Null otherwise. */
  read(v: SimView): Ward | null;
  /**
   * One frame of the bot's step in a defense: the move (mx, my) kept within the leash, and Babysit when two or more are on her. It
   * sets `swapTo` and `specialPressed` in `out` and returns the move to make. `walkTo` is the bot's route-finder.
   */
  steer(v: SimView, w: Ward, foes: Ward[], hx: number, hy: number, mx: number, my: number, out: SimInput, walkTo: (hx: number, hy: number, gx: number, gy: number) => [number, number]): [number, number];
}

export function createWardSense(): WardSense {
  let frame = 0;
  let lastCast = -999;
  /** The channeler to guard: the one with the nearest foe on them, or with none up the point between the two, where the bot waits. */
  function channelWard(v: SimView): Ward | null {
    const ch = v.hud.channel;
    if (!ch || !ch.on || ch.left <= 0) return null;
    const them = v.actors.filter((a) => a.kind === 'hero' && ch.channelers.some((c) => c.id === a.id && c.hp > 0));
    const first = them[0];
    if (!first) return null;
    const foes = v.actors.filter((a) => a.kind === 'enemy' && a.anim !== 'ko' && !a.puddle && a.id !== 'flayer5' && a.id !== 'leg5' && a.id !== 'vecna5');
    if (foes.length === 0) {
      const mx = them.reduce((n, c) => n + c.x, 0) / them.length, my = them.reduce((n, c) => n + c.y, 0) / them.length;
      return { x: mx, y: my, leash: CHANNEL_LEASH };
    }
    const threat = (c: { x: number; y: number }): number => foes.reduce((m, f) => Math.min(m, dist(f.x, f.y, c.x, c.y)), Infinity);
    let best = first, bestT = threat(first);
    for (const c of them) { const t = threat(c); if (t < bestT) { best = c; bestT = t; } }
    return { x: best.x, y: best.y, leash: CHANNEL_LEASH };
  }

  /** Keeps a step within the leash: outside it, the way back; at the edge, only the part that doesn't go further out. */
  function leash(w: Ward, hx: number, hy: number, mx: number, my: number): [number, number] {
    // A nudge to face a foe is not a step.
    if (Math.hypot(mx, my) < 0.5) return [mx, my];
    const rx = hx - w.x, ry = hy - w.y, r = Math.hypot(rx, ry) || 1, reach = w.leash ?? LEASH;
    if (r > reach) return [-rx / r, -ry / r];
    if (r > reach - 6) {
      const ux = rx / r, uy = ry / r;
      const outward = mx * ux + my * uy;
      if (outward > 0) return [mx - outward * ux, my - outward * uy];
    }
    return [mx, my];
  }

  return {
    read(v) {
      const w = v.hud.ward;
      if (!w) return channelWard(v);
      if (w.left <= 0 || w.hp <= 0) return null;
      const a = v.actors.find((o) => o.kind === 'npc' && o.bar !== null);
      return a ? { x: a.x, y: a.y } : null;
    },

    steer(v, w, foes, hx, hy, mx, my, out, walkTo) {
      frame++;
      [mx, my] = leash(w, hx, hy, mx, my);
      const si = v.hud.party.findIndex((p) => p.id === 'steve' && !p.ko);
      const steve = v.hud.party[si];
      if (!steve || steve.mp < HERO_DEFS.steve.special.mp || frame - lastCast < BABYSIT_GAP) return [mx, my];
      if (foes.filter((f) => dist(f.x, f.y, w.x, w.y) <= ON_HER).length < 2) return [mx, my];
      // Tag Steve in, walk him to her, and cast once he is beside her.
      if (!steve.active) { out.swapTo = si; return [mx, my]; }
      if (dist(hx, hy, w.x, w.y) > CAST_NEAR) return walkTo(hx, hy, w.x, w.y);
      lastCast = frame;
      out.specialPressed = true;
      return [mx, my];
    },
  };
}

/** Where the bot stands when there is nothing to fight: beside her, not on top of her. Null when it is already there. */
export function holdPost(w: Ward, hx: number, hy: number): Ward | null {
  return dist(hx, hy, w.x, w.y) > HOLD ? w : null;
}
