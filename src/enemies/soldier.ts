// The Russian soldier (docs/level-8.md, "The soldier"). Ushanka, greatcoat, rifle. Built from the Lab agent (agent.ts): it patrols
// until it sees the hero, then keeps its distance. The Kamchatka guard (docs/level-10.md) runs the same brain on his own def: every number
// is read from the enemy's kind.
//
//   band: holds 80 to 120 px from the hero with a clear line, and once the hero is closer than 60 it steps back at 0.7 px a frame
//     until it is 80 away again (or runs out of room: the same stamina as the agent's).
//   burst: with a clear line, 30 frames under the red "!", aimed at where the hero stands when it ends. Then three 'bullet' rounds
//     six frames apart along that line (it doesn't track), `rifle` on each, 3.2 px a frame, reach 180, power 0.45. An elite fires
//     five. A round leaves the hero invulnerable for only five frames (not 45), so each round of a burst he stands in can land. It
//     recovers for 50 frames, and the cooldown is 120 from the start of the wind-up.
//   butt: a hero inside 22 px gets a rifle butt instead: 20 frames under the "!", then power 0.8 and knockback 3 to a hero in reach.
//   A hit breaks a wind-up or a burst in progress. Bullets stop at solid tiles and solid props (combat/proj.ts), so crates are cover.
import type { Enemy, Hero, S, SoldierState } from '../combat/state.ts';
import { dirOfAngle } from '../combat/state.ts';
import { BODY_Y, dist, los } from '../combat/space.ts';
import { sfx, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS } from './defs.ts';
import { backOff, patrol } from './agent.ts';
import { chaseHero, faceHero, setEnemyAnim, stepToward } from './steer.ts';

export function newSoldier(): SoldierState { return { move: 'walk', t: 0, shots: 0, aim: 0, backing: false, buttCd: 0 }; }

function begin(e: Enemy, sd: SoldierState, move: SoldierState['move'], frames: number, mode: Enemy['mode']): void {
  sd.move = move;
  sd.t = frames;
  e.mode = mode;
}

function toWalk(e: Enemy, sd: SoldierState): void { begin(e, sd, 'walk', 0, 'chase'); }

function toRecover(e: Enemy, sd: SoldierState, frames: number): void {
  begin(e, sd, 'recover', frames, 'recover');
  setEnemyAnim(e, 'idle');
}

/** One round, from the chest along the locked aim. */
function fireRound(s: S, e: Enemy, aim: number): void {
  const DEF = ENEMY_DEFS[e.kind], X = DEF.x;
  s.projs.push(newProj({
    kind: 'bullet', mine: false, x: e.x + Math.cos(aim) * 4, y: e.y - BODY_Y + Math.sin(aim) * 4,
    vx: Math.cos(aim) * X.speed, vy: Math.sin(aim) * X.speed, life: Math.ceil(X.range / X.speed) + 2, r: X.r,
    power: DEF.power, atk: e.atk, kb: X.kb, invuln: X.gap - 1, ox: e.x, oy: e.y,
  }));
  sfx(s, 'rifle');
  sparks(s, e.x + Math.cos(aim) * 7, e.y - BODY_Y + Math.sin(aim) * 7, 1);
}

/** The wind-up is over: lock the aim on the hero's spot and fire the first round. */
function startBurst(s: S, e: Enemy, sd: SoldierState, hero: Hero): void {
  const X = ENEMY_DEFS[e.kind].x;
  sd.aim = Math.atan2(hero.y - e.y, hero.x - e.x);
  e.dir = dirOfAngle(sd.aim);
  sd.shots = e.elite ? X.eliteBurst : X.burst;
  begin(e, sd, 'fire', 0, 'lunge');
  setEnemyAnim(e, 'attack');
  fireRound(s, e, sd.aim);
  sd.shots--;
  sd.t = X.gap;
}

function butt(s: S, e: Enemy, hero: Hero): void {
  const X = ENEMY_DEFS[e.kind].x;
  sparks(s, e.x + (hero.x - e.x) * 0.5, e.y - BODY_Y, 2);
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.buttReach && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, X.buttPower, e.atk, X.buttKb);
  }
}

export function soldierUpdate(s: S, e: Enemy, hero: Hero): void {
  const DEF = ENEMY_DEFS[e.kind], X = DEF.x;
  const sd = e.soldier as SoldierState;
  if (sd.buttCd > 0) sd.buttCd--;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { patrol(s, e, X.patrol * e.spd); return; }
  }
  if (clear) e.lostT = 0; else e.lostT++;
  if (e.lostT > X.lose && d > DEF.aggro + 30) {
    e.aware = false;
    e.mode = e.patrol.length > 0 ? 'patrol' : 'idle';
    return;
  }
  // A hit that broke the wind-up or the burst has already put the mode back to chase.
  if ((sd.move === 'wind' || sd.move === 'butt') && e.mode !== 'windup') toWalk(e, sd);
  else if (sd.move === 'fire' && e.mode !== 'lunge') toRecover(e, sd, X.recover);
  switch (sd.move) {
    case 'wind':
      faceHero(e, hero);
      setEnemyAnim(e, 'attack');
      if (--sd.t <= 0) startBurst(s, e, sd, hero);
      return;
    case 'fire':
      setEnemyAnim(e, 'attack');
      if (sd.shots <= 0) { toRecover(e, sd, X.recover); return; }
      if (--sd.t <= 0) {
        fireRound(s, e, sd.aim);
        sd.shots--;
        sd.t = X.gap;
        if (sd.shots <= 0) toRecover(e, sd, X.recover);
      }
      return;
    case 'butt':
      faceHero(e, hero);
      setEnemyAnim(e, 'attack');
      if (--sd.t <= 0) { butt(s, e, hero); toRecover(e, sd, X.buttRecover); }
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      if (--sd.t <= 0) toWalk(e, sd);
      return;
    default: {
      e.mode = 'chase';
      const sp = DEF.speed * e.spd * speedMul(e.stat);
      if (!clear) {
        const moved = chaseHero(s, e, hero, sp, false);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else if (d > X.far) {
        const moved = stepToward(s, e, hero.x, hero.y, sp);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        // Closer than 60 it steps back, and keeps on until it is 80 away again, as long as it has room and breath.
        if (d < X.panic) sd.backing = true;
        else if (d >= X.near) sd.backing = false;
        if (sd.backing && e.backT < X.stamina) {
          const moved = backOff(s, e, hero, X.back * e.spd * speedMul(e.stat));
          e.backT += moved ? 1 : 6;
          setEnemyAnim(e, moved ? 'walk' : 'idle');
          if (!moved) faceHero(e, hero);
        } else {
          faceHero(e, hero);
          setEnemyAnim(e, 'idle');
          if (!sd.backing && e.backT > 0) e.backT--;
        }
      }
      if (!clear || hero.ko) return;
      // Inside 22 px it clubs the hero. Otherwise, with a line and the range, it opens fire.
      if (d <= X.butt && sd.buttCd <= 0) {
        begin(e, sd, 'butt', X.buttWindup, 'windup');
        sd.buttCd = Math.round(X.buttGap * e.cdMul);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      } else if (d > X.butt && d <= X.range && e.cd <= 0) {
        begin(e, sd, 'wind', DEF.windup, 'windup');
        e.cd = Math.round(DEF.cooldown * e.cdMul) + Math.round(s.rng() * 20 - 10);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
    }
  }
}
