// Jingle and stinger data. Pure: times are in seconds, pitches are MIDI numbers, so Node tests can read them.
// All of it is original. The scare is the Hawkins motif played upside down.
import type { JingleId, StingerId } from '../../core/types.ts';
import type { Wave } from './types.ts';
import { note } from './theory.ts';
import { motifUpsideDown } from './motif.ts';

export interface CueNote {
  w: Wave;
  midi: number;
  /** Seconds from the start of the cue. */
  at: number;
  dur: number;
  vol: number;
  /** Slide to this pitch over the length of the note. */
  to?: number;
  vib?: boolean;
  /** Bell-like exponential decay instead of a held note. */
  ring?: boolean;
}

export interface CueHit {
  at: number;
  dur: number;
  vol: number;
  /** Noise shift register width and clock rate in Hz. */
  mode: 15 | 7;
  clock: number;
  filter: 'lowpass' | 'highpass' | 'bandpass';
  freq: number;
  freqEnd?: number;
  q?: number;
  /** Seconds the hit takes to swell up before it falls. */
  rise?: number;
}

export interface Cue {
  notes: CueNote[];
  hits: CueHit[];
  /** Seconds until the last sound is gone. */
  length: number;
  /** Seconds the music stays ducked. */
  duck: number;
  duckDb: number;
  /** Overall level, set so each cue peaks around 0.6 and sits above the music. */
  gain: number;
}

type Item = readonly [beat: number, len: number, pitch: string | number];

function line(bpm: number, w: Wave, vol: number, items: readonly Item[], extra: Partial<CueNote> = {}): CueNote[] {
  const beat = 60 / bpm;
  return items.map(([b, len, p]) => ({
    w, midi: typeof p === 'number' ? p : note(p), at: b * beat, dur: len * beat, vol, ...extra,
  }));
}

function cue(notes: CueNote[], hits: CueHit[] = [], duckDb = 6, gain = 1): Cue {
  const length = Math.max(0, ...notes.map((n) => n.at + n.dur + 0.1), ...hits.map((h) => h.at + h.dur));
  return { notes, hits, length, duck: Math.max(0.3, length - 0.2), duckDb, gain };
}

// ---- jingles ------------------------------------------------------------------------------

// Rising pentatonic run, a held chord, then sparkle on top.
const LEVEL_UP = cue([
  ...line(150, 'p25', 0.3, [[0, 0.25, 'C5'], [0.25, 0.25, 'E5'], [0.5, 0.25, 'G5'], [0.75, 0.25, 'A5'], [1, 0.25, 'C6'], [1.25, 0.25, 'E6']]),
  ...line(150, 'p25', 0.24, [[1.5, 2, 'G6']]),
  ...line(150, 'p50', 0.12, [[1.5, 2, 'C6']]),
  ...line(150, 'tri', 0.3, [[0, 3.5, 'C3']]),
  ...line(150, 'p12', 0.12, [[2.25, 0.2, 'C7'], [2.45, 0.2, 'E7'], [2.65, 0.2, 'G7'], [2.85, 0.5, 'C7']], { ring: true }),
], [], 6, 0.85);

// A triad climbing, answered by one high note and a bell on top.
const RECRUIT = cue([
  ...line(100, 'p50', 0.26, [[0, 0.5, 'G4'], [0.5, 0.5, 'C5'], [1, 0.5, 'E5'], [1.5, 1.5, 'G5']]),
  ...line(100, 'p25', 0.12, [[1.5, 1.5, 'E5']]),
  ...line(100, 'tri', 0.3, [[0, 3, 'C3']]),
  ...line(100, 'p12', 0.12, [[2, 0.5, 'C7']], { ring: true }),
], [], 6, 0.85);

