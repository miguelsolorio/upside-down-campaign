// Flayed Billy, phase one of the 3.3 boss (docs/level-9.md, "Billy"). One brain for all his moves:
//
//   walk: he comes straight at the hero at 1.1 px a frame and always faces him.
//   charge: every 200 frames or so, with the hero 60 to 160 px away and a clear line: 24 frames planted under the red "!" (pose 'charge'),
//     then a straight run at 3.6 px a frame along the line locked where the hero stood when the wind-up ended, for at most 160 px. A hero in
//     the way is hurt once (power 1.0, knockback 5) and the run goes on. A solid tile or prop stops it: `thud`, and he is stunned for 60
//     frames (pose 'stun') and takes x1.5 meanwhile. A run that finds nothing ends in 24 frames of recovery.
//   grab: inside 26 px, about every 240 frames: 16 frames under the "!" (pose 'grab'), then, if the hero is still in reach, he holds him for
//     50 frames (the `grab` sfx) and throws him (power 1.0, knockback 6). A swap frees the hero, so does anything that staggers him
//     (enemies/hold.ts). A miss or a throw leaves him recovering for 36 frames.
//   jabs: inside 24 px, 12 frames under the "!", then two hits of power 0.6 eight frames apart, then 30 frames of recovery.
//   rage: at half HP he charges every 140 frames at 4.2 px a frame and calls two Flayed round him (group `billys`, run-time spawns).
//   pinned: at 0 HP he kneels and stops; enemies/billy_hit.ts has that, and the reach that frees him.
// Hits don't stagger him or break a wind-up (poise), and move him a quarter as far. Word vomit staggers him for 30 frames; Nancy's traps
// don't hold him.
import type { AnimId } from '../core/types.ts';
import type { BillyState, Enemy, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { dist, los, moveBody } from '../combat/space.ts';
import { dust, floater, flashScreen, sfx, shake, sparks } from '../combat/fx.ts';
import { HERO_HIT_INVULN, alertEnemy, hurtHero } from '../combat/damage.ts';
import { bringUp, howlSpots } from '../combat/spawns.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import { beginHold, canGrab, isHolding, releaseHold, shove } from './hold.ts';
import { DIR_ANGLE } from './shield.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.billy;
const X = DEF.x;
/** Frames of the swing pose at the start of a recovery after a jab (anim 'attack' without the "!"). */
const SWING_POSE = 10;

/** n, give or take a tenth: so the moves don't fall into lockstep. */
const jitter = (s: S, n: number): number => Math.round(n * (0.9 + s.rng() * 0.2));

function begin(e: Enemy, b: BillyState, move: BillyState['move'], frames: number, mode: Enemy['mode'], anim: AnimId): void {
  b.move = move;
  b.t = frames;
  e.mode = mode;
  setEnemyAnim(e, anim);
}

const toWalk = (e: Enemy, b: BillyState): void => begin(e, b, 'walk', 0, 'chase', 'idle');
const toRecover = (e: Enemy, b: BillyState, frames: number): void => begin(e, b, 'recover', frames, 'recover', 'idle');

/** Frames until the next charge: shorter once he is enraged. */
const chargeGap = (s: S, b: BillyState): number => jitter(s, b.raged ? X.chargeLow : X.chargeEvery);

// ---------------------------------------------------------------- charge
function startCharge(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, b, 'wind', X.chargeWindup, 'windup', 'attack');
  sfx(s, 'alert');
}

/** The wind-up is over: lock the line through where the hero stands now and go. */
function launch(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  const a = dist(e.x, e.y, hero.x, hero.y) < 2 ? DIR_ANGLE[e.dir] : Math.atan2(hero.y - e.y, hero.x - e.x);
  const sp = b.raged ? X.rageSpeed : X.chargeSpeed;
  e.ax = Math.cos(a) * sp;
  e.ay = Math.sin(a) * sp;
  e.dir = dirOfVec(e.ax, e.ay, e.dir);
  e.hitDone = false;
  begin(e, b, 'run', Math.ceil(X.chargeRange / sp), 'lunge', 'dash');
  sfx(s, 'lunge');
}

function hitWall(s: S, e: Enemy, b: BillyState): void {
  sfx(s, 'thud');
  shake(s, 5);
  dust(s, e.x, e.y, 6);
  floater(s, 'STUNNED', e.x, e.y - 34, 'yellow', false, 44);
  begin(e, b, 'stun', X.stunT, 'recover', 'hurt');
  b.chargeCd = chargeGap(s, b);
  e.cd = Math.max(e.cd, 30);
}

function run(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  const mx = moveBody(s, e, e.ax, 0), my = moveBody(s, e, 0, e.ay);
  if ((s.frame & 3) === 0) dust(s, e.x, e.y, 1);
  // A hero in the way is hurt once. The run doesn't stop for him.
  if (!e.hitDone && !hero.ko && Math.abs(e.x - hero.x) < 11 && Math.abs(e.y - hero.y) < 9) {
    e.hitDone = true;
    hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, X.chargePower, e.atk, X.chargeKb);
  }
  const blockedX = Math.abs(e.ax) > 0.3 && mx < Math.abs(e.ax) - 0.01;
  const blockedY = Math.abs(e.ay) > 0.3 && my < Math.abs(e.ay) - 0.01;
  if (blockedX || blockedY) { hitWall(s, e, b); return; }
  // 160 px with nothing to hit: he pulls up without a stun.
  if (--b.t <= 0) { b.chargeCd = chargeGap(s, b); toRecover(e, b, X.chargeRecover); }
}

