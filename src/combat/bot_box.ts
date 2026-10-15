// The bot's play with the power box (bot_grigori.ts calls this). It reads only what a player sees in the view: the powerbox plates, the
// breaker and its state, Grigori, and the party bar. Nothing here reaches into the sim, and no flag is set for it.
//
// With Lucas or Nancy in the party and the breaker closed, it wants a shot at the breaker while Grigori's feet are on a plate. Their
// shots fly in eight directions and over walls, so any spot on a line through the breaker that runs along one of the eight will do.
//   lure: it picks a spot like that past a plate on the line from Grigori, and waits there. Grigori walks at the hero, so he crosses
//     the plate on his way.
//   shot: when he is on a plate, or will be by the time a shot gets to the breaker, the shooter takes the lead (a swap), stands on the
//     line and fires. The plates fire for 30 frames from the hit, and he is stunned if he is on one.
// It tries a few times, or waits a long while for him to come, and then leaves the breaker alone for a while.
import type { PropView, SimView, Vec2 } from '../core/types.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { distToSegment } from './space.ts';

const TAU = Math.PI * 2;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
/** How far off the line a shot may be and still hit the breaker, in px. */
const MISS = 6;
/** A lure spot is at least this far past the plate's centre, and the plate's centre is at most ON_WAY px off Grigori's line to it. */
const PAST = 20;
const ON_WAY = 10;
/** The shooter keeps this share of the shot's reach. */
const REACH_KEEP = 0.8;
/** Frames between two shots, and the shots without a result before it gives up for GIVE_UP frames. */
const SHOT_GAP = 40;
const TRIES = 4;
const GIVE_UP = 600;
/** Frames it may spend luring him before it drops the idea for a while. */
const LURE_BUDGET = 1200;
const NUDGE = 0.2;
const MIN_R = 28;
/** How far outside a plate still counts as near it, in px. */
const PLATE_MARGIN = 10;

export interface BoxEnv {
  walkable(x: number, y: number): boolean;
  walkTo(hx: number, hy: number, gx: number, gy: number): [number, number];
}

/** What it asks of the bot this frame. `swapTo` is a party slot or -1, `mv` the step, `attack` a shot. */
export interface BoxMove { swapTo: number; mv: [number, number]; attack: boolean }

export interface BoxPlay {
  /** One frame, with Grigori `g` (any actor view) and the hero's feet. A move, or null when the box is not in play. */
  read(v: SimView, g: { x: number; y: number; anim: string }, hx: number, hy: number): BoxMove | null;
}

/** A plate within a step of (x, y). With `firing`, only one that is firing now (state 'lit') counts. */
export function nearPlate(v: SimView, x: number, y: number, firing = false): boolean {
  return v.props.some((p) => p.kind === 'powerbox' && (!firing || p.state === 'lit')
    && x >= p.x - PLATE_MARGIN && x < p.x + p.w + PLATE_MARGIN && y - 4 >= p.y - PLATE_MARGIN && y - 4 < p.y + p.h + PLATE_MARGIN);
}

const centre = (p: PropView): Vec2 => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 });

/** Feet inside the plate, as the sim counts it (the middle of the foot box). */
export const onPlate = (p: PropView, x: number, y: number): boolean => x >= p.x && x < p.x + p.w && y - 4 >= p.y && y - 4 < p.y + p.h;

/** The eight-way shot direction from (hx, hy) at the breaker, and how far the line passes from its middle. */
function lineTo(b: PropView, hx: number, hy: number): { a: number; miss: number; along: number } {
  const c = centre(b);
  const a = Math.round(Math.atan2(c.y - hy, c.x - hx) / (TAU / 8)) * (TAU / 8);
  const ux = Math.cos(a), uy = Math.sin(a);
  const rx = c.x - hx, ry = c.y - hy;
  return { a, miss: Math.abs(rx * uy - ry * ux), along: rx * ux + ry * uy };
}

