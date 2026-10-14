// The riot guard and the Warden. They walk at the hero holding the shield forward (see shield.ts), and bash the arc in
// front of them from close range. The Warden also slams the ground all around. Neither fires darts.
//
// A guard faces one of four ways. It turns to the hero only after the hero has stayed in its blind side for x.turn
// frames, so walking around it works. Its shield is down while it recovers from an attack.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dirOfAngle } from '../combat/state.ts';
import { angleDiff, BODY_Y, dist, los } from '../combat/space.ts';
import { addFx, dust, shake, sfx, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { speedMul } from '../combat/status.ts';
import { patrol } from './agent.ts';
import { DIR_ANGLE, inFront } from './shield.ts';
import { chaseHero, setEnemyAnim } from './steer.ts';

const RAD = Math.PI / 180;
/** Frames of the swing pose at the start of the bash recovery. */
const SWING_POSE = 12;

/** Turns toward the hero, but only after x.turn frames of the hero standing in the blind side. */
function turn(e: Enemy, toHero: number, delay: number): void {
  if (inFront(e, toHero)) { e.turnT = 0; return; }
  if (++e.turnT >= delay) {
    e.dir = dirOfAngle(toHero);
    e.turnT = 0;
  }
}

/** Walks at the hero. The facing stays where it was, as long as the hero is in sight. */
function walk(s: S, e: Enemy, hero: Hero, speed: number, clear: boolean): number {
  const facing = e.dir;
  const moved = chaseHero(s, e, hero, speed, clear);
  if (clear) e.dir = facing; else e.turnT = 0;
  return moved;
}

/** Every third attack of a Warden is a slam, every second one once it is below half HP. */
function isSlam(e: Enemy): boolean {
  if (e.kind !== 'warden') return false;
  const x = ENEMY_DEFS.warden.x;
  return e.swings % x.slamEvery === 0 || (e.hp < e.hpMax / 2 && e.swings % x.slamLow === 0);
}

function startAttack(s: S, e: Enemy): void {
  const def = ENEMY_DEFS[e.kind];
  const x = def.x;
  e.swings++;
  e.slam = isSlam(e);
  e.mode = 'windup';
  e.modeT = e.slam ? x.slamWindup : def.windup;
  e.cd = Math.round((e.slam ? x.slamCd : def.cooldown) * e.cdMul);
  sfx(s, 'alert');
  setEnemyAnim(e, 'attack');
  if (e.slam) {
    const r = x.slamRadius;
    e.ring = addFx(s, 'ring', e.x, e.y, e.dir, 0, x.slamWindup, r * 2, r);
  }
}

function bash(s: S, e: Enemy, hero: Hero): void {
  const def = ENEMY_DEFS[e.kind];
  const x = def.x;
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  sfx(s, 'bash');
  const a = DIR_ANGLE[e.dir];
  sparks(s, e.x + Math.cos(a) * 14, e.y - BODY_Y + Math.sin(a) * 14, 2);
  if (dist(e.x, e.y, hero.x, hero.y) <= x.reach && angleDiff(toHero, a) <= x.arc * RAD && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, def.power, e.atk, x.kb);
  }
  e.mode = 'recover';
  e.modeT = x.recover;
  e.slam = false;
}

function slam(s: S, e: Enemy, hero: Hero): void {
  const def = ENEMY_DEFS[e.kind];
  const x = def.x;
  const r = x.slamRadius;
  sfx(s, 'slam');
  shake(s, 4);
  dust(s, e.x, e.y, 6);
  e.ring = null;
  addFx(s, 'ring', e.x, e.y, e.dir, 0, 14, r * 2, r);
  // The shockwave does not go through walls.
  if (dist(e.x, e.y, hero.x, hero.y) <= r && los(s, e.x, e.y, hero.x, hero.y)) hurtHero(s, hero, e.x, e.y, x.slamPower, e.atk, x.slamKb);
  e.mode = 'recover';
  e.modeT = x.slamRecover;
}

export function guardUpdate(s: S, e: Enemy, hero: Hero): void {
  const def = ENEMY_DEFS[e.kind];
  const x = def.x;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= def.aggro) alertEnemy(s, e);
    else { patrol(s, e, x.patrol * e.spd); return; }
  }
  if (clear) e.lostT = 0; else e.lostT++;
  if (e.lostT > x.lose && d > def.aggro + 30) {
    e.aware = false;
    e.mode = e.patrol.length > 0 ? 'patrol' : 'idle';
    return;
  }
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  switch (e.mode) {
    case 'windup':
      turn(e, toHero, x.turn);
      setEnemyAnim(e, 'attack');
      if (e.ring) { e.ring.x = e.x; e.ring.y = e.y; }
      if (--e.modeT <= 0) {
        if (e.slam) slam(s, e, hero); else bash(s, e, hero);
      }
      return;
    case 'recover':
      setEnemyAnim(e, e.modeT > (e.slam ? x.slamRecover : x.recover) - SWING_POSE ? 'attack' : 'idle');
      if (--e.modeT <= 0) { e.mode = 'chase'; e.slam = false; }
      return;
    default: {
      e.mode = 'chase';
      turn(e, toHero, x.turn);
      if (d > x.hold) {
        const moved = walk(s, e, hero, def.speed * e.spd * speedMul(e.stat), clear);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        setEnemyAnim(e, 'idle');
      }
      // It commits to an attack only with the hero in front of the shield.
      if (clear && e.cd <= 0 && d <= x.range && inFront(e, toHero)) startAttack(s, e);
    }
  }
}
