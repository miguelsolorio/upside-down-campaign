// The Upside Down: D Phrygian, 66 bpm, 32 bars. The title tune turned over: every phrase of Static's lead
// goes through flipBars(), which is invert(motif, axis, scale) with the axis on the tonic, so the melody is
// literally the title tune upside down, snapped to Phrygian. Two pulse voices play it a few cents apart and
// beat against each other. A triangle drone sits under it and a gust of noise wind breathes once a bar.
// Base: drone, the detuned pair, wind. Combat: a sixteenth-note pump on the third pulse slot and a stomp on
// the noise slot that only starts after the gust has died (step eight), so the two never touch.
// Five voices at most: the layers share only the noise slot. Original.
import type { BassNotes } from './theory.ts';
import type { DrumEv, Inst, NoteEv, Track } from './types.ts';
import { bassBars, cat, ev, grid, hit, rest, rootNear } from './theory.ts';
import { ANSWER, CADENCE, D_PHRYGIAN, LONGS, MOTIF_AXIS, flipBars, motifBars, shiftBars } from './motif.ts';

const BARS = 32;

// Eight four-bar blocks. Dm to Eb is the Phrygian sigh. A diminished leads back to Dm, and the loop ends
// on C, which falls straight onto the Dm at bar one. Every chord is built from D Phrygian tones.
const HARMONY: readonly string[] = [
  'Dm', 'Dm', 'Eb', 'Dm',
  'Dm', 'Eb', 'Bb', 'Adim',
  'Dm', 'Eb', 'Dm', 'Csus2',
  'Gm', 'Bbmaj7', 'Eb', 'Adim',
  'Eb', 'Dm7', 'Bb', 'Adim',
  'Gm7', 'Bbmaj7', 'Dm', 'Csus2',
  'Dm', 'Eb', 'Bb', 'Adim',
  'Dm', 'Eb', 'Gm', 'Csus2',
];

const DRONE: Inst = {
  wave: 'tri', vol: 0.2, env: { a: 0.03, d: 0, s: 1, r: 0.06 }, gate: 0.98,
  vib: { rate: 0.45, cents: 8, delay: 1.5 },
};
// The pair: the same line twice, nine cents flat and nine cents sharp, with vibratos that drift apart.
const LEAD_FLAT: Inst = {
  wave: 'p25', vol: 0.15, env: { a: 0.02, d: 0.2, s: 0.7, r: 0.25 }, gate: 0.95,
  vib: { rate: 4.4, cents: 16, delay: 0.5 }, detune: -9, send: 0.5,
};
const LEAD_SHARP: Inst = {
  wave: 'p25', vol: 0.15, env: { a: 0.02, d: 0.2, s: 0.7, r: 0.25 }, gate: 0.95,
  vib: { rate: 5.1, cents: 16, delay: 0.7 }, detune: 9, send: 0.5,
};
const PUMP: Inst = { wave: 'p25', vol: 0.3, env: { a: 0.002, d: 0.14, s: 0.6, r: 0.03 }, gate: 0.8 };

// ---- base: the drone. A root and a fifth on even bars, one long root on odd bars. Over A diminished the
// fifth is E flat, six semitones up. A plain fifth would be E, which is not in the mode.
function droneNotes(bar: number): BassNotes {
  const fifth = HARMONY[bar].endsWith('dim') ? 6 : 7;
  return bar % 2 === 0 ? [[0, 12, 0], [12, 4, fifth]] : [[0, 16, 0]];
}
const drone = bassBars(HARMONY, { range: [36, 48], notes: droneNotes });

// ---- base: the lead pair. Static's phrases, flipped around D. Silent for four bars, then the motif and its
// answer, the motif and a falling cadence flipped into a rising one, a ghost an octave up, two long notes,
// and so on, closing on the motif and two long notes that hang over the seam.
const flip = (bars: NoteEv[][]): NoteEv[][] => flipBars(bars, MOTIF_AXIS, D_PHRYGIAN);
const motif = flip(motifBars());
const answer = flip(ANSWER);
const cadence = flip(CADENCE);
const longs = flip(LONGS);
const ghost = shiftBars(motif, 12);
const closing: NoteEv[][] = [[ev(0, 15, 'Bb4')], [ev(0, 15, 'G4')]];

const leadFlat = cat(
  rest<NoteEv>(4), motif, answer, motif, cadence, rest<NoteEv>(4), longs, answer, motif, cadence, motif, answer, motif, closing,
);
// The sharp voice is the same line, except that in the fourth block it plays alone, an octave up.
const leadSharp = cat(
  rest<NoteEv>(4), motif, answer, motif, cadence, ghost, rest<NoteEv>(2), longs, answer, motif, cadence, motif, answer, motif, closing,
);

// ---- base: the wind. One gust a bar, strongest in the intro. It lasts 1.7 s, which is 7.5 steps at 66 bpm.
const GUST = [0.9, 0.55, 0.75, 0.5];
const wind: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => [hit(0, 'wind', bar < 4 ? 1 : GUST[bar % 4])]);

// ---- combat: the pump. Sixteenths, accented 3 + 3 + 3 + 3 + 2 + 2, with octave jumps and a fifth at the
// end. [step, semitones above the root, velocity]. The fifth over A diminished is six up.
const PUMP_PATTERN: readonly (readonly [number, number, number])[] = [
  [0, 0, 1], [1, 0, 0.6], [2, 0, 0.65], [3, 0, 0.95], [4, 12, 0.65], [5, 0, 0.6], [6, 0, 0.95], [7, 0, 0.65],
  [8, 12, 0.7], [9, 0, 0.95], [10, 0, 0.6], [11, 0, 0.65], [12, 12, 0.95], [13, 0, 0.6], [14, 0, 0.95], [15, 7, 0.7],
];
function pumpBars(): NoteEv[][] {
  let prev = 56;
  return HARMONY.map((sym) => {
    const root = rootNear(sym, prev, 50, 62);
    prev = root;
    const fifth = sym.endsWith('dim') ? 6 : 7;
    return PUMP_PATTERN.map(([step, off, vel]) => ({ step, len: 1, midi: root + (off === 7 ? fifth : off), vel }));
  });
}

// ---- combat: the stomp, after the gust. Kick, kick, snare, kick in the back half of each bar, and a snare
// run every fourth bar. The gust ends at step 7.5, so nothing here starts before step eight.
const stomp = grid({ kick: '........X..x..x.', snare: '............X...', hat: '.........o.....o' });
const run = grid({ kick: '........X.......', snare: '..........x.xxxX' });
const drums: DrumEv[][] = Array.from({ length: BARS }, (_, bar) => (bar % 4 === 3 ? run : stomp));

export const UPSIDE: Track = {
  id: 'upside',
  title: 'The Upside Down',
  bpm: 66,
  tonic: 'D',
  mode: 'phrygian',
  chromatic: [],
  bars: BARS,
  layers: ['base', 'combat'],
  harmony: HARMONY,
  echo: { beats: 0.75, feedback: 0.5, mix: 0.5, cutoff: 2200 },
  channels: [
    { slot: 'tri', layer: 'base', inst: DRONE, bars: drone },
    { slot: 'p1', layer: 'base', inst: LEAD_FLAT, bars: leadFlat },
    { slot: 'p2', layer: 'base', inst: LEAD_SHARP, bars: leadSharp },
    { slot: 'noi', layer: 'base', bars: wind },
    { slot: 'p3', layer: 'combat', inst: PUMP, bars: pumpBars() },
    { slot: 'noi', layer: 'combat', bars: drums },
  ],
};
