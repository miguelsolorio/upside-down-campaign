// Playing with the mouse. A left click on the ground sends the active hero walking there, round walls and props; a left click on an enemy
// sends him into reach of it and attacks until it is dead; a right click is his Special, aimed at the cursor; a click on the lit Crit
// column fires the burst. The glue in play.ts turns clicks into a `MouseTick` and calls `drive` once per sim tick with that tick's keys
// and pad; `drive` returns the SimInput to step with. It is the bot's walk (combat/bot.ts) with a person's goal: A* over the grid and
// the solid props, a straight line when one is clear, a stand-off of its own per hero, and no fighting skill beyond facing the target,
// holding Attack and, for the shooters, lining a shot up. Keys and the pad always win: any movement, Attack, swap or Crit from the
// keyboard drops the goal at once. Pure, with no DOM and no canvas, so it is tested headless against the real sim.
import type { EnemyKind, Grid, HeroId, PartyHud, SimInput, SimView, Vec2 } from '../core/types.ts';
import { TILE } from '../core/config.ts';
import { HERO_DEFS } from '../heroes/defs.ts';
import { LV6, hasTalent } from '../progression/talents.ts';
import { DEADZONE } from '../combat/hero.ts';
import type { Nav, Pos } from '../combat/state.ts';
import { astar, buildNav, nearestFree } from '../combat/nav.ts';
import { BODY_Y, FOOT_H, FOOT_W, angleDiff, dist } from '../combat/space.ts';
import { footOf, isFoe } from './mousepick.ts';

/** A walk ends within this many px of its spot. Just over the 4.5 px at which a waypoint is passed. */
export const ARRIVE = 5;
/** A walk or chase ends after this many ticks in which the hero has not moved STUCK_PX, while he is being asked to move. */
export const STUCK_TICKS = 45;
export const STUCK_PX = 3;
/** The most ticks a walk lasts, and the most ticks of walking after an enemy (not counting those spent hitting it). */
export const MAX_WALK = 1200;
export const MAX_CHASE = 900;
/** Ticks between rebuilding the map of solid props and planning the route again, so a gate that opens is noticed. */
export const REPLAN = 30;
/** How far, in px, an enemy may have moved between two ticks and still be the one the hero is after. */
export const TRACK_R = 24;
/** Just above the sim's dead zone (combat/hero.ts): turns the hero to face a spot without walking anywhere. */
export const NUDGE = 0.2;
/** A shooter's shot misses a target that far off its eight-way line (px, measured across the line). */
export const MISS_MAX = 9;
/** Ticks a goal's marker stays on after the goal ends. */
export const MARK_FRAMES = 24;

/** Where a left click sends the hero: to a spot, or at an enemy of a kind, standing at `x`, `y` (its foot, see `footOf`). */
export type MouseGoal = { kind: 'walk'; x: number; y: number } | { kind: 'attack'; id: EnemyKind; x: number; y: number };

/** What the mouse did this tick, as the glue reads it. */
export interface MouseTick {
  /** A left click on the field. 'stop' is a click on the active hero. */
  go: MouseGoal | 'stop' | null;
  /** A right click: the cursor in world px, or true when it was on the HUD strip, which has no spot to aim at. */
  special: Vec2 | true | null;
  /** The right button is down. */
  specialHeld: boolean;
  /** A click on the lit Crit column. */
  burst: boolean;
}

/** A tick in which the mouse did nothing. */
export const NO_TICK: MouseTick = Object.freeze({ go: null, special: null, specialHeld: false, burst: false });

/**
 * The marker to draw for a goal. `age` counts the ticks since the goal was set while it is live, and since it ended after that
 * (0 on the tick it ended), so a renderer can pulse the first and fade the second over MARK_FRAMES.
 */
export interface MouseMark { kind: 'walk' | 'attack'; x: number; y: number; age: number; live: boolean }

export interface MousePlay {
  /** `keys` is this tick's keyboard and pad SimInput. Returns the SimInput to step the sim with: `keys` itself when the mouse adds nothing. */
  drive(keys: SimInput, tick: MouseTick, view: SimView, hero: Vec2): SimInput;
  /** The live goal, or the last one for MARK_FRAMES ticks (counting the tick it ended) after it ended. Null otherwise. */
  marker(): MouseMark | null;
  /** Drops the goal and the marker, for a new stage. */
  reset(): void;
}

