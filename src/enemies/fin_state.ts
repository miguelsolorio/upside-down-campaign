// What the final boss's Mind Flayer keeps beyond the shared records (docs/level-16.md, stage 5.3): its chest. Every other enemy has `fin: null`.
// (Phase one's Vecna is chapter 4's, with his own record: combat/vecna_state.ts.)
import type { EnemyKind } from '../core/types.ts';

export interface FinState {
  /** The Mind Flayer: the frames its chest has left open, 0 when it is shut. */
  open: number;
}

/** The record a freshly built enemy of `kind` starts with, or null for a kind that has none. */
export function newFin(kind: EnemyKind): FinState | null {
  return kind === 'flayer5' ? { open: 0 } : null;
}
