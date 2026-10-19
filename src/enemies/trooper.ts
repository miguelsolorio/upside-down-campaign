// The trooper (docs/level-14.md, "Foes (Sim)"): an army rifleman behind a riot shield. Built from the soldier's burst (soldier.ts) and the
// riot guard's shield (guard.ts, shield.ts). The shield bounces a hit from the front, within 60 degrees of the way he faces, for no damage
// (ch5_hit.ts); a hit from the side or behind lands in full, and a smash breaks the shield for good. He faces one of four ways and turns to
// the hero only after the hero has stayed in his blind side for x.turn frames, as a guard does, so walking round him works.
//
//   band: walks at the hero until he is inside x.far, then holds there, shield up. A hero inside x.near is too close to shoot: he presses on
//     to the butt.
//   burst: with a clear line and the hero between x.near and x.range, 30 frames under the red "!" (he faces the hero at once), then three 'bullet'
//     rounds six frames apart along the aim locked at the end of the wind-up, `rifle` on each, power 0.4 of his ATK. They stop at
//     walls and solid props. An elite fires five. His cooldown is 130 frames from the start of the wind-up.
//   flank: after a burst he walks round the hero to one side for x.flankT frames (pose 'flank'), shield up, then holds again.
//   butt: a hero inside x.butt gets the rifle butt instead: 20 frames under the "!", power 0.8, then 30 frames of recovery with the
//     shield down (the only time it is, bar a break).
//   turns: a group of them shoots one at a time (myTurn), as a pack of demodogs lunges.
// A hit that breaks the shield off its arm (a hard shove) breaks the wind-up or the burst in progress, as the guard's does.
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { dirOfAngle } from '../combat/state.ts';
import { BODY_Y, dist, los } from '../combat/space.ts';
import { sfx, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { newProj } from '../combat/proj.ts';
import { speedMul } from '../combat/status.ts';
import type { Ch5State, TroopMove } from './ch5_state.ts';
import { patrol } from './agent.ts';
import { turn, walk } from './guard.ts';
import { setEnemyAnim, stepToward } from './steer.ts';

const DEF = ENEMY_DEFS.trooper;
const X = DEF.x;

function go(e: Enemy, c: Ch5State, move: TroopMove, frames: number, mode: Enemy['mode']): void {
  c.move = move;
  c.t = frames;
  e.mode = mode;
}

/** One round, from the chest along the locked aim. */
function fireRound(s: S, e: Enemy, aim: number): void {
  s.projs.push(newProj({
    kind: 'bullet', mine: false, x: e.x + Math.cos(aim) * 4, y: e.y - BODY_Y + Math.sin(aim) * 4,
    vx: Math.cos(aim) * X.speed, vy: Math.sin(aim) * X.speed, life: Math.ceil(X.range / X.speed) + 2, r: X.r,
    power: DEF.power, atk: e.atk, kb: X.kb, invuln: X.gap - 1, ox: e.x, oy: e.y,
  }));
  sfx(s, 'rifle');
  sparks(s, e.x + Math.cos(aim) * 7, e.y - BODY_Y + Math.sin(aim) * 7, 1);
}

/** The wind-up is over: lock the aim on the hero's spot, face it and fire the first round. */
function startBurst(s: S, e: Enemy, c: Ch5State, hero: Hero): void {
  c.aim = Math.atan2(hero.y - e.y, hero.x - e.x);
  e.dir = dirOfAngle(c.aim);
  c.shots = e.elite ? X.eliteBurst : X.burst;
  go(e, c, 'fire', X.gap, 'lunge');
  setEnemyAnim(e, 'attack');
  fireRound(s, e, c.aim);
  c.shots--;
}

function butt(s: S, e: Enemy, hero: Hero): void {
  sparks(s, e.x + (hero.x - e.x) * 0.5, e.y - BODY_Y, 2);
  sfx(s, 'bash');
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.buttReach && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, X.buttPower, e.atk, X.buttKb);
  }
}

/** One step round the hero: along the circle it is on, at x.flankSpeed times its walk. */
function flankStep(s: S, e: Enemy, c: Ch5State, hero: Hero, d: number): number {
  const sp = DEF.speed * e.spd * speedMul(e.stat) * X.flankSpeed;
  const r = d;
  const phi = Math.atan2(e.y - hero.y, e.x - hero.x) + c.side * (sp / r);
  const facing = e.dir;
  const moved = stepToward(s, e, hero.x + Math.cos(phi) * r, hero.y + Math.sin(phi) * r, sp);
  e.dir = facing;
  return moved;
}

