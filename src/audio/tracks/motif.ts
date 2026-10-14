// The Hawkins motif: six notes over two bars in D minor, defined here once.
// Static plays it as written. The scare stinger, the Upside Down and the Clock play it upside down through
// invert(). Hawkins plays the same degrees in F major.
import type { NoteEv, Scale } from './types.ts';
import { ev, invert, makeScale, note } from './theory.ts';

export interface MotifNote { name: string; midi: number; step: number; len: number }

// [name, step from the start of the two-bar phrase, length in sixteenths].
// Bar one sits over Dm7 and bar two over Bbmaj7. Long, short, long, twice: a sigh.
const RAW: readonly (readonly [string, number, number])[] = [
  ['A5', 0, 6], ['Bb5', 6, 2], ['A5', 8, 7],
  ['F5', 16, 6], ['G5', 22, 2], ['D5', 24, 7],
];

export const MOTIF: readonly MotifNote[] = RAW.map(([name, step, len]) => ({ name, midi: note(name), step, len }));
export const MOTIF_PITCHES: readonly number[] = MOTIF.map((m) => m.midi);
/** The tonic the Upside Down flips the motif around. */
export const MOTIF_AXIS = note('D5');

export const D_MINOR = makeScale('D', 'minor');
export const D_PHRYGIAN = makeScale('D', 'phrygian');

/** The motif as two bars of events, moved by `shift` semitones. */
export function motifBars(shift = 0): NoteEv[][] {
  const bars: NoteEv[][] = [[], []];
  for (const m of MOTIF) bars[m.step >= 16 ? 1 : 0].push(ev(m.step % 16, m.len, m.midi + shift));
  return bars;
}

/** The motif flipped around the tonic and snapped to D Phrygian. */
export function motifUpsideDown(): number[] {
  return invert(MOTIF_PITCHES, MOTIF_AXIS, D_PHRYGIAN);
}

// ------------------------------------------------------------------ phrases

// Static's answer, cadence and long notes. C sharp in the answer is the leading tone over A7.
export const ANSWER: NoteEv[][] = [
  [ev(0, 6, 'Bb4'), ev(6, 2, 'C5'), ev(8, 7, 'D5')],
  [ev(0, 6, 'E5'), ev(6, 2, 'D5'), ev(8, 7, 'C#5')],
];
export const CADENCE: NoteEv[][] = [
  [ev(0, 6, 'Bb5'), ev(6, 2, 'A5'), ev(8, 7, 'G5')],
  [ev(0, 6, 'A5'), ev(6, 2, 'G5'), ev(8, 7, 'E5')],
];
export const LONGS: NoteEv[][] = [[ev(0, 15, 'C5')], [ev(0, 15, 'Bb4')]];

// ------------------------------------------------------------------ flipping and re-moding

export const G_MINOR = makeScale('G', 'minor');
export const F_MAJOR = makeScale('F', 'major');
/** The tonic the Clock flips the motif around: G, in the same octave as the motif's own D. */
export const CLOCK_AXIS = note('G5');

/** Every note of the bars flipped around the axis and snapped to the scale. Lengths and steps stay. */
export function flipBars(bars: readonly (readonly NoteEv[])[], axis: number, scale: Scale): NoteEv[][] {
  return bars.map((evs) => evs.map((e) => ({ ...e, midi: invert([e.midi], axis, scale)[0] })));
}

/** Moves every bar's notes by `semis`. */
export function shiftBars(bars: readonly (readonly NoteEv[])[], semis: number): NoteEv[][] {
  return bars.map((evs) => evs.map((e) => ({ ...e, midi: e.midi + semis })));
}

/**
 * The same scale degrees in another mode. A pitch is read as a degree of `from` above `fromTonic`, then
 * rebuilt as that degree of `to` above `toTonic`, in the same octave. Every pitch must be in `from`.
 */
export function remode(pitches: readonly number[], from: Scale, fromTonic: number, to: Scale, toTonic: number): number[] {
  return pitches.map((n) => {
    const rel = n - fromTonic;
    const oct = Math.floor(rel / 12);
    const pc = ((rel % 12) + 12) % 12;
    const idx = from.steps.indexOf(pc);
    if (idx < 0) throw new Error(`note ${n} is not in the scale`);
    return toTonic + 12 * oct + to.steps[idx];
  });
}

/** The motif in F major: 5 b6 5 b3 4 1 of D minor becomes 5 6 5 3 4 1 of F major, C D C A Bb F. */
export function motifInMajor(): number[] {
  return remode(MOTIF_PITCHES, D_MINOR, MOTIF_AXIS, F_MAJOR, note('F4'));
}

/** The major motif as two bars of events. */
export function motifMajorBars(shift = 0): NoteEv[][] {
  const pitches = motifInMajor();
  const bars: NoteEv[][] = [[], []];
  MOTIF.forEach((m, i) => bars[m.step >= 16 ? 1 : 0].push(ev(m.step % 16, m.len, pitches[i] + shift)));
  return bars;
}
