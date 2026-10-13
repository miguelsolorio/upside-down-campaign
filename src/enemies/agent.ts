// The Lab agent: patrols until it sees the hero (aggro radius with line of sight), keeps 70 to 100 px away,
// backs off if the hero closes in, and fires a tranq dart after a 24-frame red "!".
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { BODY_Y, dist, footBlocked, los, moveBody } from '../combat/space.ts';
import { sfx } from '../combat/fx.ts';
import { alertEnemy } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { speedMul } from '../combat/status.ts';
import { dirOfVec } from '../combat/state.ts';
import { chaseHero, faceHero, setEnemyAnim, stepToward } from './steer.ts';

const PATROL_WAIT = 40;
const MIN_FIRE_RANGE = 24;

function patrol(s: S, e: Enemy, speed: number): void {
  if (e.patrol.length === 0) { setEnemyAnim(e, 'idle'); return; }
  if (e.wait > 0) { e.wait--; setEnemyAnim(e, 'idle'); return; }
  const t = e.patrol[e.pi % e.patrol.length] as { x: number; y: number };
  if (dist(e.x, e.y, t.x, t.y) < 3 || e.stuckT > 40) {
    e.pi = (e.pi + 1) % e.patrol.length;
    e.wait = PATROL_WAIT;
    e.stuckT = 0;
    return;
  }
  const moved = stepToward(s, e, t.x, t.y, speed);
  e.stuckT = moved < speed * 0.3 ? e.stuckT + 1 : 0;
  setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
}

function backOff(s: S, e: Enemy, hero: Hero, speed: number): boolean {
  const a = Math.atan2(e.y - hero.y, e.x - hero.x);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const vx = Math.cos(a + off) * speed, vy = Math.sin(a + off) * speed;
    if (footBlocked(s, e.x + vx, e.y + vy)) continue;
    moveBody(s, e, vx, vy);
    e.dir = dirOfVec(-vx, -vy, e.dir);
    return true;
  }
  return false;
}

function fireDart(s: S, e: Enemy, hero: Hero): void {
  const def = ENEMY_DEFS.agent;
  const ox = e.x, oy = e.y - BODY_Y;
  const a = Math.atan2(hero.y - BODY_Y - oy, hero.x - ox);
  s.projs.push(newProj({
    kind: 'dart', mine: false, x: ox + Math.cos(a) * 4, y: oy + Math.sin(a) * 4,
    vx: Math.cos(a) * def.x.dart, vy: Math.sin(a) * def.x.dart,
    life: Math.ceil(def.x.range / def.x.dart) + 4, r: 3, power: def.power, atk: e.atk, kb: 1.8, ox: e.x, oy: e.y,
  }));
  sfx(s, 'dart');
}

export function agentUpdate(s: S, e: Enemy, hero: Hero): void {
  const def = ENEMY_DEFS.agent;
  const x = def.x;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= def.aggro) alertEnemy(s, e);
    else { patrol(s, e, x.patrol); return; }
  }
  if (clear) e.lostT = 0; else e.lostT++;
  if (e.lostT > x.lose && d > def.aggro + 30) {
    e.aware = false;
    e.mode = e.patrol.length > 0 ? 'patrol' : 'idle';
    return;
  }
  switch (e.mode) {
    case 'windup':
      faceHero(e, hero);
      setEnemyAnim(e, 'attack');
      if (--e.modeT <= 0) {
        fireDart(s, e, hero);
        e.mode = 'recover';
        e.modeT = x.recover;
      }
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--e.modeT <= 0) e.mode = 'chase';
      return;
    default: {
      e.mode = 'chase';
      const sp = def.speed * speedMul(e.stat);
      if (!clear) {
        const moved = chaseHero(s, e, hero, sp, false);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else if (d > x.far) {
        const moved = stepToward(s, e, hero.x, hero.y, sp);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else if (d < x.near && e.backT < x.stamina) {
        const moved = backOff(s, e, hero, x.back * speedMul(e.stat));
        e.backT += moved ? 1 : 6;
        setEnemyAnim(e, moved ? 'walk' : 'idle');
        if (!moved) faceHero(e, hero);
      } else {
        faceHero(e, hero);
        setEnemyAnim(e, 'idle');
        if (d >= x.near && e.backT > 0) e.backT--;
      }
      if (clear && e.cd <= 0 && d <= x.range && d >= MIN_FIRE_RANGE) {
        e.mode = 'windup';
        e.modeT = def.windup;
        e.cd = def.cooldown + Math.round(s.rng() * 20 - 10);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
    }
  }
}