export function createBoxPlay(env: BoxEnv): BoxPlay {
  let frame = 0;
  let lastShot = -999, shots = 0, quietUntil = -1, lured = 0;
  let spot: { x: number; y: number; until: number } | null = null;

  /** Spots on the eight lines through the breaker, `lo` to `hi` px out from it, that are open floor. */
  function spotsOn(b: PropView, plates: PropView[], lo: number, hi: number): Vec2[] {
    const c = centre(b);
    const out: Vec2[] = [];
    for (let k = 0; k < 8; k++) {
      for (let r = lo; r <= hi; r += 8) {
        const x = c.x + Math.cos((k * TAU) / 8) * r, y = c.y + Math.sin((k * TAU) / 8) * r;
        // Not on a plate: it would hit the shooter as well.
        if (env.walkable(x, y) && !plates.some((p) => onPlate(p, x - 6, y) || onPlate(p, x + 6, y) || onPlate(p, x, y + 6) || onPlate(p, x, y - 6))) out.push({ x, y });
      }
    }
    return out;
  }

  /**
   * The spot to wait at: on a line through the breaker, past a plate on Grigori's way, so that he crosses the plate on his walk to
   * it. The nearest to the hero that qualifies, kept for a while so it does not flip while Grigori turns. Null when there is none.
   */
  function lureSpot(b: PropView, plates: PropView[], g: Vec2, hx: number, hy: number, hi: number): Vec2 | null {
    if (spot && frame < spot.until) return spot;
    let best: Vec2 | null = null, bestD = Infinity;
    for (const p of plates) {
      const pc = centre(p);
      const reachP = dist(g.x, g.y, pc.x, pc.y);
      if (reachP < 24) continue;
      for (const s of spotsOn(b, plates, MIN_R, hi)) {
        if (dist(s.x, s.y, pc.x, pc.y) < PAST || dist(g.x, g.y, s.x, s.y) < reachP) continue;
        if (distToSegment(pc.x, pc.y, g.x, g.y, s.x, s.y) > ON_WAY) continue;
        const d = dist(hx, hy, s.x, s.y);
        if (d < bestD) { best = s; bestD = d; }
      }
    }
    spot = best ? { ...best, until: frame + 30 } : null;
    return spot;
  }

  /** The nearest spot on a line through the breaker, for a shooter who has to line up. */
  function nearestLine(b: PropView, plates: PropView[], hx: number, hy: number, hi: number): Vec2 | null {
    let best: Vec2 | null = null, bestD = Infinity;
    for (const s of spotsOn(b, plates, MIN_R, hi)) {
      const d = dist(hx, hy, s.x, s.y);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best;
  }

  return {
    read(v, g, hx, hy) {
      frame++;
      const b = v.props.find((p) => p.kind === 'breaker');
      const plates = v.props.filter((p) => p.kind === 'powerbox');
      const si = v.hud.party.findIndex((p) => !p.ko && HERO_DEFS[p.id].utilities.includes('shoot'));
      const shooter = v.hud.party[si];
      if (b?.state === 'lit') shots = 0;
      if (!b || b.state !== 'closed' || plates.length === 0 || !shooter || frame < quietUntil) { spot = null; return null; }
      if (shots >= TRIES) { shots = 0; quietUntil = frame + GIVE_UP; spot = null; return null; }
      const def = HERO_DEFS[shooter.id].basic;
      const reach = def.reach * REACH_KEEP;
      const hurry = plates.some((p) => onPlate(p, g.x, g.y));
      // Where he will be when a shot sent from here gets to the breaker. He walks on while he is walking, and not while he swings.
      const arrives = (fx: number, fy: number): boolean => {
        const c = centre(b);
        const t = dist(fx, fy, c.x, c.y) / def.x.speed;
        const walking = g.anim === 'walk';
        const d = dist(g.x, g.y, fx, fy) || 1;
        const px = g.x + (walking ? ((fx - g.x) / d) * 0.7 * t : 0), py = g.y + (walking ? ((fy - g.y) / d) * 0.7 * t : 0);
        return plates.some((p) => onPlate(p, px, py));
      };
      const me = v.hud.party.find((p) => p.active);
      if (!me) return null;
      const near = dist(hx, hy, g.x, g.y) < 90 || hurry;
      const wants = hurry || arrives(hx, hy);
      const ln = lineTo(b, hx, hy);
      const lined = ln.miss <= MISS && ln.along > 8 && ln.along <= reach;
      // On the plate now, or about to be: the shooter takes over and fires from where he stands if the line is right.
      if (wants && near && me.id === shooter.id && lined) {
        if (frame - lastShot < SHOT_GAP) return { swapTo: -1, mv: [0, 0], attack: false };
        lastShot = frame;
        shots++;
        lured = 0;
        return { swapTo: -1, mv: [Math.cos(ln.a) * NUDGE, Math.sin(ln.a) * NUDGE], attack: true };
      }
      if (hurry) {
        if (me.id !== shooter.id) return { swapTo: si, mv: [0, 0], attack: false };
        const s = nearestLine(b, plates, hx, hy, reach);
        return s ? { swapTo: -1, mv: env.walkTo(hx, hy, s.x, s.y), attack: false } : null;
      }
      // Not yet: wait at the lure spot, with the shooter in front once he is near. It does not wait for ever.
      const s = lureSpot(b, plates, g, hx, hy, reach);
      if (!s) return null;
      if (++lured > LURE_BUDGET) { lured = 0; quietUntil = frame + GIVE_UP; spot = null; return null; }
      if (dist(hx, hy, s.x, s.y) > 5) return { swapTo: -1, mv: env.walkTo(hx, hy, s.x, s.y), attack: false };
      if (me.id !== shooter.id && dist(hx, hy, g.x, g.y) < 110) return { swapTo: si, mv: [0, 0], attack: false };
      const c = centre(b);
      const a = Math.atan2(c.y - hy, c.x - hx);
      return { swapTo: -1, mv: [Math.cos(a) * NUDGE, Math.sin(a) * NUDGE], attack: false };
    },
  };
}