// A short fanfare: two pickups, a leap, a turn and a held chord. Thirds underneath, bass below.
const CLEAR = cue([
  ...line(150, 'p50', 0.26, [[0, 0.5, 'G4'], [0.5, 0.5, 'G4'], [1, 1, 'C5'], [2, 0.5, 'E5'], [2.5, 0.5, 'D5'], [3, 0.5, 'E5'], [3.5, 2, 'G5']]),
  ...line(150, 'p25', 0.17, [[0, 0.5, 'E4'], [0.5, 0.5, 'E4'], [1, 1, 'A4'], [2, 0.5, 'C5'], [2.5, 0.5, 'B4'], [3, 0.5, 'C5'], [3.5, 2, 'E5']]),
  ...line(150, 'tri', 0.3, [[0, 2, 'C3'], [2, 1.5, 'F3'], [3.5, 2, 'C3']]),
], [], 6, 0.78);

// Four steps down the minor triad, and the last note sags a semitone as it fades.
const GAME_OVER = cue([
  ...line(84, 'p25', 0.24, [[0, 0.75, 'E5'], [0.75, 0.75, 'C5'], [1.5, 0.75, 'A4']]),
  ...line(84, 'p25', 0.24, [[2.25, 2.25, 'E4']], { to: note('Eb4'), vib: true }),
  ...line(84, 'tri', 0.3, [[0, 4.5, 'A2']]),
], [], 6, 0.9);

// Three bright pings climbing a fifth and an octave.
const ITEM = cue([
  ...line(180, 'p12', 0.2, [[0, 0.25, 'A5'], [0.25, 0.25, 'E6'], [0.5, 0.9, 'A6']], { ring: true }),
  ...line(180, 'tri', 0.2, [[0, 0.25, 'A4'], [0.25, 0.25, 'E5'], [0.5, 0.9, 'A5']]),
], [], 6, 1.1);

// A rattle that slows as the die settles, then a tock and a ding.
const RATTLE_AT = [0, 0.045, 0.095, 0.15, 0.215, 0.29, 0.38, 0.49, 0.62, 0.78, 0.96];
const DICE = cue(
  [
    ...line(120, 'tri', 0.3, [[2.25, 0.2, 'C6']]),
    ...line(120, 'p25', 0.22, [[2.4, 0.9, 'G6']], { ring: true }),
  ],
  RATTLE_AT.map((at, i) => ({
    at, dur: 0.03, vol: 0.34 - i * 0.015, mode: 7 as const, clock: 5000 + ((i * 1733) % 4000),
    filter: 'bandpass' as const, freq: 1800 + ((i * 977) % 1800), q: 2.5,
  })),
  6,
  1.15,
);

export const JINGLES: Record<JingleId, Cue> = {
  levelUp: LEVEL_UP, recruit: RECRUIT, clear: CLEAR, gameOver: GAME_OVER, item: ITEM, dice: DICE,
};

// ---- stingers -----------------------------------------------------------------------------

/**
 * The scare: the motif flipped around the tonic and snapped to D Phrygian, slowed down, with a ghost voice
 * a semitone above, a sinking drone and a rising noise swell. About three seconds.
 */
export const SCARE_PITCHES: readonly number[] = motifUpsideDown();
const SCARE_AT = [0, 0.46, 0.84, 1.22, 1.6, 1.96];
const SCARE_DUR = [0.42, 0.34, 0.34, 0.34, 0.34, 0.9];
const SCARE = cue(
  [
    ...SCARE_PITCHES.map((midi, i): CueNote => ({ w: 'p25', midi, at: SCARE_AT[i], dur: SCARE_DUR[i], vol: 0.26, vib: true })),
    ...SCARE_PITCHES.map((midi, i): CueNote => ({ w: 'p12', midi: midi + 1, at: SCARE_AT[i], dur: SCARE_DUR[i], vol: 0.14 })),
    { w: 'tri', midi: note('D3'), at: 0, dur: 2.8, vol: 0.3, to: note('A2') },
  ],
  [
    { at: 0.2, dur: 1.9, vol: 0.2, mode: 15, clock: 30000, filter: 'bandpass', freq: 300, freqEnd: 3500, q: 1.2, rise: 1.7 },
    { at: 1.96, dur: 0.6, vol: 0.5, mode: 15, clock: 5000, filter: 'lowpass', freq: 600, freqEnd: 120 },
  ],
  6,
  0.78,
);

