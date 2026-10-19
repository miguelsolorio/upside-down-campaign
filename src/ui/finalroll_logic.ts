// The Final Roll's rules and its clock (docs/level-16.md, "The Final Roll"). Pure: no DOM, no audio, no drawing, so Node can test it.
// Every hero still standing rolls a d20 with advantage, one after another: two dice, the higher stays. The kept dice add up to a
// total, and the total only sets the size of the finish: plain under BIG_AT, bigger from BIG_AT, and the gold flourish when any
// hero kept a 20. Nothing here can fail: there is no outcome that loses, and a low total still wins.
import type { HeroId, SfxId } from '../core/types.ts';
import { rollD20 } from '../progression/xp.ts';
import type { Rng } from '../progression/xp.ts';

export type Finish = 'plain' | 'big' | 'gold';
export interface HeroRoll {
  hero: HeroId;
  /** The two dice, in the order they tumbled. */
  dice: [number, number];
  /** The higher of the two, the one that stays. */
  keep: number;
}
export interface FinalRoll {
  rolls: HeroRoll[];
  /** The kept dice added up. */
  total: number;
  finish: Finish;
  /** True when any hero kept a 20, which a 20 on either die always means. */
  nat20: boolean;
}

/** A total of this much or more is the bigger finish. */
export const BIG_AT = 30;
export const NAT = 20;

/** What each finish is called on the card. */
export const FINISH_NAMES: Record<Finish, string> = {
  plain: 'A CLEAN BLOW',
  big: 'A MIGHTY BLOW',
  gold: 'A LEGENDARY BLOW',
};

/** The size of the finish: gold for any 20, else bigger from BIG_AT, else plain. */
export function finishOf(total: number, keeps: readonly number[]): Finish {
  if (keeps.some((k) => k >= NAT)) return 'gold';
  return total >= BIG_AT ? 'big' : 'plain';
}

/** Two d20s, the first rolled first. */
export function rollPair(rng: Rng): [number, number] {
  const a = rollD20(rng);
  return [a, rollD20(rng)];
}

/** Rolls the Final Roll: each hero in turn with advantage. The same seed gives the same roll. No heroes still standing is a total of
 * zero, the plain finish. */
export function rollFinal(heroes: readonly HeroId[], rng: Rng): FinalRoll {
  const rolls = heroes.map((hero): HeroRoll => {
    const dice = rollPair(rng);
    return { hero, dice, keep: Math.max(dice[0], dice[1]) };
  });
  const total = rolls.reduce((n, r) => n + r.keep, 0);
  return { rolls, total, finish: finishOf(total, rolls.map((r) => r.keep)), nat20: rolls.some((r) => r.keep >= NAT) };
}

/** A seed from `from` up whose Final Roll for these heroes has this finish, for the dev hook. Null when none turns up in `tries`. */
export function seedFor(heroes: readonly HeroId[], finish: Finish, from: number, rngOf: (seed: number) => Rng, tries = 200000): number | null {
  for (let s = from; s < from + tries; s++) if (rollFinal(heroes, rngOf(s)).finish === finish) return s;
  return null;
}

// ---------------------------------------------------------------- the clock (frames at 60 Hz)
/** The two dice tumble this long. */
export const TUMBLE = 44;
/** Then the pair rests this long, the higher lit and the lower dimmed, before the next hero. */
export const SETTLE = 30;
export const SLOT = TUMBLE + SETTLE;
/** The finish card holds this long, then the roll is over. */
export const FINISH_LEN = 110;
/** Confirm cannot skip the finish before this, so mashing through the dice never skips what they led to. */
export const FINISH_MIN = 36;
/** Confirm does nothing for this long at the start: the press that ended the fight must not skip the first roll. */
export const GRACE = 24;
/** Clatters while the dice tumble, as frames into the tumble: the roll sound at each. */
export const CLATTERS: readonly number[] = [0, 14, 29];

