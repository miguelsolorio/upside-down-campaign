// The rat: wanders until it notices the hero, chases fast, then winds up with a red "!" and lunges once.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dirOfVec } from '../combat/state.ts';
import { dist, los, moveBody } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { speedMul } from '../combat/status.ts';
import { chaseHero, faceHero, setEnemyAnim, stepToward } from './steer.ts';

const WANDER_SPEED = 0.35;
const WANDER_RANGE = 40;

/** Idles about its spot, a few steps at a time. The demodog does the same until it notices the hero. */
export function wander(s: S, e: Enemy): void {
  setEnemyAnim(e, 'idle');
  if (--e.wanderT <= 0) {
    if (s.rng() < 0.45) { e.wanderA = Number.NaN; e.wanderT = 40 + Math.floor(s.rng() * 80); }
    else { e.wanderA = s.rng() * Math.PI * 2; e.wanderT = 20 + Math.floor(s.rng() * 30); }
  }
  if (Number.isNaN(e.wanderA)) return;
  if (dist(e.x, e.y, e.hx, e.hy) > WANDER_RANGE) e.wanderA = Math.atan2(e.hy - e.y, e.hx - e.x);
  const moved = stepToward(s, e, e.x + Math.cos(e.wanderA) * 8, e.y + Math.sin(e.wanderA) * 8, WANDER_SPEED);
  if (moved > 0) setEnemyAnim(e, 'walk');
}

export function ratUpdate(s: S, e: Enemy, hero: Hero): void {
  const def = ENEMY_DEFS.rat;
  const x = def.x;
  let d = dist(e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (d <= def.aggro && los(s, e.x, e.y, hero.x, hero.y)) alertEnemy(s, e);
    else { wander(s, e); return; }
  }
  if (d > 280) { e.aware = false; e.mode = 'idle'; return; }
  switch (e.mode) {
    case 'windup':
      faceHero(e, hero);
      setEnemyAnim(e, 'attack');
      if (--e.modeT <= 0) {
        const a = Math.atan2(hero.y - e.y, hero.x - e.x);
        e.ax = Math.cos(a) * x.lungeSpeed;
        e.ay = Math.sin(a) * x.lungeSpeed;
        e.mode = 'lunge';
        e.modeT = x.lungeT;
        e.hitDone = false;
        e.dir = dirOfVec(e.ax, e.ay, e.dir);
      }
      return;
    case 'lunge':
      moveBody(s, e, e.ax, e.ay);
      d = dist(e.x, e.y, hero.x, hero.y);
      if (!e.hitDone && Math.abs(e.x - hero.x) < 11 && Math.abs(e.y - hero.y) < 11) {
        e.hitDone = true;
        hurtHero(s, hero, e.x - e.ax * 3, e.y - e.ay * 3, def.power, e.atk, 2.4);
      }
      if (--e.modeT <= 0) { e.mode = 'recover'; e.modeT = x.recover; }
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--e.modeT <= 0) e.mode = 'chase';
      return;
    default: {
      e.mode = 'chase';
      const clear = los(s, e.x, e.y, hero.x, hero.y);
      if (d > 13) {
        const moved = chaseHero(s, e, hero, def.speed * e.spd * speedMul(e.stat), clear);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        faceHero(e, hero);
        setEnemyAnim(e, 'idle');
      }
      if (d <= x.range && e.cd <= 0 && clear) {
        e.mode = 'windup';
        e.modeT = def.windup;
        e.cd = Math.round(def.cooldown * e.cdMul);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
    }
  }
}
