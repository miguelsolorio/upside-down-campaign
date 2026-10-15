// The Flayed (docs/level-7.md, "New enemies"). A slow grabber.
//
//   shamble: walks at the hero at 0.55 px a frame.
//   wind-up and reach: in reach (22 px) with a clear line, 30 frames under the red "!", then a 10 frame reach at 1.5 px a frame along the
//     line locked when the wind-up ended. A hero who isn't there any more isn't touched.
//   hold: on contact with a hero it can hurt, it takes hold (pose 'grab', the `grab` sfx) for 40 frames (50 for an elite): the hero
//     can't move or attack. The grab hits for power 0.8, and the hold ends in a shove (knockback 3, no damage). A swap frees the
//     hero, and so does a hit on the Flayed with knockback 3 or more (a hit with less doesn't stagger it while it holds). Stunned,
//     confused or staggered, it lets go too (enemies/hold.ts). Then it recovers for 40 frames.
//   rise: a dormant Flayed waits as a goo puddle (ActorView.puddle). When its group wakes it rises, pose 'rise' for 40 frames,
//     where it can't be hit and doesn't attack, then it hunts.
import type { ActorView } from '../core/types.ts';
import type { Enemy, FlayedState, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { dist, los, moveBody } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import { beginHold, canGrab, isHolding, releaseHold, shove } from './hold.ts';
import { wander } from './rat.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.flayed;
const X = DEF.x;

export function newFlayed(): FlayedState { return { move: 'walk', t: 0 }; }

/** The pose gfx draws: 'rise' while it comes up out of the goo, 'grab' while it holds the hero. */
export function flayedPose(f: FlayedState): ActorView['pose'] {
  return f.move === 'rise' ? 'rise' : f.move === 'hold' ? 'grab' : undefined;
}

/** Called when a dormant Flayed's group wakes: it comes up out of the goo, untouchable for X.rise frames. */
export function wakeFlayed(e: Enemy): void {
  const f = e.flayed;
  if (!f) return;
  f.move = 'rise';
  f.t = X.rise;
  e.anim = 'idle'; e.animT = 0;
}

function begin(e: Enemy, f: FlayedState, move: FlayedState['move'], frames: number, mode: Enemy['mode']): void {
  f.move = move;
  f.t = frames;
  e.mode = mode;
}

function toWalk(e: Enemy, f: FlayedState): void { begin(e, f, 'walk', 0, 'chase'); }

function toRecover(e: Enemy, f: FlayedState): void {
  begin(e, f, 'recover', X.recover, 'recover');
  setEnemyAnim(e, 'idle');
}

/** The frames this Flayed holds for. */
export const holdFrames = (e: Enemy): number => (e.elite ? X.eliteHold : X.hold);

function contact(s: S, e: Enemy, hero: Hero): void {
  if (!canGrab(s, hero) || Math.abs(e.x - hero.x) >= 11 || Math.abs(e.y - hero.y) >= 11) return;
  // The grab hits, and it only takes hold if the hit landed: Steve's Hair of steel or the DM screen's dome change nothing here.
  if (hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, 0) <= 0) return;
  beginHold(s, e, hero);
  begin(e, e.flayed as FlayedState, 'hold', 0, 'recover');
  setEnemyAnim(e, 'attack');
}

export function flayedUpdate(s: S, e: Enemy, hero: Hero): void {
  const f = e.flayed as FlayedState;
  // A hit that broke the wind-up or the reach, or something that freed the hero, has already changed what the enemy is doing.
  if (f.move === 'wind' && e.mode !== 'windup') toWalk(e, f);
  else if (f.move === 'reach' && e.mode !== 'lunge') toWalk(e, f);
  else if (f.move === 'hold' && !isHolding(s, e)) toRecover(e, f);
  const d = dist(e.x, e.y, hero.x, hero.y);
  switch (f.move) {
    case 'rise':
      setEnemyAnim(e, 'idle');
      if (--f.t <= 0) toWalk(e, f);
      return;
    case 'wind':
      faceHero(e, hero);
      setEnemyAnim(e, 'attack');
      if (--f.t <= 0) {
        const a = Math.atan2(hero.y - e.y, hero.x - e.x);
        e.ax = Math.cos(a) * X.reachSpeed;
        e.ay = Math.sin(a) * X.reachSpeed;
        e.dir = dirOfVec(e.ax, e.ay, e.dir);
        begin(e, f, 'reach', X.reachT, 'lunge');
      }
      return;
    case 'reach':
      moveBody(s, e, e.ax, e.ay);
      contact(s, e, hero);
      if (f.move === 'reach' && --f.t <= 0) toRecover(e, f);
      return;
    case 'hold':
      setEnemyAnim(e, 'attack');
      if (++f.t >= holdFrames(e)) {
        releaseHold(s, e);
        shove(hero, e, X.kb);
        toRecover(e, f);
      }
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--f.t <= 0) toWalk(e, f);
      return;
    default: {
      e.mode = 'chase';
      if (!e.aware) {
        if (d <= DEF.aggro && los(s, e.x, e.y, hero.x, hero.y)) alertEnemy(s, e);
        else { wander(s, e); return; }
      }
      if (d > 280) { e.aware = false; e.mode = 'idle'; return; }
      const clear = los(s, e.x, e.y, hero.x, hero.y);
      if (d > 13) {
        const moved = chaseHero(s, e, hero, DEF.speed * e.spd * speedMul(e.stat), clear);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        faceHero(e, hero);
        setEnemyAnim(e, 'idle');
      }
      if (d <= X.range && e.cd <= 0 && clear && canGrab(s, hero)) {
        begin(e, f, 'wind', DEF.windup, 'windup');
        e.cd = Math.round(DEF.cooldown * e.cdMul);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
    }
  }
}
