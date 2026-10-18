// The Creel House's state (docs/level-11.md): the haunted mirrors the ghouls wait in, the clock curse and Max's Walkman. S.house holds one.
// The rules are in enemies/ghoul.ts (the ghoul), combat/curse.ts (the curse and the Walkman) and combat/props.ts (the mirror and the clock).
import type { Hero, S } from './state.ts';

/**
 * What a ghoul is doing (enemies/ghoul.ts). glass: waiting in its mirror, unseen and untouchable. rise: stepping out, and it can be hit.
 * drift: floating at the hero. wind: the "!" before the lunge. lunge: the lunge. recover: after it.
 */
export type GhoulMove = 'glass' | 'rise' | 'drift' | 'wind' | 'lunge' | 'recover';

/**
 * A ghoul's own state. Every other enemy has `ghoul: null`. `t` is the frames left in the current move, `mirror` the prop id of the mirror
 * it waits in, `sx, sy` where it steps out (worked out the first time a hero comes near, NaN until then) and `awake` that its group is
 * awake, so that it steps out when a hero comes near. In the glass a ghoul is dormant for the rest of the sim, targets and all.
 */
export interface GhoulState { move: GhoulMove; t: number; mirror: string; sx: number; sy: number; awake: boolean }

/** One clock curse counting: the hero, the clock that chimed, the chimes sounded, the frames since the last one and the gap to the next. */
export interface Curse { hero: Hero; clock: string; chimes: number; t: number; gap: number }

export interface HouseState {
  /** Per haunted mirror: how many ghouls it started with, and the frame the last one stepped out of it. */
  mirrors: Map<string, { total: number; at: number }>;
  /** The curses counting, one per cursed hero. */
  curses: Curse[];
  /** The clocks that have chimed. A clock never chimes twice. */
  spent: Set<string>;
  /** Max's Walkman: the party has it, the frames until it is ready again, and the frames of protection from the curse it has left. */
  walkman: boolean; walkCd: number; walkOn: number;
  /** Heroes floating back down after a curse ended, with their height. */
  down: Map<Hero, number>;
}

export const newHouse = (walkman: boolean): HouseState =>
  ({ mirrors: new Map(), curses: [], spent: new Set(), walkman, walkCd: 0, walkOn: 0, down: new Map() });

/** How high the chimes lift a cursed hero, in px each. */
export const CHIME_LIFT = 4;

/** The curse a hero is under, if any. A cursed hero hangs where it found them and can't act, be hurt or be swapped to. */
export const cursedBy = (s: S, h: Hero): Curse | undefined => s.house.curses.find((c) => c.hero === h);
export const isCursed = (s: S, h: Hero): boolean => cursedBy(s, h) !== undefined;

/** Heroes who can still fight: not knocked out and not hanging under a curse. */
export const standing = (s: S): Hero[] => s.heroes.filter((h) => !h.ko && !isCursed(s, h));
