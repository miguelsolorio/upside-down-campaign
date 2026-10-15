// The bot's play against the Demogorgon (bot.ts calls this). It reads only what a player sees in the view: the boss's
// pose and "!", the marks on the floor, and the pinned pose. Nothing here reaches into the sim.
//
//   dodge: steps off a live mark (an acid splash or the leap's landing), backs away from the planted boss during the
//     charge wind-up, and sidesteps the line once it runs, reading the boss's heading from where it was a frame ago.
//   finish: when the boss is pinned, swaps to Eleven, walks up to it and fires Mind Blast.
import type { SimView, Vec2 } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { HERO_DEFS } from '../heroes/defs.ts';

const X = ENEMY_DEFS.demogorgon.x;
const TAU = Math.PI * 2;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** Sideways distance from the charge line that clears the boss's body. */
const LANE = 16;
/** How close Eleven stands to a pinned boss: the beam's aim is snapped to eight ways, so close keeps it on target. */
const BEAM_RANGE = 26;
/**
 * A player needs a moment to see a thing coming. The bot waits this many frames after the boss starts to run before it
 * leaves the lane, and after a mark appears before it leaves the mark. Zero would make it a perfect dodger.
 */
const REACT_CHARGE = 1;
const REACT_MARK = 3;

export interface BossEnv {
  walkable(x: number, y: number): boolean;
  clearLine(ax: number, ay: number, bx: number, by: number): boolean;
  /** A unit step toward a point, round walls. */
  walkTo(hx: number, hy: number, gx: number, gy: number): [number, number];
}

export interface Finish {
  /** Party slot to swap to, or -1. */
  swapTo: number;
  mv: [number, number];
  /** Fire Mind Blast. */
  cast: boolean;
  /** Swing or fire the basic attack (Grigori's plan, bot_grigori.ts). */
  attack?: boolean;
}

export interface BossSense {
  /** Call every frame. A step out of the way of a mark or the charge, or null. */
  dodge(v: SimView, hx: number, hy: number): [number, number] | null;
  /** The plan against a pinned boss, or null while nothing is pinned. */
  finish(v: SimView, hx: number, hy: number): Finish | null;
}

export function createBossSense(env: BossEnv): BossSense {
  let prev: Vec2 | null = null;
  let side = 1;
  let runAge = 0;

  /** The direction out of every live mark that ends furthest from all of them within the time left, along open floor. */
  function leaveMarks(v: SimView, hx: number, hy: number): [number, number] | null {
    const marks = v.fx.filter((f) => f.kind === 'mark' && dist(hx, hy, f.x, f.y) < f.h + 6 && f.t >= REACT_MARK);
    if (marks.length === 0) return null;
    const left = Math.min(...marks.map((m) => m.life - m.t));
    const room = (x: number, y: number): number => Math.min(...v.fx.filter((f) => f.kind === 'mark').map((m) => dist(x, y, m.x, m.y) - m.h));
    const travel = Math.max(10, Math.min(64, left * 0.9));
    let best: [number, number] | null = null;
    let bestScore = -1e9;
    for (let i = 0; i < 16; i++) {
      const a = (i * TAU) / 16;
      const ux = Math.cos(a), uy = Math.sin(a);
      let reach = 0;
      while (reach < travel && env.walkable(hx + ux * (reach + 4), hy + uy * (reach + 4))) reach += 4;
      if (reach < 4) continue;
      const score = room(hx + ux * reach, hy + uy * reach) + reach * 0.02;
      if (score > bestScore) { bestScore = score; best = [ux, uy]; }
    }
    return best;
  }

  /** A step straight away from (fx, fy), bending round walls. */
  function away(hx: number, hy: number, fx: number, fy: number): [number, number] | null {
    const a = Math.atan2(hy - fy, hx - fx);
    for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
      const ux = Math.cos(a + off), uy = Math.sin(a + off);
      if (env.walkable(hx + ux * 12, hy + uy * 12)) return [ux, uy];
    }
    return null;
  }

  /** The boss is running along (hx, hy) from the last frame to this one: get out of its lane. */
  function leaveLane(hx: number, hy: number, bx: number, by: number, p: Vec2): [number, number] | null {
    const sp = dist(p.x, p.y, bx, by);
    if (sp < 2) return null;
    const ux = (bx - p.x) / sp, uy = (by - p.y) / sp;
    const rx = hx - bx, ry = hy - by;
    const along = rx * ux + ry * uy;
    const lat = rx * uy - ry * ux;
    if (along < -6 || Math.abs(lat) >= LANE) return null;
    if (Math.abs(lat) > 1.5) side = lat > 0 ? -1 : 1;
    for (const sg of [side, -side]) {
      const px = -uy * sg, py = ux * sg;
      if (env.walkable(hx + px * 12, hy + py * 12)) { side = sg; return [px, py]; }
    }
    return null;
  }

  function dodge(v: SimView, hx: number, hy: number): [number, number] | null {
    const boss = v.actors.find((a) => a.kind === 'enemy' && a.id === 'demogorgon' && a.anim !== 'ko');
    const was = prev;
    prev = boss ? { x: boss.x, y: boss.y } : null;
    const off = leaveMarks(v, hx, hy);
    if (off) return off;
    if (!boss) return null;
    const d = dist(hx, hy, boss.x, boss.y);
    if (boss.pose === 'charge') {
      // Planted and winding up: it will run at wherever the hero stands when this ends, so use the time to back off.
      if (boss.alert) return d < 110 ? away(hx, hy, boss.x, boss.y) : null;
      runAge = was && dist(was.x, was.y, boss.x, boss.y) >= 2 ? runAge + 1 : 0;
      return was && runAge > REACT_CHARGE ? leaveLane(hx, hy, boss.x, boss.y, was) : null;
    }
    // The swipe's wind-up: step out of its reach.
    if (boss.alert && boss.pose === undefined && d <= X.reach + 10) return away(hx, hy, boss.x, boss.y);
    return null;
  }

  function finish(v: SimView, hx: number, hy: number): Finish | null {
    const boss = v.actors.find((a) => a.kind === 'enemy' && a.pose === 'pinned' && a.id !== 'billy');
    const me = v.hud.party.find((p) => p.active);
    if (!boss || !me) return null;
    const out: Finish = { swapTo: -1, mv: [0, 0], cast: false };
    if (me.id !== 'eleven') out.swapTo = v.hud.party.findIndex((p) => p.id === 'eleven' && !p.ko);
    const d = dist(hx, hy, boss.x, boss.y);
    if (d > BEAM_RANGE + 4 || !env.clearLine(hx, hy, boss.x, boss.y)) {
      out.mv = env.walkTo(hx, hy, boss.x, boss.y);
    } else {
      const a = Math.atan2(boss.y - hy, boss.x - hx);
      out.mv = [Math.cos(a) * 0.2, Math.sin(a) * 0.2];
      out.cast = me.id === 'eleven' && me.mp >= HERO_DEFS.eleven.special.mp;
    }
    return out;
  }

  return { dodge, finish };
}
