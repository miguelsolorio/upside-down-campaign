// Vecna, the 4.4 boss (docs/level-13.md, "Vecna"). One body, `vecna`, and four memory orbs (orb.ts), all in group `boss`. Every number is read
// through xOf, so a spawn's own x (SimSpawn.x) lays over the def's: `speedMul` scales his walk and the timings of his whip, his throw and his
// rise, `chimeEvery` sets the clock. Chapter 5's Vecna runs on { speedMul: 1.3, chimeEvery: 720 }. The phases, what a hit does and the view's
// effects are in vecna_phase.ts.
//
//   walk: he comes at the hero at 0.4 px a frame and stops 26 px short, always facing him. In Float he hovers, 80 px short.
//   whip (Clock and Burn): every 120 frames (80 in Burn), with the hero in a clear line inside 60 px, he winds up for 24 frames under the "!"
//     (pose 'whip') and the line is locked through where the hero stood, then the lash is out for 10 frames: a hero within 10 px of the line
//     takes power 0.7 and knockback 3, once. Then he walks again.
//   throw (Float): every 150 frames he winds up for 24 frames (pose 'throw'), then a rock flies 40 frames to where the hero stood as it left
//     his hand, a 'mark' on the floor all the while. It splashes 20 px for power 0.8.
//   down: a broken orb in Float puts him on the floor for 300 frames (vecna_phase.ts, pullDown). Nothing else he does runs meanwhile.
//   the clock (updateVecna, any phase): every `chimeEvery` frames (half that in Burn) the attic's clock chimes and curses a random hero who is
//     standing and not cursed, never the last one standing, and marks a random standing orb that no curse has marked, if one stands. A curse
//     counts its four chimes a third of the chime interval apart, so it knocks the hero out just as the next one chimes. Nothing happens
//     while the Walkman is on or with no orb to mark.
//   the heal (updateVecna): every 120 frames each standing orb gives him 1% of his max HP.
// No hit knocks him back, staggers him, confuses him or stuns him, and a trap doesn't hold him. He dies only by HP.
import type { Enemy, Hero, S, VecnaState } from '../combat/state.ts';
import { activeHero, dirOfVec } from '../combat/state.ts';
import { dist, distToSegment, los } from '../combat/space.ts';
import { dust, floater, sfx, shake } from '../combat/fx.ts';
import { alertEnemy, hurtHero } from '../combat/damage.ts';
import { CHIMES, beginCurse, fightTarget, markedOrb } from '../combat/curse.ts';
import { awayFrom } from '../combat/party.ts';
import { orbStands } from '../combat/vecna_state.ts';
import { speedMul } from '../combat/status.ts';
import { ENEMY_DEFS, xOf } from './defs.ts';
import { scanRay } from './flayer_legs.ts';
import { tickOrbs } from './orb.ts';
import { advancePhase } from './vecna_phase.ts';
import { chaseHero, faceHero, setEnemyAnim } from './steer.ts';

const DEF = ENEMY_DEFS.vecna;

/** n, give or take a tenth: so the whips don't fall into lockstep with the clock. */
const jitter = (s: S, n: number): number => Math.round(n * (0.9 + s.rng() * 0.2));

/** Frames between a curse's first chime and its fourth, and so between the curse's own chimes a third of that. */
const chimeGap = (e: Enemy, v: VecnaState): number => Math.round((xOf(e).chimeEvery as number) / (v.phase === 3 ? 2 : 1));

// ---------------------------------------------------------------- the clock and the heal
/** A random standing orb that no curse has marked, or any standing orb when every one is marked. Null when none stands. */
function pickOrb(s: S, v: VecnaState): Enemy | null {
  const up = v.orbs.filter(orbStands);
  const free = up.filter((o) => !markedOrb(s, o.id));
  const from = free.length > 0 ? free : up;
  return from.length === 0 ? null : (from[Math.floor(s.rng() * from.length)] as Enemy);
}

