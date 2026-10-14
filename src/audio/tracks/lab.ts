// The Lab: stage 1.2. E minor, 104 bpm, 32 bars, and every fourth bar is 7/8 (fourteen sixteenths), so the
// pulse limps once a phrase. The base layer is a tight triangle pulse, sparse metallic stabs, a noise clock
// and, from bar five, a klaxon: two pulse notes a minor third apart that alternate (a tritone over the
// diminished chord). The combat layer adds a driving bass, noise drums and more stabs. Five voices in all:
// the stabs share p1 between layers and the noise slot is shared too, so their steps are chosen to never
// touch. Kick and open hat ring 0.15 s but a step is 0.144 s, so nothing sits on the step after a kick.
// Original: no arpeggio, nothing near the show's theme.
import type { BassNotes } from './theory.ts';
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { arpBars, bassBars, grid, hit, note } from './theory.ts';

const BARS = 32;
// Every fourth bar is 7/8: seven eighths, fourteen sixteenths.
const BAR_STEPS: readonly number[] = Array.from({ length: BARS }, (_, bar) => (isShort(bar) ? 14 : 16));
function isShort(bar: number): boolean { return bar % 4 === 3; }
/** The last bar of each eight: the turnaround. */
function isTurn(bar: number): boolean { return bar % 8 === 7; }

// Eight four-bar blocks. The 7/8 bar closes each one. Bar 16 is a half cadence on B, bar 32 the same
// chord leading the loop back to Em. The F sharp diminished bars are where the klaxon turns to a tritone.
const HARMONY: readonly string[] = [
  'Em', 'Em', 'C', 'Em',
  'Em', 'C', 'Am', 'D',
  'Em', 'Em', 'C', 'D',
  'Em', 'C', 'Am', 'B',
  'Em', 'Em', 'Am', 'Em',
  'C', 'D', 'Em', 'F#dim',
  'Em', 'C', 'D', 'Em',
  'Am', 'C', 'F#dim', 'B',
];

const BASS: Inst = { wave: 'tri', vol: 0.24, env: { a: 0.004, d: 0, s: 1, r: 0.03 }, gate: 0.7 };
const DRIVE: Inst = { wave: 'p25', vol: 0.28, env: { a: 0.002, d: 0.12, s: 0.6, r: 0.03 }, gate: 0.7 };
const STAB: Inst = { wave: 'p12', vol: 0.15, env: { a: 0.002, d: 0.09, s: 0, r: 0.03 }, gate: 0.6, send: 0.55 };
const STAB_HI: Inst = { ...STAB, vol: 0.17 };
const KLAXON: Inst = { wave: 'p50', vol: 0.13, env: { a: 0.004, d: 0, s: 1, r: 0.03 }, gate: 0.85 };

// ---- base: bass. A 3 + 3 + 2 pulse, then 3 + 3 in the 7/8 bar: the same figure with its last note cut off.
// The fifth over F sharp diminished is C, six semitones up, so that chord gets its own offset.
function bassNotes(bar: number): BassNotes {
  const f = HARMONY[bar].endsWith('dim') ? 6 : 7;
  if (isShort(bar)) return [[0, 2, 0], [3, 2, 0], [6, 2, 12], [8, 2, 0], [11, 3, f]];
  if (bar % 4 === 2) return [[0, 2, 0], [3, 2, 0], [6, 2, 12], [8, 2, 0], [11, 2, f], [14, 2, 12]];
  return [[0, 2, 0], [3, 2, 0], [6, 2, 12], [8, 2, 0], [11, 2, 0], [14, 2, f]];
}
const bass = bassBars(HARMONY, { range: [38, 50], notes: bassNotes });

// ---- combat: driving eighths an octave up, with octave pops on the second and fourth beats.
function driveNotes(bar: number): BassNotes {
  const f = HARMONY[bar].endsWith('dim') ? 6 : 7;
  if (isShort(bar)) return [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 0], [10, 2, 0], [12, 2, f]];
  return [[0, 2, 0], [2, 2, 0], [4, 2, 12], [6, 2, 0], [8, 2, 0], [10, 2, 0], [12, 2, 12], [14, 2, f]];
}
const drive = bassBars(HARMONY, { range: [50, 62], notes: driveNotes });

