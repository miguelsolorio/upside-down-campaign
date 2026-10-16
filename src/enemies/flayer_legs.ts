// A Mind Flayer leg (docs/level-9.md, "The Mind Flayer"). Four of them grow from the body's front, rooted: nothing moves them. The body
// (enemies/flayer.ts) says when one goes; the leg does the rest.
//
//   where it is: the enemy's x, y is its TIP, where it is hit, and the root it grows from is LegState.rx, ry. ActorView.x, y is the root and
//     ActorView.aim the tip, so gfx draws a line between them. A leg's tip lies 56 px in front of its root until its first slam.
//   line: warn 40 frames (28 in phase two): pose 'warn', anim 'attack', so ActorView.t counts the frames of the warning, and aim is the tip of
//     the line, from the root through where the hero stood, 150 px long, stopped short of a wall. Then slam 12 frames (pose 'slam', the
//     `legslam` sfx, a 'slam' fx at the tip: w the line's length, h 0, angle its heading). Any hero within 12 px of the line takes power 1.2
//     with knockback 5, once. A goo pool lies where the tip landed (combat/pools.ts). Then it rests 30 frames, the tip on the floor, open to hits.
//   sweep: the same beats with a band instead of a line. The band is one 'sweep' fx: x, y its top-left, w its length, h 24, life the warn and
//     the slam together, so t < 40 is the warning. It runs wall to wall along the row the hero stood on. Any hero in it takes power 1.0 and
//     knockback 4. The leg's aim is the point of the band under its root. No pool.
//   severed: at 0 HP (enemies/flayer_hit.ts keeps it alive): pose 'severed', the `sever` sfx, no more slams, no more hits. The body regrows
//     it when its head comes up.
// Word vomit staggers a leg for 30 frames (combat/confuse.ts), and a staggered brain does not run, so a slam waits. A band's fx waits with
// it (legWait), so t < 40 stays the warning.
import type { Vec2 } from '../core/types.ts';
import type { Enemy, Hero, LegState, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { distToSegment, footBlocked, BODY_Y } from '../combat/space.ts';
import { addFx, dust, floater, sfx, shake, sparks } from '../combat/fx.ts';
import { hurtHero } from '../combat/damage.ts';
import { addPool } from '../combat/pools.ts';
import { ENEMY_DEFS } from './defs.ts';
import { setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.flayerleg;
const X = DEF.x;

/** The farthest open point along a ray from (x, y), at most `len` px, in steps of up to 4. A start inside a wall is walked out of first. */
export function scanRay(s: S, x: number, y: number, ux: number, uy: number, len: number): Vec2 {
  let best: Vec2 = { x, y };
  let seen = !footBlocked(s, x, y);
  const n = Math.max(1, Math.ceil(len / 4));
  for (let i = 1; i <= n; i++) {
    const px = x + ux * len * (i / n), py = y + uy * len * (i / n);
    if (footBlocked(s, px, py)) { if (seen) break; continue; }
    seen = true;
    best = { x: px, y: py };
  }
  return best;
}

function setTip(e: Enemy, p: Vec2): void {
  e.x = e.hx = p.x;
  e.y = e.hy = p.y;
}

/** Where a leg's tip lies at rest: straight in front of its root. */
function restTip(s: S, l: LegState): Vec2 {
  return scanRay(s, l.rx, l.ry, 0, 1, X.restLen);
}

/** Every leg's tip goes to its rest spot, and each body finds its legs (in id order) and each leg its body. Called once the spawns are built. */
export function linkFlayer(s: S): void {
  const legs = s.enemies.filter((e) => e.leg !== null);
  for (const e of legs) setTip(e, restTip(s, e.leg as LegState));
  for (const b of s.enemies) {
    if (!b.flayer) continue;
    b.flayer.legs = legs.filter((l) => l.group === b.group).sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
    for (const l of b.flayer.legs) (l.leg as LegState).body = b;
  }
}

// ---------------------------------------------------------------- warning
function begin(e: Enemy, l: LegState, move: LegState['move'], frames: number): void {
  l.move = move;
  l.t = frames;
  e.mode = 'chase';
}

/** A line: locked through where the hero stands now, 150 px long, stopped short of a wall. */
export function startLine(s: S, e: Enemy, hero: Hero, frames: number): void {
  const l = e.leg as LegState;
  const dx = hero.x - l.rx, dy = hero.y - l.ry;
  const a = Math.hypot(dx, dy) < 2 ? Math.PI / 2 : Math.atan2(dy, dx);
  setTip(e, scanRay(s, l.rx, l.ry, Math.cos(a), Math.sin(a), X.len));
  e.dir = dirOfVec(e.x - l.rx, e.y - l.ry, e.dir);
  l.sweep = null;
  l.struck = false;
  l.at = s.frame;
  begin(e, l, 'warn', frames);
  setEnemyAnim(e, 'attack');
  sfx(s, 'alert');
}

/** A sweep: the row the hero stands on, wall to wall, X.bandH px tall. */
export function startSweep(s: S, e: Enemy, hero: Hero): void {
  const l = e.leg as LegState;
  const y = hero.y;
  let x0 = hero.x, x1 = hero.x;
  for (let i = 0; i < 800 && !footBlocked(s, x0 - 1, y); i++) x0 -= 1;
  for (let i = 0; i < 800 && !footBlocked(s, x1 + 1, y); i++) x1 += 1;
  // To the wall faces: the foot box is 10 wide.
  x0 -= 5; x1 += 5;
  const warn = X.sweepWarn as number;
  const fx = addFx(s, 'sweep', x0, y - X.bandH / 2, 'down', 0, warn + (X.slamT as number), x1 - x0, X.bandH);
  // The fx is created in a tick that counts it once, so t reads 0 on that tick and 40 on the one the leg strikes.
  fx.t = -1;
  l.sweep = { y, x0, x1, fx };
  l.struck = false;
  l.at = s.frame;
  setTip(e, { x: Math.max(x0, Math.min(l.rx, x1)), y });
  e.dir = dirOfVec(e.x - l.rx, e.y - l.ry, e.dir);
  begin(e, l, 'warn', warn);
  setEnemyAnim(e, 'attack');
  sfx(s, 'alert');
}

// ---------------------------------------------------------------- the strike
/** The hero is in the line (the middle of his feet within halfW of it) or in the band. Hurts him once per slam. */
function sting(s: S, e: Enemy, l: LegState, hero: Hero): void {
  if (l.struck || hero.ko) return;
  if (l.sweep) {
    const b = l.sweep;
    if (Math.abs(hero.y - b.y) > X.bandH / 2 || hero.x < b.x0 || hero.x > b.x1) return;
    // Out of the band, straight up or down.
    if (hurtHero(s, hero, hero.x, b.y + (hero.y >= b.y ? -1 : 1), X.sweepPower, e.atk, X.sweepKb) > 0) l.struck = true;
    return;
  }
  if (distToSegment(hero.x, hero.y, l.rx, l.ry, e.x, e.y) > X.halfW) return;
  // Across the line, away from its nearest point.
  const vx = e.x - l.rx, vy = e.y - l.ry;
  const len2 = vx * vx + vy * vy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((hero.x - l.rx) * vx + (hero.y - l.ry) * vy) / len2)) : 0;
  if (hurtHero(s, hero, l.rx + vx * t, l.ry + vy * t, DEF.power, e.atk, X.kb) > 0) l.struck = true;
}