// ---------------------------------------------------------------- grab
function startGrab(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, b, 'grab', X.grabWindup, 'windup', 'attack');
  b.grabCd = jitter(s, X.grabEvery);
  sfx(s, 'alert');
}

/** The wind-up is over: a hero still in reach is taken, one who stepped back is missed. */
function grabLands(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  if (canGrab(s, hero) && dist(e.x, e.y, hero.x, hero.y) <= X.grabHit && los(s, e.x, e.y, hero.x, hero.y)) {
    beginHold(s, e, hero);
    begin(e, b, 'hold', 0, 'recover', 'attack');
  } else {
    toRecover(e, b, X.grabRecover);
  }
}

/** The hold is over: he throws the hero. The shove lands even if the hit didn't (another hit left him invulnerable). */
function throwHero(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  releaseHold(s, e);
  if (hurtHero(s, hero, e.x, e.y, X.throwPower, e.atk, X.throwKb) <= 0 && !hero.ko) shove(hero, e, X.throwKb);
  sfx(s, 'slam');
  shake(s, 4);
  dust(s, hero.x, hero.y, 5);
  toRecover(e, b, X.grabRecover);
}

// ---------------------------------------------------------------- jabs
function startJab(s: S, e: Enemy, b: BillyState, hero: Hero): void {
  faceHero(e, hero);
  begin(e, b, 'jab', DEF.windup, 'windup', 'attack');
  e.cd = jitter(s, DEF.cooldown);
  sfx(s, 'alert');
}

/** One jab comes out. The first leaves the hero invulnerable for fewer frames than the gap, so the second can land. */
function jab(s: S, e: Enemy, hero: Hero, first: boolean): void {
  faceHero(e, hero);
  e.animT = 0;
  setEnemyAnim(e, 'attack');
  sfx(s, 'bash');
  const a = DIR_ANGLE[e.dir];
  sparks(s, e.x + Math.cos(a) * 14, e.y - 10 + Math.sin(a) * 14, 2);
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.jabHit && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.jabKb, first ? X.jabInvuln : HERO_HIT_INVULN);
  }
}

// ---------------------------------------------------------------- the brain
function rage(s: S, e: Enemy, b: BillyState): void {
  b.raged = true;
  b.chargeCd = Math.min(b.chargeCd, X.chargeLow);
  // He calls his own: X.call Flayed come in round him, run-time spawns like the Alpha's pack (1 XP each, never skipped on a retry).
  if (X.call > 0) bringUp(s, 'howl', 'billys', 'flayed', undefined, howlSpots(s, e.x, e.y), X.call);
  floater(s, 'RAGE', e.x, e.y - 34, 'hot', true, 60);
  sfx(s, 'roar');
  shake(s, 4);
  flashScreen(s, 0.15);
}

export function billyUpdate(s: S, e: Enemy, hero: Hero): void {
  const b = e.billy as BillyState;
  if (b.chargeCd > 0) b.chargeCd--;
  if (b.grabCd > 0) b.grabCd--;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  if (!b.raged && e.hp <= e.hpMax * X.rageAt) rage(s, e, b);
  // Something let the hero go (a swap, Word vomit, a hero down): the hold is over.
  if (b.move === 'hold' && !isHolding(s, e)) toRecover(e, b, X.grabRecover);
  switch (b.move) {
    case 'walk': {
      e.mode = 'chase';
      faceHero(e, hero);
      if (clear && !hero.ko) {
        if (b.grabCd <= 0 && d <= X.grabReach && canGrab(s, hero)) { startGrab(s, e, b, hero); return; }
        if (b.chargeCd <= 0 && d >= X.chargeMin && d <= X.chargeMax) { startCharge(s, e, b, hero); return; }
        if (e.cd <= 0 && d <= X.jabReach) { startJab(s, e, b, hero); return; }
      }
      if (d > X.hold || !clear) {
        const moved = chaseHero(s, e, hero, DEF.speed * e.spd * speedMul(e.stat), clear);
        faceHero(e, hero);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        setEnemyAnim(e, 'idle');
      }
      return;
    }
    case 'wind':
      faceHero(e, hero);
      if (--b.t <= 0) launch(s, e, b, hero);
      return;
    case 'run': run(s, e, b, hero); return;
    case 'stun':
      setEnemyAnim(e, 'hurt');
      if (--b.t <= 0) toWalk(e, b);
      return;
    case 'grab':
      faceHero(e, hero);
      if (--b.t <= 0) grabLands(s, e, b, hero);
      return;
    case 'hold':
      setEnemyAnim(e, 'attack');
      if (++b.t >= X.holdT) throwHero(s, e, b, hero);
      return;
    case 'jab':
      faceHero(e, hero);
      if (--b.t <= 0) { jab(s, e, hero, true); begin(e, b, 'jabs', X.jabGap, 'recover', 'attack'); }
      return;
    case 'jabs':
      if (--b.t <= 0) { jab(s, e, hero, false); toRecover(e, b, X.jabRecover); setEnemyAnim(e, 'attack'); }
      return;
    case 'recover':
      faceHero(e, hero);
      if (e.anim === 'attack' && e.animT >= SWING_POSE) setEnemyAnim(e, 'idle');
      if (--b.t <= 0) toWalk(e, b);
      return;
    case 'pinned':
      return;
  }
}
