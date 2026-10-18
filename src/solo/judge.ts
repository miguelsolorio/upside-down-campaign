// The judge of the Hellfire solo: which note a press hit, when a note is missed, the streak and the ring. Pure: no DOM, no
// clock. The caller owns the frame counter and hands the frame in, so a test, the bot and the scene all judge the same way.
// The owner's calls (docs/chapter-4.md): a press within 6 frames of a note is a hit and within 2 a perfect, a note whose
// window has passed is a miss, a press on an empty lane costs nothing, a hit widens the ring and a miss shrinks it a step,
// and three misses in a row cut the solo short.
import type { Chart, ChartNote, Lane } from './chart.ts';

export const HIT_WINDOW = 6;
export const PERFECT_WINDOW = 2;
export const MAX_MISSES = 3;
/** The ring starts at step 2, a hit widens it a step, a perfect two, a miss shrinks it a step. Steps run 0 to RING_MAX. */
export const RING_START = 2;
export const RING_MAX = 8;
/** The sound ring's radius in game px for a ring step: 20 px at step 0 to 52 px at the widest. */
export const ringRadius = (step: number): number => 20 + 4 * Math.max(0, Math.min(RING_MAX, step));

export type Verdict = 'perfect' | 'hit' | 'empty';
/** How a note stands: waiting, hit, hit on the beat, or gone by. */
export type NoteState = 'pending' | 'hit' | 'perfect' | 'miss';
/** finished: the song played out. feedback: three misses in a row. quit: the caller stopped it. */
export type EndReason = 'finished' | 'feedback' | 'quit';

export interface SoloResult {
  reason: EndReason;
  /** Gems in the chart, and how many were judged before the solo ended. */
  notes: number;
  played: number;
  hits: number;
  perfects: number;
  misses: number;
  bestStreak: number;
  /** The ring step it ended on. */
  ring: number;
  /** Hits (perfects included) over the gems in the chart, 0 to 1. */
  accuracy: number;
  /** Frames the solo ran, from the first note's frame zero. */
  frames: number;
}

export interface Judge {
  readonly chart: Chart;
  readonly streak: number;
  readonly bestStreak: number;
  readonly ring: number;
  readonly hits: number;
  readonly perfects: number;
  readonly misses: number;
  readonly missesInRow: number;
  /** Three misses in a row: nothing is judged after this. */
  readonly ended: boolean;
  /** A press on a lane at `frame`. The nearest waiting gem in the lane within the hit window is struck. */
  press(lane: Lane, frame: number): Verdict;
  /** Notes whose window has passed by `frame` become misses. Returns the lane of each note missed this call, in order. */
  advance(frame: number): Lane[];
  stateOf(i: number): NoteState;
  result(reason: EndReason, frames: number): SoloResult;
}

const PENDING = 0, HIT = 1, PERFECT = 2, MISS = 3;
const NAMES: readonly NoteState[] = ['pending', 'hit', 'perfect', 'miss'];

/** `maxMisses` is the misses in a row that end it: three by default, and Infinity for a song where a miss is only a miss. */
export function createJudge(chart: Chart, maxMisses = MAX_MISSES): Judge {
  const notes: readonly ChartNote[] = chart.notes;
  const state = new Uint8Array(notes.length);
  /** Every note before this one is settled, so a press or an advance never rescans them. */
  let lo = 0;
  let streak = 0, bestStreak = 0, ring = RING_START;
  let hits = 0, perfects = 0, misses = 0, missesInRow = 0;
  let ended = false;

  const settle = (): void => { while (lo < notes.length && state[lo] !== PENDING) lo++; };

  const j: Judge = {
    chart,
    get streak() { return streak; },
    get bestStreak() { return bestStreak; },
    get ring() { return ring; },
    get hits() { return hits; },
    get perfects() { return perfects; },
    get misses() { return misses; },
    get missesInRow() { return missesInRow; },
    get ended() { return ended; },

    press(lane, frame) {
      if (ended) return 'empty';
      let best = -1, bestD = HIT_WINDOW + 1;
      for (let i = lo; i < notes.length; i++) {
        const n = notes[i] as ChartNote;
        if (n.frame - frame > HIT_WINDOW) break;
        if (state[i] !== PENDING || n.lane !== lane) continue;
        const d = Math.abs(n.frame - frame);
        // The earlier note wins a tie, so a press between two notes in a lane takes the one that is passing.
        if (d < bestD) { best = i; bestD = d; }
      }
      if (best < 0) return 'empty';
      const perfect = bestD <= PERFECT_WINDOW;
      state[best] = perfect ? PERFECT : HIT;
      hits++;
      if (perfect) perfects++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      missesInRow = 0;
      ring = Math.min(RING_MAX, ring + (perfect ? 2 : 1));
      settle();
      return perfect ? 'perfect' : 'hit';
    },

    advance(frame) {
      const missed: Lane[] = [];
      if (ended) return missed;
      for (let i = lo; i < notes.length; i++) {
        const n = notes[i] as ChartNote;
        if (n.frame + HIT_WINDOW >= frame) break;
        if (state[i] !== PENDING) continue;
        state[i] = MISS;
        misses++;
        missed.push(n.lane);
        streak = 0;
        missesInRow++;
        ring = Math.max(0, ring - 1);
        if (missesInRow >= maxMisses) { ended = true; break; }
      }
      settle();
      return missed;
    },

    stateOf: (i) => NAMES[state[i] as number] as NoteState,

    result(reason, frames) {
      const played = hits + misses;
      return {
        reason, notes: notes.length, played, hits, perfects, misses, bestStreak, ring,
        accuracy: notes.length ? hits / notes.length : 1, frames,
      };
    },
  };
  return j;
}