export const STINGERS: Record<StingerId, Cue> = {
  scare: SCARE,
  // Mike: a bold open fifth and an octave on square, with a low root under it.
  mike: cue([
    ...line(200, 'p50', 0.26, [[0, 0.3, 'C4'], [0.3, 0.3, 'G4'], [0.6, 0.7, 'C5']]),
    ...line(200, 'tri', 0.25, [[0, 1.3, 'C3']]),
  ], [], 3, 0.85),
  // Dustin: a quick zigzag on the thin 12.5 percent pulse.
  dustin: cue(line(200, 'p12', 0.24, [[0, 0.2, 'G5'], [0.2, 0.2, 'D5'], [0.4, 0.2, 'G5'], [0.6, 0.5, 'B5']]), [], 3, 1.5),
  // Lucas: two low square knocks and a step up, with a click like a wrist rocket cocking.
  lucas: cue(
    line(200, 'p50', 0.26, [[0, 0.25, 'D3'], [0.33, 0.25, 'D3'], [0.66, 0.6, 'A3']]),
    [
      { at: 0, dur: 0.02, vol: 0.12, mode: 7, clock: 12000, filter: 'highpass', freq: 2500 },
      { at: 0.33, dur: 0.02, vol: 0.12, mode: 7, clock: 12000, filter: 'highpass', freq: 2500 },
    ],
    3,
    0.8,
  ),
  // Eleven: a soft triangle that climbs and shimmers.
  eleven: cue(
    [
      ...line(100, 'tri', 0.3, [[0, 0.25, 'E4']], { vib: true }),
      ...line(100, 'tri', 0.3, [[0.25, 0.9, 'B4']], { to: note('E5'), vib: true }),
    ],
    [{ at: 0.15, dur: 0.6, vol: 0.12, mode: 15, clock: 30000, filter: 'bandpass', freq: 2000, freqEnd: 5000, q: 2, rise: 0.4 }],
    3,
  ),
  // Will: three soft triangle notes, a question and no answer. G up to D, then B flat held and sagging a
  // semitone to A, the way the motif's flat second hangs. Triangle only, no noise, and under a second.
  will: cue([
    ...line(140, 'tri', 0.28, [[0, 0.5, 'G4'], [0.5, 0.5, 'D5']]),
    ...line(140, 'tri', 0.28, [[1, 1, 'Bb4']], { to: note('A4'), vib: true }),
  ], [], 3, 0.9),
  // Max: quick and dry. A C minor seventh run up the 25 percent pulse in a quarter of a second, each note a short
  // pluck with no sustain and no bass under it, and a click on the first like a board popping off the ground.
  max: cue(
    [
      ...line(220, 'p25', 0.3, [[0, 0.3, 'C5'], [0.3, 0.3, 'Eb5'], [0.6, 0.3, 'G5']], { ring: true }),
      ...line(220, 'p25', 0.3, [[0.9, 0.7, 'Bb5']], { ring: true }),
    ],
    [{ at: 0, dur: 0.02, vol: 0.14, mode: 7, clock: 12000, filter: 'highpass', freq: 3000 }],
    3,
    1.07,
  ),
  // Steve: warm and a little goofy. The first note scoops up a major third like a hair flip, then A and a held D
  // with a late wobble, all on the mid square, with a triangle bass under it for the warmth.
  steve: cue([
    ...line(170, 'p50', 0.24, [[0, 0.5, 'D4']], { to: note('F#4') }),
    ...line(170, 'p50', 0.24, [[0.5, 0.5, 'A4']]),
    ...line(170, 'p50', 0.24, [[1, 1.1, 'D5']], { vib: true }),
    ...line(170, 'tri', 0.26, [[0, 2.1, 'D3']]),
  ], [], 3, 0.8),
};