export type Stage = 'tumble' | 'settled' | 'finish';
/** Where the clock is: whose roll (`hero` is the heroes' count once the finish starts), which part of it, and frames into that part. */
export interface Beat { stage: Stage; hero: number; t: number }

export function beatAt(clock: number, n: number): Beat {
  const c = Math.max(0, clock);
  const end = n * SLOT;
  if (c >= end) return { stage: 'finish', hero: n, t: c - end };
  const hero = Math.floor(c / SLOT);
  const t = c - hero * SLOT;
  return t < TUMBLE ? { stage: 'tumble', hero, t } : { stage: 'settled', hero, t: t - TUMBLE };
}

/** The clock at which the whole roll is over. */
export const endClock = (n: number): number => n * SLOT + FINISH_LEN;
export const isDone = (clock: number, n: number): boolean => clock >= endClock(n);

/** Where confirm takes the clock: a tumbling pair lands, a rested pair gives way to the next hero, a finish that has shown for
 * FINISH_MIN ends. Anywhere else it stays put. */
export function skipClock(clock: number, n: number): number {
  const b = beatAt(clock, n);
  if (b.stage === 'tumble') return b.hero * SLOT + TUMBLE;
  if (b.stage === 'settled') return (b.hero + 1) * SLOT;
  return b.t >= FINISH_MIN ? endClock(n) : clock;
}

/** The kept dice added up as far as the clock has got: a hero counts once their pair has landed. */
export function totalAt(roll: FinalRoll, clock: number): number {
  const b = beatAt(clock, roll.rolls.length);
  const counted = b.stage === 'finish' ? roll.rolls.length : b.stage === 'settled' ? b.hero + 1 : b.hero;
  return roll.rolls.slice(0, counted).reduce((n, r) => n + r.keep, 0);
}

/** The sounds to play as the clock goes from `from` to `to` (both frames, `to` later): `roll` at each clatter of a tumble,
 * `rollLand` as a pair lands, and `natTwenty` as a gold finish starts. A skip over several beats plays each sound once. */
export function soundsBetween(from: number, to: number, roll: FinalRoll): SfxId[] {
  const at: [number, SfxId][] = [];
  roll.rolls.forEach((_, i) => {
    for (const c of CLATTERS) at.push([i * SLOT + c, 'roll']);
    at.push([i * SLOT + TUMBLE, 'rollLand']);
  });
  if (roll.finish === 'gold') at.push([roll.rolls.length * SLOT + 4, 'natTwenty']);
  const out: SfxId[] = [];
  for (const [when, id] of at.sort((a, b) => a[0] - b[0])) if (when > from && when <= to && !out.includes(id)) out.push(id);
  return out;
}

// ---------------------------------------------------------------- the tumble
export interface Spin { angle: number; squash: number; lift: number }
const TAU = Math.PI * 2;

/** How die `k` (0 or 1) of a pair is turned `t` frames into its tumble: spinning, wobbling and bouncing, then upright and flat on
 * the table at TUMBLE. */
export function spinAt(t: number, k: 0 | 1): Spin {
  const p = Math.max(0, Math.min(1, t / TUMBLE));
  const ease = 1 - (1 - p) * (1 - p);
  const turns = k === 0 ? 2 : 3;
  const wobble = 0.3 + 0.7 * Math.abs(Math.cos(t * 0.42 + k * 1.7));
  return {
    angle: ease * turns * TAU,
    squash: wobble + (1 - wobble) * p * p,
    lift: Math.round(Math.abs(Math.sin(p * Math.PI * 3 + k * 0.8)) * (1 - p) * 14),
  };
}

/** The number shown on die `k` `t` frames into the tumble: it flickers through faces, then shows `face` from the landing on. `salt`
 * (the hero's place in the order) keeps two heroes' dice from flickering through the same numbers. */
export function faceAt(t: number, k: 0 | 1, face: number, salt = 0): number {
  if (t >= TUMBLE) return face;
  return 1 + ((t * 7 + k * 11 + salt * 5 + (t >> 2) * 3) % 20);
}
