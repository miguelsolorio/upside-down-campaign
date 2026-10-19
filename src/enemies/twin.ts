// The twin Demogorgons of the Abyss (docs/level-15.md). Each runs the Demogorgon's brain (demogorgon.ts) on its own def; this is what
// makes them a pair.
//
//   turns: while one charges, the other circles the hero at x.orbit px and only swipes if the hero walks up to it. They alternate by
//     the charges each has launched (the lower uid first), and a twin that holds the turn without charging for x.turnWait frames loses
//     it. A mate in the void doesn't count: the one left goes on alone until it climbs back.
//   enrage: when one dies the other roars, opens its petals (the acid every 5 s) and walks and charges x.enrage times as fast, for good.
//   the fall: twin_fall.ts. A twin that goes over the edge loses 15 percent of its max HP and is back 180 frames after the fall began.
//   the bar: THE TWINS, the HP of both added (view.ts).
import { ENEMY_DEFS } from './defs.ts';
import type { Enemy, Hero, S } from '../combat/state.ts';
import { flashScreen, floater, shake } from '../combat/fx.ts';
import { speedMul } from '../combat/status.ts';
import { chaseHero, faceHero, setEnemyAnim, stepToward } from './steer.ts';
import { isAway } from './twin_fall.ts';

/** The twin that is up and fighting alongside `e`, or null. */
export function mateOf(s: S, e: Enemy): Enemy | null {
  return s.enemies.find((o) => o !== e && o.kind === 'twin' && !o.dead && !o.dormant && o.hp > 0) ?? null;
}

/**
 * True when it is this twin's turn to attack (charge, spit), false when it should circle. Alone, or with a mate in the void, it always
 * is. With a mate on its feet it is when the mate is not in a move of its own and the count of charges says so.
 */
export function twinMine(s: S, e: Enemy): boolean {
  const c = e.ch5;
  if (e.kind !== 'twin' || !c) return true;
  const mate = mateOf(s, e);
  const mc = mate?.ch5, md = mate?.demo;
  if (!mate || !mc || !md || isAway(md.move)) return true;
  if (md.move !== 'walk') return false;
  const mine = c.charges < mc.charges || (c.charges === mc.charges && e.uid < mate.uid);
  if (!mine) { c.waitT = 0; return false; }
  // Holding the turn without a charge to show for it (no line to the hero, say): it goes to the mate.
  if (++c.waitT > (ENEMY_DEFS.twin.x.turnWait as number)) { c.charges++; c.waitT = 0; return false; }
  return true;
}

/** A charge has been launched: it counts, and the wait for the turn starts over. */
export function twinCharged(e: Enemy): void {
  if (e.kind !== 'twin' || !e.ch5) return;
  e.ch5.charges++;
  e.ch5.waitT = 0;
}

/** Circles the hero at x.orbit px, in when far, out when near, round when between. The way round turns over every two seconds. */
export function twinCircle(s: S, e: Enemy, hero: Hero, d: number, clear: boolean): void {
  const DEF = ENEMY_DEFS.twin, X = DEF.x;
  const sp = DEF.speed * e.spd * speedMul(e.stat) * (X.orbitSpeed as number);
  const orbit = X.orbit as number, band = X.band as number;
  if (!clear) { setEnemyAnim(e, chaseHero(s, e, hero, sp, false) > 0 ? 'walk' : 'idle'); return; }
  if (d > orbit + band) {
    setEnemyAnim(e, stepToward(s, e, hero.x, hero.y, sp) > 0 ? 'walk' : 'idle');
  } else if (d < orbit - band) {
    const a = Math.atan2(e.y - hero.y, e.x - hero.x);
    setEnemyAnim(e, stepToward(s, e, e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, sp) > 0 ? 'walk' : 'idle');
    faceHero(e, hero);
  } else {
    const side = ((e.uid + Math.floor(s.frame / 120)) & 1) === 0 ? 1 : -1;
    const phi = Math.atan2(e.y - hero.y, e.x - hero.x) + side * 0.5;
    setEnemyAnim(e, stepToward(s, e, hero.x + Math.cos(phi) * orbit, hero.y + Math.sin(phi) * orbit, sp) > 0 ? 'walk' : 'idle');
    faceHero(e, hero);
  }
}

/** A twin has died: the one left enrages. It roars the next time it is free to (demogorgon.ts, stalk), faster from now. */
export function enrageMate(s: S, dead: Enemy): void {
  if (dead.kind !== 'twin') return;
  for (const o of s.enemies) {
    if (o === dead || o.kind !== 'twin' || o.dead || o.dormant || !o.ch5 || o.ch5.enraged) continue;
    o.ch5.enraged = true;
    o.ch5.mateMax = dead.hpMax;
    o.spd *= ENEMY_DEFS.twin.x.enrage as number;
    floater(s, 'ENRAGED', o.x, o.y - 34, 'red', true, 70);
    shake(s, 3);
    flashScreen(s, 0.2);
  }
}
