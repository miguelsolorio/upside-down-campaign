// The demobat (docs/level-12.md, "The demobat"): a flyer that circles the active hero in a flock and dives. It ignores solid tiles, gaps and
// props, and the nav grid never applies: it moves straight through the air and never lands (enemies/demobat_hit.ts has what its height means).
//
//   idle: until the hero comes within aggro px (no line needed), or a hit or a flockmate wakes it, it hovers over its spot.
//   orbit: the awake bats of a group take equal slots on a ring of x.orbit px round the hero, a slot turning at the bat's walk, and fly to
//     theirs at 1.6 times that. About every x.diveEvery frames the flock sends one bat down, the one that has waited longest, never two at once.
//   wind: x.diveWindup frames under the red "!" (pose crouch). The line of the dive is locked on where the hero stands as it begins.
//   dive: x.diveT frames at x.diveSpeed px a frame along it, z falling to 2 (pose charge). A hero it touches takes power 0.8, once. A bat on
//     the 4.3 roof dives only when a miss sends it (sendDive), and hits for x.roofPower.
//   climb: x.climb frames back up to its height, flying to its slot. It is low, and open to melee, for the first part of it.
//   stun: a stun (Eddie's solo pulses) drops it to z 2, pose stun, and anyone can hit it. When it runs out the bat climbs.
// A hit that staggers it breaks a wind-up or a dive, as it does for any foe that is not a boss.
import { TILE } from '../core/config.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { dist } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import { BOB, HOVER, LOW_Z, flockOf } from './demobat_hit.ts';
import type { BatState } from './demobat_hit.ts';
import { faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.demobat;
const X = DEF.x;
const TAU = Math.PI * 2;
/** How fast the ring turns, in radians a frame: the bat's walk round the orbit. */
const SPIN = DEF.speed / X.orbit;
/** A bat flies to its slot at this multiple of its walk, so the ring keeps up with a hero on the move. */
const CATCH = 1.6;
/** A dive touches a hero inside this many px. */
const TOUCH = 12;
/** A bat must be this close to the ring to be sent down, in px from the hero. */
const NEAR = X.orbit + 24;
/** Frames a flock waits after its first sight of the hero before it sends the first bat. */
const FIRST = 60;
/** How fast a stunned bat falls, in px a frame. */
const FALL = 1.5;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Moves a bat over walls and props alike, and keeps it on the map. */
export function glide(s: S, e: Enemy, dx: number, dy: number): void {
  e.x = clamp(e.x + dx, 6, s.grid.w * TILE - 6);
  e.y = clamp(e.y + dy, 14, s.grid.h * TILE - 2);
}

/** Flies `sp` px toward a point. Returns the distance flown. */
function fly(s: S, e: Enemy, tx: number, ty: number, sp: number): number {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return 0;
  const m = Math.min(sp, d);
  glide(s, e, (dx / d) * m, (dy / d) * m);
  return m;
}

/** The height it circles at: HOVER, swinging BOB either way, out of step with the next bat. */
const hoverZ = (s: S, e: Enemy): number => HOVER + BOB * Math.sin((s.frame + e.uid * 11) * 0.1);

/** Climbs toward its height at `step` px a frame, or eases down to it if it is above. */
function riseTo(s: S, e: Enemy, step: number): void {
  const hz = hoverZ(s, e);
  e.z = e.z < hz ? Math.min(hz, e.z + step) : e.z + (hz - e.z) * 0.15;
}

/** Flies to this bat's slot on the ring round the hero. */
function toSlot(s: S, e: Enemy, hero: Hero): void {
  const flock = flockOf(s, e).filter((o) => o.aware);
  const n = Math.max(1, flock.length), i = Math.max(0, flock.indexOf(e));
  const a = s.frame * SPIN + (i * TAU) / n;
  const moved = fly(s, e, hero.x + Math.cos(a) * X.orbit, hero.y + Math.sin(a) * X.orbit, DEF.speed * e.spd * speedMul(e.stat) * CATCH);
  faceHero(e, hero);
  setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
}

/** True when the flock should send this bat down now: its turn, the gap since the last dive is over, and nobody else is in a dive. */
function wantsDive(s: S, e: Enemy, hero: Hero): boolean {
  if (e.rt === 'roof' || e.cd > 0 || dist(e.x, e.y, hero.x, hero.y) > NEAR) return false;
  const flock = flockOf(s, e).filter((o) => o.aware);
  if (flock.some((o) => o.bat?.move === 'wind' || o.bat?.move === 'dive')) return false;
  const at = s.flocks.get(e.group);
  if (at === undefined) { s.flocks.set(e.group, s.frame + FIRST); return false; }
  if (s.frame < at) return false;
  // The bat that has waited longest goes, the first of them in the order they were made.
  let first: Enemy | null = null;
  for (const o of flock) {
    if (o.bat?.move !== 'orbit' || o.cd > 0 || dist(o.x, o.y, hero.x, hero.y) > NEAR) continue;
    if (first === null || (o.bat as BatState).last < (first.bat as BatState).last) first = o;
  }
  return first === e;
}

/** The "!" and the crouch. The line of the dive is locked on where the hero stands now. */
function startWind(s: S, e: Enemy, hero: Hero): void {
  const b = e.bat as BatState;
  const a = Math.atan2(hero.y - e.y, hero.x - e.x);
  e.ax = Math.cos(a) * X.diveSpeed;
  e.ay = Math.sin(a) * X.diveSpeed;
  faceHero(e, hero);
  e.cd = Math.round(DEF.cooldown * e.cdMul);
  e.mode = 'windup';
  b.move = 'wind'; b.t = X.diveWindup; b.last = s.frame; b.sent = false;
  s.flocks.set(e.group, s.frame + X.diveEvery);
  setEnemyAnim(e, 'attack');
  sfx(s, 'alert');
}

/** A miss on the roof sends this bat down at the hero at once: the same wind-up and dive, for roofPower. */
export function sendDive(s: S, e: Enemy, hero: Hero): void {
  startWind(s, e, hero);
  (e.bat as BatState).sent = true;
}

function startDive(s: S, e: Enemy, b: BatState): void {
  e.hitDone = false;
  e.mode = 'lunge';
  b.move = 'dive'; b.t = X.diveT;
  setEnemyAnim(e, 'dash');
  sfx(s, 'screech');
}

function toClimb(e: Enemy, b: BatState): void {
  b.move = 'climb'; b.t = X.climb;
  e.mode = 'chase';
}

/** One frame of the dive: it flies the locked line, z falling to 2 as it ends, and the first time it touches the hero it hurts him. */
function dive(s: S, e: Enemy, b: BatState, hero: Hero): void {
  glide(s, e, e.ax, e.ay);
  e.z += (LOW_Z - e.z) / Math.max(1, b.t);
  if (!e.hitDone && !hero.ko && dist(e.x, e.y, hero.x, hero.y) < TOUCH) {
    e.hitDone = true;
    hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, b.sent ? X.roofPower : DEF.power, e.atk, X.kb);
  }
  if (--b.t <= 0) toClimb(e, b);
}

