// The Demogorgon, chapter 1's boss (docs/level-3.md). One brain for all its moves:
//
//   stalk and swipe: walks at the hero, 30 frames under the red "!", then an arc in front of it (anim 'attack' without the
//     "!" for the first 12 frames after, the swing pose).
//   charge: every 150 frames or so it plants for 36 frames, then runs at 4.2 px a frame along the line to where the hero
//     stood when the wind-up ended, until it meets a solid. It hurts a hero in the way but doesn't stop. A wall stuns it
//     for 150 frames (pose 'stun'), and it takes half again as much damage meanwhile. The third stun is the last it needs.
//   petals, at 60 percent HP: it roars once, ActorView.petals turns true, and from then on it spits three globs in a fan.
//   leap, at 30 percent HP: a crouch, then a jump onto the hero's spot with a 'mark' growing there, then a shockwave.
//   pinned: see demo_hit.ts. No more attacks; only Eleven's Mind Blast beam hurts it.
//
// Effects it adds to the view, for gfx: 'mark' (a dark ring on the floor that grows over its life: w is its final
// diameter, h its radius), 'ring' for the leap's shockwave, and one 'acid' per glob. That one lives flight + 14 frames:
// for the first 40 it moves along the floor from the boss to the mark (x, y are the ground, angle is the way it flies, and
// gfx lifts it), and it lands when t reaches 40 and stays there as a splash (w the diameter, h the radius) until the end.
import type { AnimId } from '../core/types.ts';
import { ENEMY_DEFS } from './defs.ts';
import type { DemoMove, DemoState, Enemy, Hero, S } from '../combat/state.ts';
import { activeHero, dirOfVec } from '../combat/state.ts';
import { angleDiff, dist, footBlocked, los, moveBody } from '../combat/space.ts';
import { addFx, dust, flashScreen, floater, sfx, shake, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { speedMul } from '../combat/status.ts';
import { DIR_ANGLE } from './shield.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.demogorgon;
const X = DEF.x;
const RAD = Math.PI / 180;
/** Frames of the swing pose at the start of the swipe's recovery (anim 'attack' without the "!"). */
const SWING_POSE = 12;

/** n, give or take a tenth: so the moves don't fall into lockstep. */
const jitter = (s: S, n: number): number => Math.round(n * (0.9 + s.rng() * 0.2));

/** Starts a move: how long it lasts, the enemy mode the rest of the sim sees (windup shows the red "!") and the base anim. */
function begin(e: Enemy, d: DemoState, move: DemoMove, frames: number, mode: Enemy['mode'], anim: AnimId): void {
  d.move = move;
  d.t = frames;
  e.mode = mode;
  setEnemyAnim(e, anim);
}

function toWalk(e: Enemy, d: DemoState): void { begin(e, d, 'walk', 0, 'chase', 'idle'); }

function toRecover(e: Enemy, d: DemoState, frames: number): void { begin(e, d, 'recover', frames, 'recover', 'idle'); }

// ---------------------------------------------------------------- swipe
function startSwipe(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  e.dir = dirOfVec(hero.x - e.x, hero.y - e.y, e.dir);
  begin(e, d, 'swipe', DEF.windup, 'windup', 'attack');
  e.cd = jitter(s, DEF.cooldown);
  sfx(s, 'alert');
}

function swipe(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  const a = DIR_ANGLE[e.dir];
  sfx(s, 'chomp');
  sparks(s, e.x + Math.cos(a) * 14, e.y - 10 + Math.sin(a) * 14, 3);
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  if (dist(e.x, e.y, hero.x, hero.y) <= X.reach && angleDiff(toHero, a) <= X.arc * RAD && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.kb);
  }
  toRecover(e, d, X.recover);
  setEnemyAnim(e, 'attack');
}

// ---------------------------------------------------------------- charge
function startCharge(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, d, 'wind', X.chargeWindup, 'windup', 'attack');
  sfx(s, 'alert');
}