/** What a tick of following a goal asks of the hero. */
interface Steer { mx: number; my: number; attackHeld: boolean; attackPressed: boolean }

/** The active hero's goal. For a walk (x, y) is the spot the click snapped to; for an attack it is the enemy's last known foot. */
interface Goal { kind: 'walk' | 'attack'; x: number; y: number; id?: EnemyKind; hero: HeroId }

/** Heroes whose shot flies along one of eight directions and misses a target off it (heroes/defs.ts). */
const SHOOTERS = new Set<HeroId>(['lucas', 'will', 'nancy']);
/** Enemies a hero may hit without a clear line to its feet: the Mind Flayer, and the flyers that circle over walls. */
const OVER_WALLS = new Set<string>(['flayer', 'flayer5', 'demobat']);
/** Basic attacks that reach this far or less are swings, which the hero walks up to; longer ones are shots, fired from further off. */
const MELEE_MAX = 60;
/** How close to a waypoint counts as passing it. */
const PASS = 4.5;
/** Ticks a sidestep may go without moving the hero before he closes in on the target instead. */
const PINNED = 6;

const tileOf = (x: number, y: number): Pos => ({ x: Math.floor(x / TILE), y: Math.floor((y - 4) / TILE) });
/** Where a hero's feet stand in the middle of a tile. */
const feetOf = (t: Pos): Vec2 => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + 12 });
const snap8 = (a: number): number => Math.round(a / (Math.PI / 4)) * (Math.PI / 4);

/** The props the route treats as wall: the rule of propBlocks (combat/space.ts), read off the view. */
function solidRects(view: SimView): { x: number; y: number; w: number; h: number }[] {
  return view.props.filter((p) => p.solid === true && (p.state !== 'open' || p.kind === 'gap'));
}

/**
 * True when a straight line between two feet points crosses no blocked tile. `lift` raises the sample points: 4 is the middle of the
 * 8 px foot box, 0 the feet themselves, where a hit's line of sight runs. `wide` also samples to either side by the box's half extent
 * across the line (5 px for a hero walking up or down, where the 10 px width is across it, 4 px for one walking along a row), so a
 * line that passes is one the whole foot box fits along.
 */
function clearLine(nav: Nav, ax: number, ay: number, bx: number, by: number, lift: number, wide: boolean): boolean {
  const len = dist(ax, ay, bx, by);
  const n = Math.ceil(len / 4);
  const px = len > 0 ? -(by - ay) / len : 0, py = len > 0 ? (bx - ax) / len : 0;
  const half = wide ? Math.abs(px) * FOOT_W / 2 + Math.abs(py) * FOOT_H / 2 - 0.01 : 0;
  const offsets = wide ? [0, -half, half] : [0];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    for (const o of offsets) {
      const tx = Math.floor((ax + (bx - ax) * t + px * o) / TILE), ty = Math.floor((ay + (by - ay) * t + py * o - lift) / TILE);
      if (tx < 0 || ty < 0 || tx >= nav.w || ty >= nav.h || nav.blocked[ty * nav.w + tx] === 1) return false;
    }
  }
  return true;
}

