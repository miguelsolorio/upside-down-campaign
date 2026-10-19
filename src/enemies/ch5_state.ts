// What chapter 5's shield carriers and twins keep beyond the Demogorgon's state (docs/level-14.md, docs/level-15.md). One record for the
// trooper, the Commander and the twin; each uses its own fields and leaves the rest alone. Every other enemy has `ch5: null`.
import type { EnemyKind } from '../core/types.ts';

/**
 * What a trooper is doing (enemies/trooper.ts). walk: closing on the hero or holding its band, shield up. wind: the "!" before the burst.
 * fire: the burst, one round every few frames along the aim locked when the wind-up ended. butt: the rifle-butt wind-up. recover: after
 * either. flank: walking round to the hero's side.
 */
export type TroopMove = 'walk' | 'wind' | 'fire' | 'butt' | 'recover' | 'flank';

export interface Ch5State {
  /** A trooper's or the Commander's shield has been broken for good by a smash, and the smashes it has taken so far. */
  gone: boolean; smashes: number;
  /** Trooper only: the move and its frames left, the rounds of the burst still to fire, the aim locked for it, the side it walks round
   *  to (1 or -1), and the frames until the next butt. */
  move: TroopMove; t: number; shots: number; aim: number; side: 1 | -1; buttCd: number;
  /** Commander only: frames until the next whistle, and whether the shield has cracked (below half HP). */
  whistleCd: number; cracked: boolean;
  /** Twin only: the second one of the pair (gfx tints it), enraged by its mate's death, the charges it has launched (the pair take turns
   *  by count), the frames it has held the turn without charging, and the HP its dead mate had (the boss bar's share of it). */
  second: boolean; enraged: boolean; charges: number; waitT: number; mateMax: number;
}

/** The record a freshly built enemy of `kind` starts with, or null for a kind that has none. `second` is for a twin: another twin is already up. */
export function newCh5(kind: EnemyKind, second: boolean, whistleFirst: number): Ch5State | null {
  if (kind !== 'trooper' && kind !== 'commander' && kind !== 'twin') return null;
  return {
    gone: false, smashes: 0, move: 'walk', t: 0, shots: 0, aim: 0, side: 1, buttCd: 0,
    whistleCd: whistleFirst, cracked: false, second: kind === 'twin' && second, enraged: false, charges: 0, waitT: 0, mateMax: 0,
  };
}
