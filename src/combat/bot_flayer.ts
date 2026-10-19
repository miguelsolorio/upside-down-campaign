// The bot's play against the Mind Flayer (bot.ts calls this). It reads only what a player sees in the view: the legs' poses and tips (ActorView
// aim), the band fx, the pools, and the body's pose. Nothing here reaches into the sim, and nothing opens or wakes it.
//
//   dodge: steps off a warned line (the segment from a leg's root to its aim) or out of a warned sweep band, by the shortest way to open
//     floor that is clear of both and of the pools. A line is warned from the moment a leg's pose is 'warn'.
//   plan: hits the nearest leg whose tip it can reach that is not warning or striking, standing just outside the pool the tip lies in (a
//     spot on a ring round the tip that is open floor and clear of every hazard). With every leg cut and the head down, it goes for the
//     head. It walks the cheapest way over open floor, where a pool costs a few steps and a warned line or band is not crossed, swings when
//     the target is within the hero's reach, swaps to the strongest healthy hero on the bench, and lets a Flayed that is close take the
//     generic fight (bot.ts). A careless bot walks the same plan and ignores every hazard in it.
import type { ActorView, FxView, PoolView, SimView, Vec2 } from '../core/types.ts';
import { ENEMY_DEFS } from '../enemies/defs.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import type { Finish } from './bot_boss.ts';
import type { Style } from './bot_billy.ts';

const LX = ENEMY_DEFS.flayerleg.x;
const TAU = Math.PI * 2;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** How far from a warned line's middle a hero stays: its half width and a little slack. */
const LINE_PAD = LX.halfW + 4;
/** Above or below a band's edge. */
const BAND_PAD = 6;
/** Frames in a pool before the bot walks out of it. */
const POOL_STAY = 10;
/** Frames a warning is up before the bot reacts: a player needs a moment to see it. */
const REACT = 2;
/** A Flayed this close is the fight, not the legs. */
const FLAYED_NEAR = 70;
/** Just above the sim's 0.15 dead zone: turns the hero to face a target without walking anywhere. */
const NUDGE = 0.2;
/** The router's grid: cell size, the margin round the hero and the goal, how many cells ahead it steers, and the eight neighbors. */
const CELL = 8;
const PAD = 40;
const LOOKAHEAD = 2;
/** What a cell costs the router: open floor, a pool, and the floor under a warned line or band. */
const COST_POOL = 6;
const COST_DEADLY = 60;
/** Frames the router keeps a route before it plans again, and the px the goal may move meanwhile. */
const REPLAN = 6;
const MOVED = 6;
/** A bench hero this many levels above the active one, and at least this healthy, is swapped in. Frames between such swaps. */
const LEVELS = 2;
const HEALTHY = 0.7;
const SWAP_GAP = 240;
const INF = 1 << 30;
const NEIGHBORS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** The crit meter goes off with this many legs, or the head, within this many px. */
const BURST_RANGE = 190;

export interface FlayerEnv {
  walkable(x: number, y: number): boolean;
  /** A unit step toward a point, round walls. */
  walkTo(hx: number, hy: number, gx: number, gy: number): [number, number];
  careless: boolean;
}

export interface FlayerSense {
  /** Call every frame. A step out of a warned line or band or a pool, or null. */
  dodge(v: SimView, hx: number, hy: number): [number, number] | null;
  /** The plan against the legs and the head, or null while there is nothing to hit (or a Flayed is the fight). */
  plan(v: SimView, hx: number, hy: number, style: Style): Finish | null;
}

interface Seg { ax: number; ay: number; bx: number; by: number }
interface Rect { x0: number; y0: number; x1: number; y1: number }
interface Field { lines: Seg[]; bands: Rect[]; pools: PoolView[] }

/** The sweep's band: a 'sweep' fx, x, y its top-left. */
const isBand = (f: FxView): boolean => f.kind === 'sweep';
const isLeg = (a: ActorView): boolean => a.kind === 'enemy' && (a.id === 'flayerleg' || a.id === 'leg5') && a.anim !== 'ko';

/** The lines, bands and pools on the floor right now. */
function read(v: SimView): Field {
  const bands = v.fx.filter(isBand).map((f): Rect => ({ x0: f.x, x1: f.x + f.w, y0: f.y, y1: f.y + f.h }));
  const lines: Seg[] = [];
  for (const a of v.actors) {
    if (!isLeg(a) || !a.aim || (a.pose !== 'warn' && a.pose !== 'slam') || a.t < REACT) continue;
    // A sweeping leg's aim is a point on its band: the band is the danger, not the line to it.
    if (bands.some((b) => Math.abs((b.y0 + b.y1) / 2 - (a.aim as Vec2).y) < 0.5)) continue;
    lines.push({ ax: a.x, ay: a.y, bx: a.aim.x, by: a.aim.y });
  }
  return { lines, bands, pools: v.pools };
}

function toSeg(s: Seg, px: number, py: number): number {
  const vx = s.bx - s.ax, vy = s.by - s.ay;
  const l2 = vx * vx + vy * vy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - s.ax) * vx + (py - s.ay) * vy) / l2)) : 0;
  return dist(px, py, s.ax + vx * t, s.ay + vy * t);
}