/** A bat that has not noticed anyone hovers over its spot until the hero comes within aggro px (no line needed) or something wakes it. */
function idle(s: S, e: Enemy, hero: Hero): void {
  e.mode = 'idle';
  setEnemyAnim(e, 'idle');
  fly(s, e, e.hx, e.hy, 0.5);
  e.z += (hoverZ(s, e) - e.z) * 0.15;
  if (dist(e.x, e.y, hero.x, hero.y) <= DEF.aggro) { alertEnemy(s, e); sfx(s, 'flap'); }
}

/** A stun (a pulse of Eddie's solo): the bat falls to z 2 and lies there. Called while `stat.stun` counts, before anything else the bat does. */
export function stunBat(e: Enemy): void {
  (e.bat as BatState).move = 'stun';
  e.mode = 'chase';
  e.z = Math.max(LOW_Z, e.z - FALL);
  setEnemyAnim(e, 'hurt');
}

export function batUpdate(s: S, e: Enemy, hero: Hero): void {
  const b = e.bat as BatState;
  // A hit that broke the wind-up or the dive has already put the mode back to chase, and a stun that has run out leaves the bat on its back.
  if ((b.move === 'wind' && e.mode !== 'windup') || (b.move === 'dive' && e.mode !== 'lunge') || b.move === 'stun') toClimb(e, b);
  if (!e.aware) { idle(s, e, hero); return; }
  switch (b.move) {
    case 'wind':
      e.z += (hoverZ(s, e) - e.z) * 0.15;
      if (--b.t <= 0) startDive(s, e, b);
      return;
    case 'dive': dive(s, e, b, hero); return;
    case 'climb':
      riseTo(s, e, (HOVER - LOW_Z) / X.climb);
      toSlot(s, e, hero);
      if (--b.t <= 0) b.move = 'orbit';
      return;
    default:
      e.mode = 'chase';
      e.z += (hoverZ(s, e) - e.z) * 0.15;
      toSlot(s, e, hero);
      if (wantsDive(s, e, hero)) startWind(s, e, hero);
  }
}
