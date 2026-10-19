// The Commander, the 5.1 mini-boss (docs/level-14.md, "Foes (Sim)"): a trooper captain behind a full riot shield. The shield works as the
// trooper's (ch5_hit.ts): a hit from the front, within 75 degrees of the way he faces, bounces off for no damage, a hit from the side or
// behind lands in full, and three smashes break the shield for good. He faces one of four ways and turns to the hero after x.turn frames in his
// blind side, as a guard does. Poise: no hit staggers or shoves him off a move. The charge and the wall stun are the Demogorgon's
// (demogorgon.ts), on a DemoState of his own.
//
//   stalk: walks at the active hero, shield up, and bashes the arc in front of him from x.range: 34 frames under the red "!", reach 34,
//     then 36 frames with the shield down.
//   whistle: every x.whistleEvery frames (the first after x.whistleFirst) he plants the shield for x.plantT frames (pose 'plant', the
//     `whistle` sfx) and calls a squad of troopers, x.squad of them, on the ring round him (group `squad`, run-time spawns worth 1 XP,
//     with x.squadHp of a trooper's HP and x.squadAtk of its ATK). At most x.squad of them are alive: with all of them up the whistle waits
//     a second at a time.
//   crack: at x.crackAt of his HP the shield cracks (ActorView.cracked, `shieldBreak`). There are no more whistles. He charges in straight lines,
//     as the Demogorgon does: pose 'charge', a 36 frame "!" and then a run along the line locked at its end, until a wall stops him
//     and stuns him for x.stunT frames (pose 'stun', shield down, x1.5 damage). One more smash breaks the cracked shield for good.
//   finish: 0 HP is a normal kill (group `boss`).
import { ENEMY_DEFS } from './defs.ts';
import type { DemoState, Enemy, Hero, S } from '../combat/state.ts';
import { angleDiff, BODY_Y, dist, los } from '../combat/space.ts';
import { dust, floater, flashScreen, sfx, shake, sparks } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { bringUp, squadSpots } from '../combat/spawns.ts';
import { speedMul } from '../combat/status.ts';
import type { Ch5State } from './ch5_state.ts';
import { begin, jitter, launch, run, startCharge, toRecover, toWalk } from './demogorgon.ts';
import { turn, walk } from './guard.ts';
import { DIR_ANGLE, inFront } from './shield.ts';
import { faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.commander;
const X = DEF.x;
const RAD = Math.PI / 180;
/** Frames the whistle waits to try again when the squad is up already. */
const RETRY = 60;

/** Troopers of the squad still up. */
const squadAlive = (s: S): number => s.enemies.filter((o) => o.rt === 'squad' && !o.dead).length;

function startBash(s: S, e: Enemy, d: DemoState): void {
  begin(e, d, 'swipe', DEF.windup, 'windup', 'attack');
  e.cd = Math.round(DEF.cooldown * e.cdMul);
  e.swings++;
  sfx(s, 'alert');
}

function bash(s: S, e: Enemy, d: DemoState, hero: Hero): void {
  const a = DIR_ANGLE[e.dir];
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  sfx(s, 'bash');
  sparks(s, e.x + Math.cos(a) * 14, e.y - BODY_Y + Math.sin(a) * 14, 2);
  if (!hero.ko && dist(e.x, e.y, hero.x, hero.y) <= X.reach && angleDiff(toHero, a) <= X.arc * RAD && los(s, e.x, e.y, hero.x, hero.y)) {
    hurtHero(s, hero, e.x, e.y, DEF.power, e.atk, X.kb);
  }
  toRecover(e, d, X.recover);
  setEnemyAnim(e, 'attack');
}

/** He plants the shield and whistles. The squad comes when the plant is over. */
function startPlant(s: S, e: Enemy, d: DemoState, c: Ch5State): void {
  begin(e, d, 'plant', X.plantT, 'chase', 'idle');
  c.whistleCd = X.whistleEvery;
  sfx(s, 'whistle');
  shake(s, 1.5);
  floater(s, 'HALT!', e.x, e.y - 34, 'amber', false, 50);
}

function callSquad(s: S, e: Enemy, hero: Hero): void {
  const n = X.squad - squadAlive(s);
  if (n <= 0) return;
  // The squad are the Commander's own troopers, a little under a stage trooper's HP and punch (x.squadHp, x.squadAtk).
  for (const t of bringUp(s, 'squad', 'squad', 'trooper', undefined, squadSpots(s, e.x, e.y, hero), n)) {
    t.hp = t.hpMax = Math.max(1, Math.round(t.hpMax * X.squadHp));
    t.atk *= X.squadAtk;
  }
}

/** Half HP: the shield cracks and the charges begin. */
function crack(s: S, e: Enemy, d: DemoState, c: Ch5State): void {
  c.cracked = true;
  sfx(s, 'shieldBreak');
  shake(s, 4);
  flashScreen(s, 0.25);
  dust(s, e.x, e.y, 6);
  floater(s, 'CRACKED', e.x, e.y - 34, 'yellow', true, 60);
  if (d.move === 'swipe' || d.move === 'plant') toWalk(e, d);
  d.chargeCd = 45;
}

function stalk(s: S, e: Enemy, d: DemoState, c: Ch5State, hero: Hero, dd: number, clear: boolean): void {
  e.mode = 'chase';
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  turn(e, toHero, X.turn);
  if (clear) {
    if (c.cracked) {
      if (d.chargeCd <= 0) { startCharge(s, e, d, hero); return; }
    } else if (c.whistleCd <= 0) {
      if (squadAlive(s) < X.squad) { startPlant(s, e, d, c); return; }
      c.whistleCd = RETRY;
    }
    // He commits to a bash only with the hero in front of the shield.
    if (e.cd <= 0 && dd <= X.range && inFront(e, toHero)) { startBash(s, e, d); return; }
  }
  // Round a corner no attack lands, so he keeps coming until he has a line.
  if (dd > X.hold || !clear) {
    const moved = walk(s, e, hero, DEF.speed * e.spd * speedMul(e.stat), clear);
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
  } else {
    setEnemyAnim(e, 'idle');
  }
}

export function commanderUpdate(s: S, e: Enemy, hero: Hero): void {
  const d = e.demo as DemoState;
  const c = e.ch5 as Ch5State;
  if (d.chargeCd > 0) d.chargeCd--;
  if (c.whistleCd > 0) c.whistleCd--;
  const dd = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && dd <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  if (!c.cracked && e.hp <= e.hpMax * X.crackAt) crack(s, e, d, c);
  const toHero = Math.atan2(hero.y - e.y, hero.x - e.x);
  switch (d.move) {
    case 'walk': stalk(s, e, d, c, hero, dd, clear); return;
    case 'swipe':
      turn(e, toHero, X.turn);
      if (--d.t <= 0) bash(s, e, d, hero);
      return;
    case 'plant':
      setEnemyAnim(e, 'idle');
      if (--d.t <= 0) { callSquad(s, e, hero); toWalk(e, d); }
      return;
    case 'wind':
      faceHero(e, hero);
      if (--d.t <= 0) launch(s, e, d, hero);
      return;
    case 'run': run(s, e, d, hero); return;
    case 'stun':
      if (--d.t <= 0) { d.chargeCd = jitter(s, X.chargeEvery); toWalk(e, d); }
      return;
    default:
      if (--d.t <= 0) toWalk(e, d);
  }
}
