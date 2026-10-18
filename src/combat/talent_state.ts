// What the Lv 6 and Lv 9 talents keep between frames, kept apart from state.ts so the sim state stays readable. S.t6 holds one of
// these. The talents themselves are in src/heroes (rally.ts, dart.ts, camo.ts, sensory.ts, cleric.ts, ahoy.ts, molotov.ts, and for
// Lv 9 oath.ts, cerebro.ts, hive.ts, extralife.ts and talents9.ts). A once-a-stage flag lives here too: the sim is built afresh for
// every stage and every retry, and getting up after a wipe (healParty) calls resetTalentState, so each starts them unspent.
import type { Dir, HeroId } from '../core/types.ts';

/** Dustin's Dart while he is out (heroes/dart.ts). `target` is the uid he is after, -1 for none. */
export interface Pet { x: number; y: number; dir: Dir; age: number; life: number; bite: number; target: number; t: number }

/** Steve's Ahoy leap while it flies (heroes/ahoy.ts): from (sx, sy) to (tx, ty), `t` of `n` frames. */
export interface Leap { sx: number; sy: number; tx: number; ty: number; t: number; n: number }

export interface TalentState {
  /** Frames of Mike's Rally left: the party's ATK is up. */
  rally: number;
  /** Dustin's Dart while he is out, and frames until a spray can call him again. */
  dart: Pet | null; dartRest: number;
  /** Frames of Lucas's Camo left, and frames until a Triple shot can hide him again. */
  camo: number; camoCd: number;
  /** Frames of Eleven's Sensory tank left. */
  sense: number;
  /** Frames until Will's Cleric heal can be cast again. */
  healCd: number;
  /** Steve's Ahoy leap while it flies. */
  leap: Leap | null;
  /** Mike's Oath: sworn (the stage's one is spent), and the ally to raise with the frames left before they stand. */
  oath: boolean; oathFor: HeroId | null; oathT: number;
  /** Dustin's Cerebro, Max's Extra life: spent for the stage. */
  cerebro: boolean; extra: boolean;
  /** Frames of Will's Hive link left. */
  hive: number;
  /** King Steve and Final girl are up, so their floaters show once per spell, not every frame. */
  king: boolean; girl: boolean;
}

export function newTalentState(): TalentState {
  return {
    rally: 0, dart: null, dartRest: 0, camo: 0, camoCd: 0, sense: 0, healCd: 0, leap: null,
    oath: false, oathFor: null, oathT: 0, cerebro: false, extra: false, hive: 0, king: false, girl: false,
  };
}

/** Getting up after a wipe: what was in flight goes, and the timers start over. */
export function resetTalentState(t: TalentState): void {
  Object.assign(t, newTalentState());
}
