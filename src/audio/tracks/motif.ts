// The Hawkins motif: six notes over two bars in D minor, defined here once.
// Static plays it as written. The scare stinger plays it upside down through invert().
import type { NoteEv } from './types.ts';
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