/** The clock chimes: a curse on a random hero, an orb marked. The party swaps away at once if the hero was the one up. */
function chime(s: S, e: Enemy, v: VecnaState): void {
  if (s.house.walkOn > 0 || s.over) return;
  const orb = pickOrb(s, v);
  const hero = orb ? fightTarget(s) : null;
  if (!orb || !hero) return;
  const clock = s.props.find((p) => p.kind === 'clock');
  beginCurse(s, hero, clock?.id ?? '', Math.max(1, Math.round(chimeGap(e, v) / (CHIMES - 1))), orb.id);
  v.curseT = xOf(e).curseT as number;
  if (hero === activeHero(s)) awayFrom(s);
}

/** Each standing orb gives him a share of his max HP. */
function heal(s: S, e: Enemy, v: VecnaState): void {
  const X = xOf(e);
  const n = v.orbs.filter(orbStands).length;
  const gain = Math.min(e.hpMax - e.hp, Math.round(e.hpMax * (X.heal as number) * n));
  if (n === 0 || gain <= 0) return;
  e.hp += gain;
  floater(s, `+${gain}`, e.x, e.y - 44, 'leaf', false, 40);
}

/** A rock lands, and splashes the hero if he stands in it. The rock's splash stays drawn for splashT frames more. */
function landRocks(s: S, e: Enemy, v: VecnaState): void {
  if (v.rocks.length === 0) return;
  const X = xOf(e);
  const hero = activeHero(s);
  for (const r of v.rocks) {
    if (++r.age !== r.life) continue;
    sfx(s, 'debris');
    shake(s, 3);
    dust(s, r.tx, r.ty, 6);
    if (!hero.ko && dist(hero.x, hero.y, r.tx, r.ty) <= X.throwSplash) hurtHero(s, hero, r.tx, r.ty, X.throwPower, r.atk, 2);
  }
  v.rocks = v.rocks.filter((r) => r.age < r.life + X.splashT);
}

/**
 * The part of his turn that runs whatever else is going on (a hero down, a stagger): the orbs regrow, the phases move on, the rocks fly, and
 * the clock and the heal count. Called once a tick, ahead of every brain (enemies/ai.ts).
 */
export function updateVecna(s: S): void {
  tickOrbs(s);
  for (const e of s.enemies) {
    const v = e.vecna;
    if (!v || e.dead || e.dormant || e.hp <= 0) continue;
    advancePhase(s, e);
    landRocks(s, e, v);
    if (v.curseT > 0) v.curseT--;
    if (!e.aware) continue;
    if (--v.chimeCd <= 0) { v.chimeCd = chimeGap(e, v); chime(s, e, v); }
    if (--v.healCd <= 0) { v.healCd = xOf(e).healEvery as number; heal(s, e, v); }
  }
}

// ---------------------------------------------------------------- the whip
function toWalk(e: Enemy, v: VecnaState): void {
  v.move = 'walk';
  v.t = 0;
  v.lash = null;
  e.mode = 'chase';
}

function startWhip(s: S, e: Enemy, v: VecnaState, hero: Hero): void {
  const X = xOf(e), sm = X.speedMul as number;
  const a = Math.atan2(hero.y - e.y, hero.x - e.x);
  const tip = scanRay(s, e.x, e.y, Math.cos(a), Math.sin(a), X.whipLen);
  const wind = Math.max(1, Math.round(DEF.windup / sm)), lash = Math.max(1, Math.round((X.lashT as number) / sm));
  v.lash = { ox: e.x, oy: e.y, angle: a, len: dist(e.x, e.y, tip.x, tip.y), t: 0, wind, life: wind + lash, struck: false };
  v.move = 'wind';
  v.t = wind;
  v.whipCd = jitter(s, Math.round((v.phase === 3 ? X.burnWhipEvery : X.whipEvery) / sm));
  e.mode = 'windup';
  e.dir = dirOfVec(Math.cos(a), Math.sin(a), e.dir);
  setEnemyAnim(e, 'attack');
  sfx(s, 'alert');
}

