// The note charts of the Hellfire solo (docs/chapter-4.md, "The Hellfire solo as a note highway"). Pure: no DOM.
// A chart is read off the `solo` track's lead line (src/audio/tracks/solo.ts), so the highway can't drift from the music.
// Every lead note two sixteenths or longer is a gem; a note of one sixteenth is a flourish that sounds and is never charted.
// A gem's frame is the lead note's onset in 60 fps frames from the start of its section (the track runs 150 bpm, so a
// sixteenth is exactly 6 frames), and its lane is its pitch: low notes on Attack, the middle on Special, the high on Crit.
import { compile } from '../audio/tracks/compile.ts';
import { SOLO, SOLO_SECTIONS } from '../audio/tracks/solo.ts';
import type { Track } from '../audio/tracks/types.ts';
import { FPS } from '../core/config.ts';

/** 0 Attack (red), 1 Special (blue), 2 Crit (gold). */
export type Lane = 0 | 1 | 2;
export const LANE_COUNT = 3;
export const LANE_NAMES = ['attack', 'special', 'crit'] as const;

/** Lead notes below the first split are Attack, below the second Special, the rest Crit: D5 and under, E5 to A5, B5 and up. */
export const LANE_SPLIT: readonly [number, number] = [75, 83];
/** A lead note at least this many sixteenths long is a gem. */
export const GEM_STEPS = 2;
/** Frames in a beat of the track (24): the highway draws a fret wire on each. */
export const BEAT_FRAMES = Math.round((FPS * 60) / SOLO.bpm);

export const laneOf = (midi: number): Lane => (midi < LANE_SPLIT[0] ? 0 : midi < LANE_SPLIT[1] ? 1 : 2);

export interface ChartNote { lane: Lane; frame: number }

export type ChartId = keyof typeof SOLO_SECTIONS;

export interface Chart {
  id: ChartId;
  /** The section of the `solo` track that sounds under it: its first bar and how many bars. */
  bar: number;
  bars: number;
  /** Frames in the section. The last gem is at least a hit window before this. */
  length: number;
  /** In frame order, then lane order. */
  notes: readonly ChartNote[];
}

/** The chart for one section of a track, from its lead line (the first pulse slot). */
export function chartOf(track: Track, id: ChartId, section: { bar: number; bars: number }): Chart {
  const c = compile(track);
  const from = c.starts[section.bar], to = c.starts[section.bar + section.bars];
  const toFrame = (steps: number): number => Math.round(steps * c.stepSec * FPS);
  const notes: ChartNote[] = c.notes
    .filter((n) => n.slot === 'p1' && n.abs >= from && n.abs < to && n.gate / (n.inst?.gate ?? 1) >= GEM_STEPS - 1e-9)
    .map((n) => ({ lane: laneOf(n.midi), frame: toFrame(n.abs - from) }));
  notes.sort((a, b) => a.frame - b.frame || a.lane - b.lane);
  return { id, bar: section.bar, bars: section.bars, length: toFrame(to - from), notes };
}

/** Eddie's special: a 6 s solo of 11 notes. */
export const riff: Chart = chartOf(SOLO, 'riff', SOLO_SECTIONS.riff);
/** The 4.3 rooftop: a 64 s song of about 150 notes that gets denser. */
export const rooftop: Chart = chartOf(SOLO, 'rooftop', SOLO_SECTIONS.rooftop);
export const CHARTS: Record<ChartId, Chart> = { riff, rooftop };
