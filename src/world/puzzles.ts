// The puzzle hint clock. A puzzle starts counting once its arrival beat has finished; time spent near the prop
// without solving it adds up, and at 30 seconds the play scene highlights the prop. Pure logic with no DOM,
// so Node can run it. The play scene feeds it the director, the props and the hero every tick.
import type { PropView, Vec2 } from '../core/types.ts';
import type { PuzzleDef } from './types.ts';

/** 30 seconds at the sim's fixed 60 Hz. */
export const HINT_AFTER = 30 * 60;
/** The only words a hint ever shows. It says where to look, never which hero or which key. */
export const HINT_NUDGE = 'TRY CHANGING CHARACTERS';
/** The hero counts as "at" the puzzle within this many px of the prop's center, about a screen's reach. */
export const NEAR_PX = 150;

export interface PuzzleTick {
  /** Has this beat fired. */
  hasFired(beat: string): boolean;
  /** A beat has steps left or is waiting on a dialogue or the scare. */
  busy: boolean;
  props: readonly PropView[];
  /** The active hero's feet position in px. */
  hero: Vec2;
}

export interface PuzzleTracker {
  tick(s: PuzzleTick): void;
  /** Forget all progress, for a retry or a load. */
  reset(): void;
  /** The puzzle to highlight now: unsolved with 30 seconds spent near it. */
  highlight(): PuzzleDef | null;
}

/** Same test the play scene uses to carry a prop across a retry. */
export const isSolved = (p: PropView): boolean => p.state === 'open' || p.state === 'lit';

export function createPuzzleTracker(defs: readonly PuzzleDef[]): PuzzleTracker {
  /** Frames each puzzle has been armed, unsolved and near. Keyed by puzzle id. */
  const spent = new Map<string, number>();
  const live = new Map<string, PuzzleDef>();

  const first = (pick: (t: number) => boolean): PuzzleDef | null => {
    for (const d of defs) if (live.has(d.id) && pick(spent.get(d.id) ?? 0)) return d;
    return null;
  };

  return {
    tick(s) {
      live.clear();
      for (const d of defs) {
        const prop = s.props.find((p) => p.id === d.prop);
        if (!prop || isSolved(prop) || s.busy || !s.hasFired(d.beat)) continue;
        live.set(d.id, d);
        const near = Math.hypot(s.hero.x - (prop.x + prop.w / 2), s.hero.y - (prop.y + prop.h / 2)) <= NEAR_PX;
        if (near) spent.set(d.id, (spent.get(d.id) ?? 0) + 1);
      }
    },
    reset() { spent.clear(); live.clear(); },
    highlight: () => first((t) => t >= HINT_AFTER),
  };
}
