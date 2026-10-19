// The Mind Flayer's body, phase two of the 3.3 boss (docs/level-9.md, "The Mind Flayer"). It never moves; its four legs (flayer_legs.ts) do the
// fighting and this brain tells them when. What the hit pipeline does to it is in flayer_hit.ts.
//
//   rise: it comes in through the skylight when its group wakes, 40 frames (pose 'rise', a 'glass' fx, the `shatter` sfx). Nothing can hit it
//     or its legs, and nothing slams.
//   up: about every 110 frames one idle leg is sent down a line through where the hero stands (two at once in phase two). A hit on the body
//     does nothing while any leg stands (shielded). Every 600 frames a Flayed comes up at one of the arena's sides, at most two alive.
//   down: with all its legs severed its head is on the floor for 420 frames (pose 'down') and takes x3. Then it rises, every leg grows back
//     at full HP, and the slams start again.
//   phase two: under half HP the legs' warning drops to 28 frames, two legs go at once, and about every 480 frames a leg sweeps: a band 24 px
//     tall, wall to wall, along the row the hero stands on.
// Word vomit does nothing to the body, and a trap doesn't hold it (combat/confuse.ts).
// The final boss's Mind Flayer (`flayer5`, docs/level-16.md) is this brain on its own def, with one change in what a hit does (flayer_hit.ts): it is
// shielded while its chest is shut, not while a leg stands, and a hit on a leg opens the chest for chestT frames (flayer_legs.ts, legHit).
import type { Enemy, FlayerState, Hero, LegState, Pos, S } from '../combat/state.ts';
import { TILE } from '../core/config.ts';
import { addFx, floater, flashScreen, sfx, shake } from '../combat/fx.ts';
import { bringUp, howlSpots } from '../combat/spawns.ts';
import { ENEMY_DEFS } from './defs.ts';
import { WAVE_GROUP, legStands } from './flayer_hit.ts';
import { regrow, startLine, startSweep } from './flayer_legs.ts';
import { setEnemyAnim } from './steer.ts';

/** The numbers of this body: the 3.3 Mind Flayer's or the final boss's (`flayer5`). */
const xOf = (e: Enemy): Record<string, number> => ENEMY_DEFS[e.kind].x;
const LEG = ENEMY_DEFS.flayerleg.x;
/** Frames a leg's turn is put off when no leg is free to take it. */
const RETRY = 20;

/** n, give or take a tenth: so the legs don't fall into lockstep. */
const jitter = (s: S, n: number): number => Math.round(n * (0.9 + s.rng() * 0.2));

/** Called when the body's group wakes: it comes in through the skylight. */
export function wakeFlayer(s: S, e: Enemy): void {
  const f = e.flayer;
  if (!f) return;
  const X = xOf(e);
  f.move = 'rise';
  f.t = X.riseT as number;
  setEnemyAnim(e, 'idle');
  addFx(s, 'glass', e.x, e.y, 'down', 0, X.riseT as number, 128, 0);
  sfx(s, 'shatter');
  shake(s, 6);
  flashScreen(s, 0.4);
}

const legMove = (l: Enemy): LegState['move'] => (l.leg as LegState).move;
/** A leg that is on a line or a band right now. */
const busy = (l: Enemy): boolean => legMove(l) === 'warn' || legMove(l) === 'slam';
const idleLegs = (f: FlayerState): Enemy[] => f.legs.filter((l) => legStands(l) && legMove(l) === 'idle');

/** Sends `n` idle legs down their lines, picked by the sim's rng. Returns how many went. */
function sendLines(s: S, f: FlayerState, hero: Hero, n: number): number {
  const pool = idleLegs(f);
  let sent = 0;
  while (sent < n && pool.length > 0) {
    const [leg] = pool.splice(Math.floor(s.rng() * pool.length), 1) as [Enemy];
    startLine(s, leg, hero, (f.phase2 ? LEG.warnLow : LEG.warn) as number);
    sent++;
  }
  return sent;
}