/** A point under a warned line or band: about to be struck. */
function deadly(f: Field, x: number, y: number): boolean {
  return f.lines.some((s) => toSeg(s, x, y) < LINE_PAD) || f.bands.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 - BAND_PAD && y <= b.y1 + BAND_PAD);
}

const inPool = (f: Field, x: number, y: number): boolean => f.pools.some((p) => dist(x, y, p.x, p.y) < p.r + 4);

/** A point a hero should not stand on. */
const danger = (f: Field, x: number, y: number): boolean => deadly(f, x, y) || inPool(f, x, y);

export function createFlayerSense(env: FlayerEnv): FlayerSense {
  let frame = 0;
  let lastCast = -999;
  let lastSwap = -999;
  let kept: { gx: number; gy: number; at: number; mv: [number, number] } | null = null;
  /** Frames in a row the hero has stood in a pool. */
  let stuck = 0;

  /**
   * The hero's foot box (10 by 8) fits with its feet at (x, y). env.walkable asks about the tile under the point four px above the feet, so
   * it is asked about each edge of the box instead: near a wall it is four px too generous.
   */
  const open = (x: number, y: number): boolean =>
    env.walkable(x - 5, y + 3.9) && env.walkable(x + 5, y + 3.9) && env.walkable(x - 5, y - 4) && env.walkable(x + 5, y - 4);

  /** The shortest straight way out of a warned line or band, to a spot that is clear of every hazard if there is one. */
  function escape(f: Field, hx: number, hy: number): [number, number] | null {
    for (const clear of [danger, deadly]) {
      let best: [number, number] | null = null;
      let bestL = Infinity;
      for (let i = 0; i < 16; i++) {
        const ux = Math.cos((i * TAU) / 16), uy = Math.sin((i * TAU) / 16);
        for (let l = 4; l <= 72 && l < bestL; l += 4) {
          if (!open(hx + ux * l, hy + uy * l)) break;
          if (!clear(f, hx + ux * l, hy + uy * l)) { best = [ux, uy]; bestL = l; break; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function dodge(v: SimView, hx: number, hy: number): [number, number] | null {
    const f = read(v);
    // A pool is worth leaving once the hero has stood in it a moment: the slow and the sting come to more than the steps out.
    stuck = !env.careless && inPool(f, hx, hy) ? stuck + 1 : 0;
    return deadly(f, hx, hy) || stuck > POOL_STAY ? escape(f, hx, hy) : null;
  }

  /** A spot `r` px from (tx, ty) on open floor clear of every hazard, the nearest one to the hero. */
  function standOff(f: Field, tx: number, ty: number, r: number, hx: number, hy: number): Vec2 | null {
    let best: Vec2 | null = null;
    let bestD = Infinity;
    for (let i = 0; i < 16; i++) {
      const px = tx + Math.cos((i * TAU) / 16) * r, py = ty + Math.sin((i * TAU) / 16) * r;
      if (!open(px, py) || (!env.careless && danger(f, px, py))) continue;
      const d = dist(hx, hy, px, py);
      if (d < bestD) { bestD = d; best = { x: px, y: py }; }
    }
    return best;
  }

  /**
   * The first step of the cheapest way from the hero to (gx, gy) over open floor, on a grid of CELL px cells: a cell costs 1, a pool a few
   * more and the floor under a warned line or band a great deal. The hero's own cell and the goal's are always open. Null when the goal
   * can't be reached on the grid.
   */
  function route(f: Field, hx: number, hy: number, gx: number, gy: number): [number, number] | null {
    const x0 = Math.min(hx, gx) - PAD, y0 = Math.min(hy, gy) - PAD;
    const w = Math.ceil((Math.abs(hx - gx) + 2 * PAD) / CELL), h = Math.ceil((Math.abs(hy - gy) + 2 * PAD) / CELL);
    const cx = (i: number): number => x0 + ((i % w) + 0.5) * CELL, cy = (i: number): number => y0 + (Math.floor(i / w) + 0.5) * CELL;
    const cell = (x: number, y: number): number => Math.floor((y - y0) / CELL) * w + Math.floor((x - x0) / CELL);
    const start = cell(hx, hy), goal = cell(gx, gy);
    const costs = new Int16Array(w * h).fill(-1);
    const costOf = (n: number): number => {
      if (costs[n] === -1) {
        const x = cx(n), y = cy(n);
        costs[n] = n === goal || n === start ? 1 : !open(x, y) ? 0 : deadly(f, x, y) ? COST_DEADLY : inPool(f, x, y) ? COST_POOL : 1;
      }
      return costs[n] as number;
    };
    const best = new Int32Array(w * h).fill(INF);
    const from = new Int32Array(w * h).fill(-1);
    const buckets: number[][] = [[start]];
    best[start] = 0;
    search: for (let c = 0; c < buckets.length; c++) {
      for (const u of buckets[c] ?? []) {
        if (best[u] !== c) continue;
        if (u === goal) break search;
        const ix = u % w, iy = Math.floor(u / w);
        for (const [dx, dy] of NEIGHBORS) {
          const nx = ix + dx, ny = iy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx, k = costOf(n);
          if (k === 0 || c + k >= (best[n] as number)) continue;
          best[n] = c + k;
          from[n] = u;
          (buckets[c + k] ??= []).push(n);
        }
      }
    }
    if (best[goal] === INF) return null;
    const path: number[] = [];
    for (let c = goal; c !== -1; c = from[c] as number) path.push(c);
    const next = path[Math.max(0, path.length - 1 - LOOKAHEAD)] as number;
    const d = dist(hx, hy, cx(next), cy(next)) || 1;
    return [(cx(next) - hx) / d, (cy(next) - hy) / d];
  }

  /** The route to a spot, kept for a few frames while the spot stays where it is. A careless bot goes straight. */
  function walk(f: Field, hx: number, hy: number, gx: number, gy: number): [number, number] {
    if (env.careless) return env.walkTo(hx, hy, gx, gy);
    if (!kept || frame - kept.at >= REPLAN || dist(kept.gx, kept.gy, gx, gy) > MOVED) {
      kept = { gx, gy, at: frame, mv: route(f, hx, hy, gx, gy) ?? env.walkTo(hx, hy, gx, gy) };
    }
    return kept.mv;
  }

  /** A bench hero well above the active one in level and healthy enough to take over, or -1. */
  function stronger(v: SimView, level: number): number {
    let best = -1, bestLevel = level + LEVELS - 1;
    v.hud.party.forEach((p, i) => {
      if (!p.active && !p.ko && !p.channeling && p.hp / p.hpMax >= HEALTHY && p.level > bestLevel) { best = i; bestLevel = p.level; }
    });
    return best;
  }

  function plan(v: SimView, hx: number, hy: number, style: Style): Finish | null {
    frame++;
    const me = v.hud.party.find((p) => p.active);
    const body = v.actors.find((a) => a.kind === 'enemy' && (a.id === 'flayer' || a.id === 'flayer5') && a.anim !== 'ko');
    // In the final fight's channel the Mind Flayer kneels (dead, pose 'down'): it is not a target any more.
    if (!me || !body || body.pose === 'rise' || v.hud.channel) return null;
    if (v.actors.some((a) => a.kind === 'enemy' && a.id === 'flayed' && !a.puddle && a.pose !== 'rise' && a.anim !== 'ko' && dist(hx, hy, a.x, a.y) < FLAYED_NEAR)) return null;
    // The head when it is down, or the final boss's chest when it is open, else the nearest leg whose tip is free to be hit.
    const down = body.pose === 'down' || body.open === true;
    const open_ = v.actors.filter((a) => isLeg(a) && a.aim && a.pose !== 'severed' && a.pose !== 'warn' && a.pose !== 'slam');
    let tx = body.x, ty = body.y;
    if (!down) {
      const tip = open_.map((a) => a.aim as Vec2).sort((p, q) => dist(hx, hy, p.x, p.y) - dist(hx, hy, q.x, q.y))[0];
      if (!tip) return null;
      tx = tip.x; ty = tip.y;
    }
    const f = read(v);
    const d = dist(hx, hy, tx, ty);
    const hold = down ? style.hold : Math.max(style.hold, LX.poolR + 6);
    const out: Finish = { swapTo: -1, mv: [0, 0], cast: false, attack: false };
    const safe = env.careless || !danger(f, hx, hy);
    if (d > hold + 6 || !safe) {
      // Out of position, or standing where a pool or a leg would hurt: walk to a spot on the ring round the target.
      const spot = standOff(f, tx, ty, hold, hx, hy);
      if (spot) out.mv = walk(f, hx, hy, spot.x, spot.y);
      out.attack = d <= style.reach && safe;
    } else {
      out.attack = d <= style.reach;
    }
    // In position: face the target with a nudge too small to matter.
    if (out.attack && out.mv[0] === 0 && out.mv[1] === 0) {
      const a = Math.atan2(ty - hy, tx - hx);
      const face = me.id === 'dustin' || me.id === 'eleven' ? a : Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
      out.mv = [Math.cos(face) * NUDGE, Math.sin(face) * NUDGE];
    }
    const cost = HERO_DEFS[me.id].special.mp;
    if (out.attack && frame - lastCast > 60 && me.mp >= cost && ((me.id === 'dustin' && d < 50) || (me.id === 'eleven' && d <= 120))) {
      out.cast = true;
      lastCast = frame;
    }
    const better = frame - lastSwap > SWAP_GAP ? stronger(v, me.level) : -1;
    if (better >= 0) { out.swapTo = better; lastSwap = frame; }
    const near = open_.filter((a) => dist(hx, hy, (a.aim as Vec2).x, (a.aim as Vec2).y) < BURST_RANGE).length;
    out.burst = v.hud.burstReady && ((down && d < BURST_RANGE) || near >= 2);
    return out;
  }

  return { dodge, plan };
}
