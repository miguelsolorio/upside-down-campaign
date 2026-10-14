// Puzzle hints. The hint shows the moment someone tries a puzzle with the wrong hero: swings or fires at its prop, or
// at the gate or door it opens, or pushes against it. For a party that is stuck and tries nothing, a puzzle also
// starts counting once its arrival beat has finished, time spent near the prop without solving it adds up, and at
// 5 seconds the hint shows anyway. Pure logic with no DOM, so Node can run it. The play scene feeds it the director,
// the props and the hero every tick, and the sim's `poked` events as they come.
import type { HeroId, PropView, Vec2 } from '../core/types.ts';
import type { PuzzleDef } from './types.ts';

/** 5 seconds at the sim's fixed 60 Hz. Short, since with skip story on the hint is the only explanation. */
export const HINT_AFTER = 5 * 60;
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
  /**
   * A hero tried a prop (the sim's `poked` event). If it is a puzzle's own prop or the gate or door that puzzle opens,
   * and the hero is not the one who solves it, the hint shows from now on, until the puzzle is solved.
   */
  poke(propId: string, hero: HeroId): void;
  /** Forget all progress, for a retry or a load. */
  reset(): void;
  /** The puzzle to give a hint for now: unsolved, and either tried with the wrong hero or 5 seconds spent near it. */
  highlight(): PuzzleDef | null;
  /** The prop the party tried for this puzzle, when the hint came from an attempt: the door or gate, say. Else null. */
  triedProp(def: PuzzleDef): string | null;
}

/** Same test the play scene uses to carry a prop across a retry. */
export const isSolved = (p: PropView): boolean => p.state === 'open' || p.state === 'lit';

/** The hero is at the puzzle: the clock counts, and the play scene shows the hint subtitle. */
export const isNear = (p: PropView, hero: Vec2): boolean => Math.hypot(hero.x - (p.x + p.w / 2), hero.y - (p.y + p.h / 2)) <= NEAR_PX;

export function createPuzzleTracker(defs: readonly PuzzleDef[]): PuzzleTracker {
  /** Frames each puzzle has been armed, unsolved and near. Keyed by puzzle id. */
  const spent = new Map<string, number>();
  const live = new Map<string, PuzzleDef>();
  /** Puzzle id to the prop someone tried it on with the wrong hero. */
  const tried = new Map<string, string>();

  return {
    tick(s) {
      live.clear();
      for (const d of defs) {
        const prop = s.props.find((p) => p.id === d.prop);
        if (!prop || isSolved(prop) || s.busy || !s.hasFired(d.beat)) continue;
        live.set(d.id, d);
        if (isNear(prop, s.hero)) spent.set(d.id, (spent.get(d.id) ?? 0) + 1);
      }
    },
    poke(propId, hero) {
      for (const d of defs) {
        if (hero !== d.hero && (propId === d.prop || d.blocks?.includes(propId))) tried.set(d.id, propId);
      }
    },
    reset() { spent.clear(); live.clear(); tried.clear(); },
    highlight() {
      for (const d of defs) if (live.has(d.id) && (tried.has(d.id) || (spent.get(d.id) ?? 0) >= HINT_AFTER)) return d;
      return null;
    },
    triedProp: (d) => tried.get(d.id) ?? null,
  };
}