// ---- base: the klaxon. The minor third inside each chord, high note first. Over F sharp diminished it is
// the tritone, C against F sharp. Silent for the first four bars and again at bars 17 and 18.
const KLAXON_PAIRS: Record<string, readonly [string, string]> = {
  Em: ['G5', 'E5'], C: ['G5', 'E5'], Am: ['C6', 'A5'], D: ['A5', 'F#5'],
  'F#dim': ['C6', 'F#5'], B: ['F#5', 'D#5'],
};
function klaxonBar(bar: number): NoteEv[] {
  if (bar < 4 || bar === 16 || bar === 17) return [];
  const [hi, lo] = KLAXON_PAIRS[HARMONY[bar]].map(note);
  const pick = (i: number): number => (i % 2 === 0 ? hi : lo);
  // The turnaround bars run seven eighths, one per beat of the 7/8.
  if (bar === 15 || bar === 23 || bar === 31) {
    return [0, 2, 4, 6, 8, 10, 12].map((step, i) => ({ step, len: 2, midi: pick(i), vel: 1 }));
  }
  const steps = isShort(bar) ? [0, 4, 8, 11] : [0, 4, 8, 12];
  const lens = isShort(bar) ? [4, 4, 3, 3] : [4, 4, 4, 4];
  return steps.map((step, i) => ({ step, len: lens[i], midi: pick(i), vel: 1 }));
}
const klaxon = Array.from({ length: BARS }, (_, bar) => klaxonBar(bar));

// ---- stabs. Base and combat share p1, so combat stabs sit at least two steps from the base ones.
// Indexes pick chord tones inside the window and clamp at the top.
const BASE_STEPS = [[10], [6, 13], [3, 10], [5, 10]] as const;
const BASE_IDX: readonly (readonly number[])[] = [[2], [1, 3], [3, 1], [2, 0], [1], [3, 2], [2, 4], [3, 1]];
const BASE_VEL = [0.9, 0.7];
const COMBAT_STEPS = [[2, 5, 13], [2, 9, 15], [1, 6, 13], [2, 8, 12]] as const;
const COMBAT_IDX: readonly (readonly number[])[] = [
  [1, 2, 3], [2, 3, 1], [3, 1, 2], [2, 3, 2], [3, 2, 1], [1, 3, 2], [2, 1, 3], [3, 2, 3],
];
const stabs = (steps: readonly (readonly number[])[], idx: readonly (readonly number[])[], win: readonly [number, number], vel: readonly number[]) =>
  HARMONY.map((sym, bar) =>
    arpBars([sym], { win, steps: steps[bar % 4], idx: idx[bar % 8], len: 1.5, vel })[0]);
const baseStabs = stabs(BASE_STEPS, BASE_IDX, [72, 88], BASE_VEL);
const combatStabs = stabs(COMBAT_STEPS, COMBAT_IDX, [79, 93], [0.85, 0.75, 0.85]);

// ---- base: the clock. A tick and a tock between the kicks. The tock moves up a step in the 7/8 bar.
const ticks: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => [hit(3, 'tick', 0.6), hit(isShort(bar) ? 12 : 11, 'tock', 0.6)]);

// ---- combat: drums. Kicks on 0, 6, 8 and 14, snares on the backbeat, hats on the steps the kicks leave free.
const groove = grid({ kick: 'X.....x.X.....x.', snare: '....X.......X...', hat: '..x..o....x..o..' });
const grooveShort = grid({ kick: 'X.....x.X.....', snare: '....X......X..', hat: '..x..o....x..o' });
const fill = grid({ kick: 'X.............', snare: '....x.x.x.xx.X', hat: '..x...........' });
const drums: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (isTurn(bar) ? fill : isShort(bar) ? grooveShort : groove));

export const LAB: Track = {
  id: 'lab',
  title: 'The Lab',
  bpm: 104,
  tonic: 'E',
  mode: 'minor',
  // 3 is D sharp: the third of the B major bars (16 and 32), the leading tone that pulls back to E minor.
  chromatic: [3],
  bars: BARS,
  barSteps: BAR_STEPS,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.38, mix: 0.4, cutoff: 3000 },
  channels: [
    { slot: 'tri', layer: 'base', inst: BASS, bars: bass },
    { slot: 'p1', layer: 'base', inst: STAB, bars: baseStabs },
    { slot: 'p3', layer: 'base', inst: KLAXON, bars: klaxon },
    { slot: 'noi', layer: 'base', bars: ticks },
    { slot: 'p2', layer: 'combat', inst: DRIVE, bars: drive },
    { slot: 'p1', layer: 'combat', inst: STAB_HI, bars: combatStabs },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