/** Makes a driver for one stage's grid. */
export function createMousePlay(grid: Grid): MousePlay {
  let goal: Goal | null = null;
  let mark: MouseMark | null = null;
  let nav: Nav = buildNav(grid);
  let navAge = 0;
  let path: Pos[] = [];
  let pathGoal = -1;
  let pathAge = 0;
  /** Ticks since the walk was set, and ticks spent walking after an enemy. */
  let walked = 0, chased = 0;
  /** Where the hero was when the stuck count began, and the ticks since he last moved STUCK_PX from there. */
  let anchor: Vec2 = { x: 0, y: 0 };
  let still = 0;
  /** In reach of the enemy: the hysteresis between closing in and standing to fight. */
  let engaged = false;
  /** Ticks engaged, for Hopper's tap. */
  let pulse = 0;

  function restart(hero: Vec2): void {
    path = []; pathGoal = -1; pathAge = 0; navAge = 0;
    walked = 0; chased = 0; still = 0; anchor = { x: hero.x, y: hero.y };
    engaged = false; pulse = 0;
  }

  /** The goal is over, for whatever reason. Its marker stays a while. */
  function end(): void {
    if (!goal) return;
    mark = { kind: goal.kind, x: goal.x, y: goal.y, age: 0, live: false };
    goal = null; path = []; pathGoal = -1; engaged = false;
  }

  /** Sets the goal a click asked for. A walk whose spot has no free tile within six of it is ignored, and the old goal stays. */
  function begin(go: MouseGoal, active: PartyHud, view: SimView, hero: Vec2): void {
    const fresh = buildNav(grid, solidRects(view));
    let next: Goal;
    if (go.kind === 'walk') {
      const g = tileOf(go.x, go.y);
      const t = nearestFree(fresh, g.x, g.y, 6);
      if (!t) return;
      const spot = feetOf(t);
      next = { kind: 'walk', x: spot.x, y: spot.y, hero: active.id };
    } else {
      next = { kind: 'attack', id: go.id, x: go.x, y: go.y, hero: active.id };
    }
    nav = fresh;
    goal = next;
    restart(hero);
    mark = { kind: next.kind, x: next.x, y: next.y, age: 0, live: true };
  }

  /** The route's map of solid props, made again every REPLAN ticks. */
  function refreshNav(view: SimView): void {
    if (++navAge < REPLAN) return;
    nav = buildNav(grid, solidRects(view));
    navAge = 0;
    pathGoal = -1;
  }

  /** A unit vector from the hero toward (tx, ty): straight when the line is clear, else along an A* route, replanned when the goal's tile changes. */
  function steer(h: Vec2, tx: number, ty: number): [number, number] {
    let gx = tx, gy = ty;
    if (clearLine(nav, h.x, h.y, tx, ty, 4, true)) {
      path = []; pathGoal = -1;
    } else {
      const g = tileOf(tx, ty);
      const gt = nearestFree(nav, g.x, g.y) ?? g;
      const gi = gt.y * nav.w + gt.x;
      if (gi !== pathGoal || pathAge >= REPLAN) {
        const s = tileOf(h.x, h.y);
        path = astar(nav, s.x, s.y, gt.x, gt.y) ?? [];
        pathGoal = gi;
        pathAge = 0;
      }
      pathAge++;
      while (path.length > 0) {
        const f = feetOf(path[0] as Pos);
        if (dist(h.x, h.y, f.x, f.y) < PASS) path.shift(); else break;
      }
      if (path.length > 0) { const f = feetOf(path[0] as Pos); gx = f.x; gy = f.y; }
    }
    const d = dist(h.x, h.y, gx, gy) || 1;
    return [(gx - h.x) / d, (gy - h.y) / d];
  }

  /** Counts a tick of being asked to move. True once the hero has stood still for STUCK_TICKS of them. */
  function stuck(h: Vec2): boolean {
    if (dist(h.x, h.y, anchor.x, anchor.y) >= STUCK_PX) { anchor = { x: h.x, y: h.y }; still = 0; return false; }
    return ++still >= STUCK_TICKS;
  }

  /** The nearest enemy of the goal's kind within TRACK_R of where the target was last seen. A knocked-out one counts, so a kill ends the goal. */
  function track(view: SimView, g: Goal): { foot: Vec2; foe: boolean } | null {
    let best: Vec2 | null = null, foe = false, bd = Infinity;
    for (const a of view.actors) {
      if (a.kind !== 'enemy' || a.id !== g.id) continue;
      const f = footOf(a);
      const d = dist(f.x, f.y, g.x, g.y);
      if (d <= TRACK_R && d < bd) { best = f; bd = d; foe = isFoe(a); }
    }
    return best ? { foot: best, foe } : null;
  }

  function followWalk(g: Goal, view: SimView, hero: Vec2): Steer | null {
    if (++walked > MAX_WALK) return null;
    refreshNav(view);
    if (dist(hero.x, hero.y, g.x, g.y) <= ARRIVE) return null;
    const [mx, my] = steer(hero, g.x, g.y);
    if (stuck(hero)) return null;
    return { mx, my, attackHeld: false, attackPressed: false };
  }

  function followAttack(g: Goal, active: PartyHud, view: SimView, hero: Vec2): Steer | null {
    const seen = track(view, g);
    if (!seen || !seen.foe) return null;
    const foot = seen.foot;
    g.x = foot.x; g.y = foot.y;
    if (mark && mark.live) { mark.x = foot.x; mark.y = foot.y; }
    refreshNav(view);
    const d = dist(hero.x, hero.y, foot.x, foot.y);
    const reach = HERO_DEFS[g.hero].basic.reach;
    const melee = reach <= MELEE_MAX;
    const closeIn = melee ? reach - 4 : 0.7 * reach;
    const letGo = melee ? reach + 2 : 0.95 * reach;
    const near = engaged ? d <= letGo : d <= closeIn;
    engaged = near && (OVER_WALLS.has(g.id as string) || clearLine(nav, hero.x, hero.y, foot.x, foot.y, 0, false));
    if (!engaged) {
      pulse = 0;
      if (++chased > MAX_CHASE) return null;
      const [mx, my] = steer(hero, foot.x, foot.y);
      if (stuck(hero)) return null;
      return { mx, my, attackHeld: false, attackPressed: false };
    }
    const ang = Math.atan2(foot.y - hero.y, foot.x - hero.x);
    if (SHOOTERS.has(g.hero)) {
      // A shot flies along one of eight lines: sidestep along the perpendicular until the target is on one.
      const a8 = snap8(ang);
      if (d * Math.sin(angleDiff(ang, a8)) >= MISS_MAX) {
        const px = -Math.sin(a8), py = Math.cos(a8);
        const sg = Math.sign((foot.x - hero.x) * px + (foot.y - hero.y) * py) || 1;
        // A sidestep pinned against a wall closes in instead, which shrinks how far off the line the target is.
        const [mx, my] = still >= PINNED ? steer(hero, foot.x, foot.y) : [px * sg, py * sg];
        if (stuck(hero)) return null;
        return { mx, my, attackHeld: false, attackPressed: false };
      }
    }
    anchor = { x: hero.x, y: hero.y }; still = 0;
    // Hopper from Lv 6 swings when Attack comes up: press and hold on one tick, let go on the next.
    const tap = g.hero === 'hopper' && hasTalent('hopper', active.level, LV6);
    const down = !tap || pulse++ % 2 === 0;
    return { mx: Math.cos(ang) * NUDGE, my: Math.sin(ang) * NUDGE, attackHeld: down, attackPressed: tap && down };
  }

  return {
    drive(keys, tick, view, hero) {
      if (mark) {
        mark.age++;
        if (!mark.live && mark.age >= MARK_FRAMES) mark = null;
      }
      const active = view.hud.party.find((p) => p.active);
      // Keys and the pad win: a held key drops the goal, and a click made in the same tick is ignored.
      const keyed = keys.mx !== 0 || keys.my !== 0 || keys.attackHeld || keys.attackPressed || keys.swapTo >= 0 || keys.swapDelta !== 0
        || tick.burst || keys.burstPressed;
      const gone = !active || active.ko || !!view.hud.solo;
      if (tick.go === 'stop') end();
      else if (tick.go && active && !keyed && !gone) begin(tick.go, active, view, hero);
      if (goal && (keyed || gone || !active || active.id !== goal.hero)) end();

      let dirty = false;
      let mx = keys.mx, my = keys.my, attackHeld = keys.attackHeld, attackPressed = keys.attackPressed;
      if (goal && active) {
        const st = goal.kind === 'walk' ? followWalk(goal, view, hero) : followAttack(goal, active, view, hero);
        if (st) {
          ({ mx, my, attackHeld, attackPressed } = st);
          dirty = true;
        } else {
          end();
        }
      }

      // A right click: the Special, this tick only, aimed by a nudge toward the cursor unless the keys are steering.
      let specialPressed = keys.specialPressed;
      const specialHeld = keys.specialHeld || tick.specialHeld;
      if (specialHeld !== keys.specialHeld) dirty = true;
      if (tick.special) {
        specialPressed = true;
        dirty = true;
        if (tick.special !== true && Math.hypot(keys.mx, keys.my) <= DEADZONE) {
          const dx = tick.special.x - hero.x, dy = tick.special.y - (hero.y - BODY_Y);
          const len = Math.hypot(dx, dy);
          if (len >= 1) { mx = (dx / len) * NUDGE; my = (dy / len) * NUDGE; }
        }
      }

      let burstPressed = keys.burstPressed;
      if (tick.burst && view.hud.burstReady) { burstPressed = true; dirty = true; }

      if (!dirty) return keys;
      return { ...keys, mx, my, attackHeld, attackPressed, specialPressed, specialHeld, burstPressed };
    },

    marker() {
      return mark ? { ...mark } : null;
    },

    reset() {
      goal = null; mark = null; path = []; pathGoal = -1;
      engaged = false;
    },
  };
}