const isTrooper = (o: Enemy): boolean => o.kind === 'trooper' && !o.dead && !o.dormant && o.ch5 !== null;

/**
 * Is it this trooper's turn to open fire? Troopers in a group shoot one at a time, as a pack of demodogs lunges: not while another is
 * winding up, firing or recovering from a burst, and not while one that has shot fewer bursts (the lower uid on a tie) is ready and has the
 * hero in its sights. A hero among three of them is shot at in turn, not by all three at once.
 */
function myTurn(s: S, e: Enemy, hero: Hero): boolean {
  for (const o of s.enemies) {
    if (o === e || !isTrooper(o)) continue;
    const m = (o.ch5 as Ch5State).move;
    if (m === 'wind' || m === 'fire' || (m === 'recover' && o.mode !== 'recover')) return false;
  }
  for (const o of s.enemies) {
    if (o === e || !isTrooper(o) || !o.aware || (o.ch5 as Ch5State).move !== 'walk' || o.cd > 0) continue;
    const d = dist(o.x, o.y, hero.x, hero.y);
    if (d < X.near || d > X.range || !los(s, o.x, o.y, hero.x, hero.y)) continue;
    if (o.swings < e.swings || (o.swings === e.swings && o.uid < e.uid)) return false;
  }
  return true;
}

export function trooperUpdate(s: S, e: Enemy, hero: Hero): void {
  const c = e.ch5 as Ch5State;
  if (c.buttCd > 0) c.buttCd--;
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
    c.move = 'walk';
    return;
  }
  // A break or a lure that cut the wind-up or the burst short has already put the mode back to chase.
  if ((c.move === 'wind' || c.move === 'butt') && e.mode !== 'windup') go(e, c, 'walk', 0, 'chase');
  else if (c.move === 'fire' && e.mode !== 'lunge') go(e, c, 'recover', X.recover, 'chase');
  else if (c.move === 'flank' && e.mode !== 'chase') go(e, c, 'walk', 0, 'chase');
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  const sp = DEF.speed * e.spd * speedMul(e.stat);

  switch (c.move) {
    case 'wind':
      e.dir = dirOfAngle(toHero);
      setEnemyAnim(e, 'attack');
      if (--c.t <= 0) startBurst(s, e, c, hero);
      return;
    case 'fire':
      setEnemyAnim(e, 'attack');
      if (c.shots <= 0) { go(e, c, 'recover', X.recover, 'chase'); return; }
      if (--c.t <= 0) {
        fireRound(s, e, c.aim);
        c.shots--;
        c.t = X.gap;
        if (c.shots <= 0) go(e, c, 'recover', X.recover, 'chase');
      }
      return;
    case 'butt':
      e.dir = dirOfAngle(toHero);
      setEnemyAnim(e, 'attack');
      if (--c.t <= 0) { butt(s, e, hero); go(e, c, 'recover', X.buttRecover, 'recover'); }
      return;
    case 'recover':
      setEnemyAnim(e, 'idle');
      turn(e, toHero, X.turn);
      if (--c.t <= 0) {
        // After the burst it walks round the hero, after the butt it goes back to the band.
        if (e.mode === 'recover') go(e, c, 'walk', 0, 'chase');
        else { c.side = (e.uid + e.swings) % 2 === 0 ? 1 : -1; go(e, c, 'flank', X.flankT, 'chase'); }
      }
      return;
    case 'flank': {
      turn(e, toHero, X.turn);
      const moved = flankStep(s, e, c, hero, d);
      setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      if (--c.t <= 0 || moved < sp * 0.3) go(e, c, 'walk', 0, 'chase');
      return;
    }
    default: {
      e.mode = 'chase';
      turn(e, toHero, X.turn);
      if (!clear || d > X.far) {
        const moved = walk(s, e, hero, sp, clear);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else if (d < X.near && d > X.butt) {
        // Too close to shoot: he presses on to the butt.
        const moved = walk(s, e, hero, sp, true);
        setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
      } else {
        setEnemyAnim(e, 'idle');
      }
      if (!clear || hero.ko) return;
      if (d <= X.butt && c.buttCd <= 0) {
        go(e, c, 'butt', X.buttWindup, 'windup');
        c.buttCd = Math.round(X.buttGap * e.cdMul);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      } else if (d >= X.near && d <= X.range && e.cd <= 0 && myTurn(s, e, hero)) {
        go(e, c, 'wind', DEF.windup, 'windup');
        e.swings++;
        e.cd = Math.round(DEF.cooldown * e.cdMul) + Math.round(s.rng() * 20 - 10);
        sfx(s, 'alert');
        setEnemyAnim(e, 'attack');
      }
    }
  }
}
