// What the final boss's two bodies keep beyond the shared records (docs/level-16.md, stage 5.3): Vecna's moves and orbs, and the Mind Flayer's
// chest. One record for both; each uses its own fields. Every other enemy has `fin: null`.
import type { EnemyKind } from '../core/types.ts';
import type { Proj } from '../combat/state.ts';

/** What Vecna is doing (enemies/vecna5.ts). walk: closing on the hero or circling him. blast: the warning ring before the blast. orb: the cast before the orb. recover: after either. */
export type VecnaMove = 'walk' | 'blast' | 'orb' | 'recover';

export interface FinState {
  /** Vecna: the move and the frames left in it, the frames until the next blast and the next orb, the way he circles (1 or -1), and his orbs in flight. */
  move: VecnaMove; t: number; blastCd: number; orbCd: number; side: 1 | -1; orbs: Proj[];
  /** The Mind Flayer: the frames its chest has left open, 0 when it is shut. */
  open: number;
}

/** The record a freshly built enemy of `kind` starts with, or null for a kind that has none. */
export function newFin(kind: EnemyKind): FinState | null {
  if (kind !== 'vecna5' && kind !== 'flayer5') return null;
  return { move: 'walk', t: 0, blastCd: 60, orbCd: 150, side: 1, orbs: [], open: 0 };
}