/** The lash is out: a hero within whipHalf of the line is hurt, once. */
function sting(s: S, e: Enemy, v: VecnaState, hero: Hero): void {
  const l = v.lash;
  if (!l || l.struck || hero.ko) return;
  const X = xOf(e);
  const tx = l.ox + Math.cos(l.angle) * l.len, ty = l.oy + Math.sin(l.angle) * l.len;
  if (distToSegment(hero.x, hero.y, l.ox, l.oy, tx, ty) > X.whipHalf) return;
  if (hurtHero(s, hero, l.ox, l.oy, DEF.power, e.atk, X.whipKb) > 0) l.struck = true;
}

// ---------------------------------------------------------------- the throw
function startThrow(s: S, e: Enemy, v: VecnaState, hero: Hero): void {
  const X = xOf(e), sm = X.speedMul as number;
  faceHero(e, hero);
  v.move = 'throw';
  v.t = Math.max(1, Math.round(DEF.windup / sm));
  v.throwCd = jitter(s, Math.round(X.throwEvery / sm));
  e.mode = 'windup';
  setEnemyAnim(e, 'cast');
  sfx(s, 'alert');
}

/** The wind-up is over: the rock leaves his hand for where the hero stands now. */
function release(s: S, e: Enemy, v: VecnaState, hero: Hero): void {
  const X = xOf(e);
  v.rocks.push({ sx: e.x, sy: e.y, tx: hero.x, ty: hero.y, age: 0, life: Math.max(1, Math.round((X.throwT as number) / (X.speedMul as number))), atk: e.atk });
  sfx(s, 'debris');
  toWalk(e, v);
}

// ---------------------------------------------------------------- the brain
/** He rises to Float's height, or comes down to the floor, riseT frames to do it. */
function lift(e: Enemy, v: VecnaState): void {
  const X = xOf(e);
  const to = v.phase === 2 && v.move !== 'down' ? (X.floatZ as number) : 0;
  const step = (X.floatZ as number) / Math.max(1, (X.riseT as number) / (X.speedMul as number));
  e.z += Math.max(-step, Math.min(step, to - e.z));
}

export function vecnaUpdate(s: S, e: Enemy, hero: Hero): void {
  const v = e.vecna as VecnaState, X = xOf(e), sm = X.speedMul as number;
  const d = dist(e.x, e.y, hero.x, hero.y);
  const clear = los(s, e.x, e.y, hero.x, hero.y);
  if (!e.aware) {
    if (clear && d <= DEF.aggro) alertEnemy(s, e);
    else { setEnemyAnim(e, 'idle'); return; }
  }
  if (v.whipCd > 0) v.whipCd--;
  if (v.throwCd > 0) v.throwCd--;
  lift(e, v);
  switch (v.move) {
    case 'down':
      setEnemyAnim(e, 'hurt');
      if (--v.t <= 0) { toWalk(e, v); v.throwCd = Math.max(v.throwCd, 45); }
      return;
    case 'wind': {
      const l = v.lash;
      if (l) l.t++;
      if (--v.t > 0) return;
      v.move = 'lash';
      v.t = l ? l.life - l.wind : 1;
      e.mode = 'recover';
      sfx(s, 'whip');
      shake(s, 2);
      sting(s, e, v, hero);
      return;
    }
    case 'lash':
      if (v.lash) v.lash.t++;
      sting(s, e, v, hero);
      if (--v.t <= 0) { toWalk(e, v); setEnemyAnim(e, 'idle'); }
      return;
    case 'throw':
      faceHero(e, hero);
      if (--v.t <= 0) release(s, e, v, hero);
      return;
    case 'walk':
      break;
  }
  e.mode = 'chase';
  const floating = v.phase === 2;
  if (!floating && v.whipCd <= 0 && clear && !hero.ko && d <= X.whipLen) { startWhip(s, e, v, hero); return; }
  if (floating && v.throwCd <= 0 && !hero.ko) { startThrow(s, e, v, hero); return; }
  if (d > (floating ? X.floatHold : X.hold) || !clear) {
    const moved = chaseHero(s, e, hero, DEF.speed * sm * e.spd * speedMul(e.stat), clear);
    faceHero(e, hero);
    setEnemyAnim(e, moved > 0 ? 'walk' : 'idle');
  } else {
    faceHero(e, hero);
    setEnemyAnim(e, 'idle');
  }
}
