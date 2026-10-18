// The Creel ghoul (docs/level-11.md, "The ghoul"): the Glass wraith, a pale woman made of broken mirror who comes out of the glass.
//
//   glass: waits in the mirror its spawn names, unseen and untouchable, until its group is awake and the active hero is within 80 px of the
//     mirror with a clear line to where it steps out. Then, if no ghoul of that mirror stepped out in the last 90 frames, it does. Until
//     then it is dormant, so nothing sees it, hits it, aims at it or hears it (glassUpdate; ghoul_hit.ts has the rest of what the glass does).
//   rise: 40 frames at the mirror's foot (pose 'rise', the `ghoul` sfx), and it can be hit.
//   drift: floats at the hero, bobbing 1 to 3 px off the floor, round walls by the nav grid. Inside 40 px with a clear line it winds up.
//   wind: 24 frames under the red "!". The line of the lunge is locked on where the hero stands as it begins.
//   lunge: 10 frames at 3.2 px a frame along it, a hero it touches takes power 0.8 and knockback 3 once. Then it recovers for 30 frames.
// A hit breaks a wind-up or a lunge, as it does for any foe that is not a boss.
import type { Enemy, Hero, S } from '../combat/state.ts';
import type { GhoulMove, GhoulState } from '../combat/house.ts';
import { dirOfVec } from '../combat/state.ts';
import { dist, footBlocked, los, moveBody, nearestOnRect } from '../combat/space.ts';
import { nearestOpenFeet } from '../combat/props.ts';
import { sfx } from '../combat/fx.ts';
import { hurtHero } from '../combat/damage.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.ghoul;
const X = DEF.x;
/** How close it drifts to the hero before it hovers, in px. */
const HOLD = 18;

function begin(e: Enemy, g: GhoulState, move: GhoulMove, frames: number, mode: Enemy['mode']): void {
  g.move = move;
  g.t = frames;
  e.mode = mode;
}

function toDrift(e: Enemy, g: GhoulState): void { begin(e, g, 'drift', 0, 'chase'); }

/** Where it steps out: where its spawn stands, or the open floor at the mirror's foot if that spot is inside the mirror. */
function stepSpot(s: S, e: Enemy, g: GhoulState): void {
  if (!Number.isNaN(g.sx)) return;
  g.sx = e.x; g.sy = e.y;
  if (!footBlocked(s, e.x, e.y)) return;
  const m = s.props.find((p) => p.id === g.mirror);
  const to = m ? nearestOpenFeet(s, m.x + m.w / 2, m.y + m.h + 8) : null;
  if (to) { g.sx = to.x; g.sy = to.y; }
}

/** A hero within X.see px of the mirror (its nearest edge) with a clear line to the spot the ghoul steps out at. */
function seen(s: S, g: GhoulState, hero: Hero): boolean {
  if (hero.ko) return false;
  const m = s.props.find((p) => p.id === g.mirror);
  const from = m ? nearestOnRect(m, hero.x, hero.y - 2) : { x: g.sx, y: g.sy };
  return dist(from.x, from.y, hero.x, hero.y - 2) <= X.see && los(s, hero.x, hero.y, g.sx, g.sy);
}

/**
 * A ghoul in its mirror, called every frame while it is dormant (enemies/ai.ts). Once its group is awake and a hero comes near, and the mirror
 * has no other ghoul stepping out, it steps out: no longer dormant, hittable, rising.
 */
export function glassUpdate(s: S, e: Enemy, hero: Hero): void {
  const g = e.ghoul as GhoulState;
  if (!g.awake || g.move !== 'glass' || e.hp <= 0) return;
  stepSpot(s, e, g);
  const m = s.house.mirrors.get(g.mirror);
  if (!m || s.frame - m.at < X.gap || !seen(s, g, hero)) return;
  m.at = s.frame;
  e.dormant = false;
  e.x = g.sx; e.y = g.sy;
  e.aware = true;
  faceHero(e, hero);
  begin(e, g, 'rise', X.rise, 'chase');
  sfx(s, 'ghoul');
}

function startWind(s: S, e: Enemy, g: GhoulState, hero: Hero): void {
  const a = Math.atan2(hero.y - e.y, hero.x - e.x);
  e.ax = Math.cos(a) * X.lungeSpeed;
  e.ay = Math.sin(a) * X.lungeSpeed;
  e.dir = dirOfVec(e.ax, e.ay, e.dir);
  e.cd = Math.round(DEF.cooldown * e.cdMul);
  begin(e, g, 'wind', DEF.windup, 'windup');
  setEnemyAnim(e, 'attack');
  sfx(s, 'alert');
}

function lunge(s: S, e: Enemy, g: GhoulState): void {
  e.hitDone = false;
  begin(e, g, 'lunge', X.lungeT, 'lunge');
  setEnemyAnim(e, 'dash');
  sfx(s, 'lunge');
}

/** One frame of the lunge: it floats along the locked line, and the first time it touches the hero it hurts him. */
function fly(s: S, e: Enemy, g: GhoulState, hero: Hero): void {
  moveBody(s, e, e.ax, e.ay);
  if (!e.hitDone && !hero.ko && Math.abs(e.x - hero.x) < 11 && Math.abs(e.y - hero.y) < 9) {
    e.hitDone = true;
    hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, DEF.power, e.atk, X.kb);
  }
  if (--g.t <= 0) { begin(e, g, 'recover', X.recover, 'recover'); setEnemyAnim(e, 'idle'); }
}

export function ghoulUpdate(s: S, e: Enemy, hero: Hero): void {
  const g = e.ghoul as GhoulState;
  // One that is still in the glass and was struck dead by its mirror breaking has nothing left to do.
  if (g.move === 'glass') return;
  e.aware = true;
  // A hit that broke the wind-up or the lunge has already put the mode back to chase.
  if (g.move === 'wind' && e.mode !== 'windup') toDrift(e, g);
  else if (g.move === 'lunge' && e.mode !== 'lunge') toDrift(e, g);
  // It floats: 1 to 3 px off the floor, out of step with the next ghoul.
  e.z = 2 + Math.sin((s.frame + e.uid * 13) * 0.12);
  switch (g.move) {
    case 'rise':
      setEnemyAnim(e, 'idle');
      if (--g.t <= 0) toDrift(e, g);
      return;
    case 'wind':
      setEnemyAnim(e, 'attack');
      if (--g.t <= 0) lunge(s, e, g);
      return;
    case 'lunge': fly(s, e, g, hero); return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--g.t <= 0) toDrift(e, g);
      return;
    default: {
      e.mode = 'chase';
      const d = dist(e.x, e.y, hero.x, hero.y);
      const clear = los(s, e.x, e.y, hero.x, hero.y);
      if (d > HOLD || !clear) {
        const moved = chaseHero(s, e, hero, DEF.speed * e.spd * speedMul(e.stat), clear);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        faceHero(e, hero);
        setEnemyAnim(e, 'idle');
      }
      if (clear && e.cd <= 0 && d <= X.range) startWind(s, e, g, hero);
    }
  }
}
