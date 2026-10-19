// The final fight's state (docs/level-16.md, stage 5.3). S.finale holds one when the stage has a FinaleDef. The rules are in finale.ts (the
// phases) and channel.ts (the channelers); the party and the enemies ask here whether a hero is on a mark.
import type { FinaleDef } from '../core/types.ts';
import type { Flow, Hero, Pos, S } from './state.ts';

/**
 * One of the two who channel in phase three. x, y is the mark, where the hero's feet rest: it is also what the wave enemies steer at (`ward`
 * marks it as a ward's for enemies/steer.ts, `flow` is the BFS field pointed at it). The hero stays in the party but is held, out of play, and
 * the bar is the channeler's own: damage goes here and not to the hero's HP.
 */
export interface Channeler extends Pos {
  ward: true;
  flow: Flow;
  hero: Hero;
  hp: number; hpMax: number;
  /** 1 on a hit, fading. */
  flash: number;
}

/**
 * phase: 0 before the fight, then 1 Vecna, 2 the Mind Flayer, 3 the channel. `t` is the frames since the phase began. `wait` counts the frames
 * since a boss went down, to the next phase. In phase three the channelers walk to their marks, and `on` is set when they stand there: the
 * clock `left` runs down from `total`, `next` and `cursor` track the waves, `resets` counts the falls. `done` is set when the Final Roll has
 * been sent.
 */
export interface Finale {
  def: FinaleDef;
  phase: 0 | 1 | 2 | 3;
  t: number; wait: number;
  chans: Channeler[];
  on: boolean;
  left: number; total: number;
  next: number; cursor: number;
  resets: number;
  done: boolean;
}

export function newFinale(def: FinaleDef): Finale {
  return { def, phase: 0, t: 0, wait: 0, chans: [], on: false, left: def.frames, total: def.frames, next: 0, cursor: 0, resets: 0, done: false };
}

/** This hero is channeling: on a mark (or walking to one) and out of the party's play. Never swapped to, never trailing the leader. */
export const isChanneling = (s: S, h: Hero): boolean => s.finale !== null && s.finale.chans.some((c) => c.hero === h);

/** The channel is running: both stand on their marks, the clock counts and the waves come. */
export const channelOn = (s: S): boolean => s.finale !== null && s.finale.on && !s.finale.done;