/** The two Flayed of a wave come up at the arena's sides: the burrows farthest west and east, or open floor round the hero with none. */
function waveSpots(s: S, hero: Hero): Pos[] {
  if (s.burrows.length < 2) return howlSpots(s, hero.x, hero.y);
  const feet = s.burrows.map((b): Pos => ({ x: b.tx * TILE + TILE / 2, y: b.ty * TILE + 12 })).sort((p, q) => p.x - q.x);
  return [feet[0] as Pos, feet[feet.length - 1] as Pos];
}

function callWave(s: S, e: Enemy, f: FlayerState, hero: Hero): void {
  const X = xOf(e);
  const alive = s.enemies.filter((o) => o.group === WAVE_GROUP && !o.dead).length;
  const n = Math.min(X.waveN as number, (X.waveMax as number) - alive);
  if (n <= 0) { f.waveCd = RETRY * 3; return; }
  bringUp(s, 'howl', WAVE_GROUP, 'flayed', undefined, waveSpots(s, hero), n, f.waves % 2);
  f.waves++;
  f.waveCd = X.waveEvery as number;
}

function phaseTwo(s: S, e: Enemy, f: FlayerState): void {
  f.phase2 = true;
  f.sweepCd = Math.min(f.sweepCd, xOf(e).sweepFirst as number);
  floater(s, 'ENRAGED', e.x, e.y - 40, 'hot', true, 70);
  sfx(s, 'roar');
  shake(s, 5);
  flashScreen(s, 0.2);
}

/** Every leg is cut: the head comes down. */
function headDown(s: S, e: Enemy, f: FlayerState): void {
  f.move = 'down';
  f.t = xOf(e).downT as number;
  floater(s, 'HEAD DOWN', e.x, e.y - 40, 'yellow', true, 70);
  sfx(s, 'thud');
  shake(s, 6);
  flashScreen(s, 0.2);
}

/** The head comes up: the legs grow back at full HP and the slams start again after a pause. */
function headUp(s: S, e: Enemy, f: FlayerState): void {
  f.move = 'up';
  f.t = 0;
  if (e.fin) e.fin.open = 0;
  for (const l of f.legs) if (!l.dead) regrow(s, l);
  f.slamCd = xOf(e).slamRegrow as number;
  f.sweepCd = Math.max(f.sweepCd, 120);
  floater(s, 'REGROWN', e.x, e.y - 40, 'hot', true, 60);
  sfx(s, 'roar');
  shake(s, 4);
}

export function flayerUpdate(s: S, e: Enemy, hero: Hero): void {
  const f = e.flayer as FlayerState;
  const X = xOf(e);
  e.mode = 'chase';
  setEnemyAnim(e, 'idle');
  switch (f.move) {
    case 'rise':
      if (--f.t <= 0) { f.move = 'up'; f.slamCd = X.slamFirst as number; }
      return;
    case 'down':
      if (--f.t <= 0) headUp(s, e, f);
      return;
    case 'up':
      // The final boss's chest closes again when its time is up.
      if (e.fin && e.fin.open > 0) e.fin.open--;
      break;
  }
  if (!f.phase2 && e.hp <= e.hpMax * (X.phaseAt as number)) phaseTwo(s, e, f);
  const standing = f.legs.filter(legStands).length;
  if (f.legs.length > 0 && standing === 0) { headDown(s, e, f); return; }
  f.slamCd--;
  f.waveCd--;
  if (f.phase2) f.sweepCd--;
  if (f.waveCd <= 0) callWave(s, e, f, hero);
  // Slams and sweeps wait until no leg is on a line or a band: a sweep first when both are due.
  if (f.legs.some(busy)) return;
  if (f.phase2 && f.sweepCd <= 0) {
    const pool = idleLegs(f);
    if (pool.length === 0) { f.sweepCd = RETRY; return; }
    startSweep(s, pool[Math.floor(s.rng() * pool.length)] as Enemy, hero);
    f.sweepCd = jitter(s, X.sweepEvery as number);
    f.slamCd = Math.max(f.slamCd, 40);
    return;
  }
  if (f.slamCd > 0) return;
  const sent = sendLines(s, f, hero, f.phase2 ? 2 : 1);
  f.slamCd = sent > 0 ? jitter(s, X.slamEvery as number) : RETRY;
}