/** The wind-up is over: lock the line through where the hero stands now and go. */
function launch(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  const a = dist(e.x, e.y, hero.x, hero.y) < 2 ? DIR_ANGLE[e.dir] : Math.atan2(hero.y - e.y, hero.x - e.x);
  e.ax = Math.cos(a) * X.chargeSpeed;
  e.ay = Math.sin(a) * X.chargeSpeed;
  e.dir = dirOfVec(e.ax, e.ay, e.dir);
  e.hitDone = false;
  begin(e, d, 'run', 150, 'lunge', 'dash');
  sfx(s, 'lunge');
}

function hitWall(s: S, e: Enemy, d: DemoState): void {
  sfx(s, 'thud');
  shake(s, 5);
  dust(s, e.x, e.y, 6);
  floater(s, 'STUNNED', e.x, e.y - 34, 'yellow', false, 44);
  d.stuns++;
  begin(e, d, 'stun', X.stunT, 'recover', 'hurt');
  e.cd = Math.max(e.cd, 30);
}

function run(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  const mx = moveBody(s, e, e.ax, 0), my = moveBody(s, e, 0, e.ay);
  if ((s.frame & 3) === 0) dust(s, e.x, e.y, 1);
  // A hero in the way is hurt once. The charge doesn't stop for him.
  if (!e.hitDone && !hero.ko && Math.abs(e.x - hero.x) < 11 && Math.abs(e.y - hero.y) < 9) {
    e.hitDone = true;
    hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, X.chargePower, e.atk, X.chargeKb);
  }
  const blockedX = Math.abs(e.ax) > 0.3 && mx < Math.abs(e.ax) - 0.01;
  const blockedY = Math.abs(e.ay) > 0.3 && my < Math.abs(e.ay) - 0.01;
  if (blockedX || blockedY) { hitWall(s, e, d); return; }
  // Nothing to hit inside the cap: it pulls up without a stun.
  if (--d.t <= 0) { d.chargeCd = jitter(s, X.chargeEvery); toRecover(e, d, X.recover); }
}

// ---------------------------------------------------------------- roar and spit
function roar(s: S, e: Enemy, d: DemoState): void {
  begin(e, d, 'roar', X.roarT, 'recover', 'cast');
  d.petals = true;
  d.spitCd = 30;
  sfx(s, 'roar');
  sfx(s, 'petals');
  shake(s, 4);
  flashScreen(s, 0.25);
  dust(s, e.x, e.y, 6);
}

function startSpit(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, d, 'spit', X.spitWindup, 'windup', 'cast');
  sfx(s, 'alert');
}

/** Pulls a landing point in toward the boss until it is on open floor. */
function openSpot(s: S, e: Enemy, a: number, r: number): [number, number] {
  let rr = r;
  while (rr > 16 && footBlocked(s, e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr)) rr -= 4;
  return [e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr];
}

function spit(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  const a0 = Math.atan2(hero.y - e.y, hero.x - e.x);
  const r = Math.max(dist(e.x, e.y, hero.x, hero.y), 24);
  for (const k of [-1, 0, 1]) {
    const [tx, ty] = openSpot(s, e, a0 + k * X.fan, r);
    const mark = addFx(s, 'mark', tx, ty, 'down', 0, X.flight + 1, X.splash * 2, X.splash);
    s.globs.push({ sx: e.x, sy: e.y, x: tx, y: ty, ang: Math.atan2(ty - e.y, tx - e.x), age: 0, life: X.flight, atk: e.atk, mark });
  }
  sfx(s, 'acid');
  d.spitCd = jitter(s, X.spitEvery);
  toRecover(e, d, X.spitRecover);
}

/** Ages the globs. One that lands splashes 14 px around, and its splash stays drawn a few frames. Runs at the start of the enemies' turn. */
export function updateGlobs(s: S): void {
  if (s.globs.length === 0) return;
  const hero = activeHero(s);
  for (const g of s.globs) {
    if (++g.age !== g.life) continue;
    sfx(s, 'acid');
    if (!hero.ko && dist(hero.x, hero.y, g.x, g.y) <= X.splash) hurtHero(s, hero, g.x, g.y, X.globPower, g.atk, 2);
  }
  s.globs = s.globs.filter((g) => g.age < g.life + X.splashT);
}