function strike(s: S, e: Enemy, l: LegState, hero: Hero): void {
  begin(e, l, 'slam', X.slamT as number);
  sfx(s, 'legslam');
  shake(s, l.sweep ? 4 : 3);
  if (!l.sweep) {
    const len = Math.hypot(e.x - l.rx, e.y - l.ry);
    addFx(s, 'slam', e.x, e.y, e.dir, Math.atan2(e.y - l.ry, e.x - l.rx), X.slamT as number, len, 0);
    dust(s, e.x, e.y, 5);
    addPool(s, e.x, e.y);
  }
  sting(s, e, l, hero);
}

export function legUpdate(s: S, e: Enemy, hero: Hero): void {
  const l = e.leg as LegState;
  // The tick a warning starts is not one of its frames, whether the body or a test started it.
  if (l.at === s.frame) return;
  switch (l.move) {
    case 'warn':
      if (--l.t <= 0) strike(s, e, l, hero);
      return;
    case 'slam':
      sting(s, e, l, hero);
      if (--l.t <= 0) { begin(e, l, 'rest', X.rest as number); setEnemyAnim(e, 'idle'); }
      return;
    case 'rest':
      if (--l.t <= 0) { l.move = 'idle'; l.sweep = null; }
      return;
    default:
      setEnemyAnim(e, 'idle');
  }
}

// ---------------------------------------------------------------- cut and regrown
function dropBand(s: S, l: LegState): void {
  const band = l.sweep;
  if (!band) return;
  s.fx = s.fx.filter((f) => f !== band.fx);
  l.sweep = null;
}

/** The hit that took a leg to 0 HP: it is cut, and stays on the floor. Called after every hit and burn tick. */
export function sever(s: S, e: Enemy): void {
  const l = e.leg;
  if (!l || l.move === 'severed' || e.hp > 0) return;
  dropBand(s, l);
  l.move = 'severed';
  l.t = 0;
  e.hp = 0;
  e.stagger = 0;
  e.mode = 'idle';
  setEnemyAnim(e, 'idle');
  sfx(s, 'sever');
  shake(s, 3);
  sparks(s, e.x, e.y - BODY_Y, 5);
  dust(s, e.x, e.y, 4);
  floater(s, 'SEVERED', e.x, e.y - 24, 'yellow', true, 60);
}

/** The head came up: the leg grows back at full HP, its tip at rest. */
export function regrow(s: S, e: Enemy): void {
  const l = e.leg;
  if (!l) return;
  dropBand(s, l);
  l.move = 'idle';
  l.t = 0;
  e.hp = e.hpMax;
  e.stagger = 0;
  setTip(e, restTip(s, l));
  setEnemyAnim(e, 'idle');
  dust(s, e.x, e.y, 5);
}

/** A staggered leg waits: the band's fx, which the tick would count, holds its t, so it still reads 40 frames of warning in all. */
export function legWait(e: Enemy): void {
  if (e.leg?.sweep && e.leg.move === 'warn') e.leg.sweep.fx.t--;
}