// ---------------------------------------------------------------- leap
function startLeap(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, d, 'crouch', X.crouch, 'windup', 'attack');
  sfx(s, 'alert');
}

/** The crouch is over: jump onto the spot where the hero stands now, with a mark growing there. */
function jump(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  d.sx = e.x; d.sy = e.y; d.tx = hero.x; d.ty = hero.y;
  d.mark = addFx(s, 'mark', d.tx, d.ty, 'down', 0, X.air + 1, X.shock * 2, X.shock);
  begin(e, d, 'air', X.air, 'lunge', 'dash');
  sfx(s, 'lunge');
}

function air(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  d.t--;
  const p = Math.min(1, (X.air - d.t) / X.air);
  e.x = d.sx + (d.tx - d.sx) * p;
  e.y = d.sy + (d.ty - d.sy) * p;
  e.z = 4 * X.height * p * (1 - p);
  if (d.t > 0) return;
  e.x = d.tx; e.y = d.ty; e.z = 0;
  sfx(s, 'thud');
  shake(s, 6);
  dust(s, e.x, e.y, 8);
  addFx(s, 'ring', e.x, e.y, e.dir, 0, 14, X.shock * 2, X.shock);
  // The shockwave does not go through walls.
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.shock && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, X.leapPower, e.atk, X.leapKb);
  }
  const mark = d.mark;
  if (mark) s.fx = s.fx.filter((f) => f !== mark);
  d.mark = null;
  d.leapCd = jitter(s, X.leapEvery);
  d.chargeCd = Math.max(d.chargeCd, 45);
  toRecover(e, d, X.leapRecover);
}

// ---------------------------------------------------------------- the brain
function stalk(s: S, e: Enemy, d: DemoState, hero: Hero, dd: number, clear: boolean): void {
  e.mode = 'chase';
  if (!d.petals && e.hp <= e.hpMax * X.petalsAt) { roar(s, e, d); return; }
  if (clear) {
    if (e.hp <= e.hpMax * X.leapAt && d.leapCd <= 0) { startLeap(s, e, d, hero); return; }
    if (d.chargeCd <= 0) { startCharge(s, e, d, hero); return; }
    if (d.petals && d.spitCd <= 0) { startSpit(s, e, d, hero); return; }
    if (e.cd <= 0 && dd <= X.range) { startSwipe(s, e, d, hero); return; }
  }
  if (dd > X.hold) {
    const moved = chaseHero(s, e, hero, DEF.speed * e.spd * speedMul(e.stat), clear);
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
  } else {
    faceHero(e, hero);
    setEnemyAnim(e, 'idle');
  }
}

export function demogorgonUpdate(s: S, e: Enemy, hero: Hero): void {
  const d = e.demo as DemoState;
  if (d.pokeCd > 0) d.pokeCd--;
  if (d.move === 'pinned') { setEnemyAnim(e, 'idle'); return; }
  if (d.chargeCd > 0) d.chargeCd--;
  if (d.spitCd > 0) d.spitCd--;
  if (d.leapCd > 0) d.leapCd--;
  const dd = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && dd <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  switch (d.move) {
    case 'walk': stalk(s, e, d, hero, dd, clear); return;
    case 'swipe': if (--d.t <= 0) swipe(s, e, d, hero); return;
    case 'wind': faceHero(e, hero); if (--d.t <= 0) launch(s, e, d, hero); return;
    case 'run': run(s, e, d, hero); return;
    case 'stun':
      if (--d.t <= 0) { d.chargeCd = jitter(s, X.chargeEvery); toWalk(e, d); }
      return;
    case 'roar': case 'recover':
      if (e.anim === 'attack' && X.recover - d.t >= SWING_POSE - 1) setEnemyAnim(e, 'idle');
      if (--d.t <= 0) toWalk(e, d);
      return;
    case 'spit': faceHero(e, hero); if (--d.t <= 0) spit(s, e, d, hero); return;
    case 'crouch': faceHero(e, hero); if (--d.t <= 0) jump(s, e, d, hero); return;
    case 'air': air(s, e, d, hero); return;
  }
}
