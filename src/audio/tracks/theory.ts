// Music theory and composition helpers. Pure functions on numbers: no DOM, no Web Audio.
import type { Drum, DrumEv, ModeName, NoteEv, Scale } from './types.ts';

export const STEPS_PER_BAR = 16;
export const BEATS_PER_BAR = 4;

export const MODES: Record<ModeName, readonly number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  whole: [0, 2, 4, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'D' is 2, 'Bb' is 10, 'F#' is 6. */
export function pitchClass(name: string): number {
  const m = /^([A-G])([#b]?)$/.exec(name);
  if (!m) throw new Error(`bad pitch class ${name}`);
  return (LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

/** Note name to MIDI number: 'D4' is 62, 'Bb3' is 58. Middle C is C4 = 60. Spell notes without B sharp or C flat. */
export function note(name: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return (Number(m[2]) + 1) * 12 + pitchClass(m[1]);
}

// ------------------------------------------------------------------ scales

export function makeScale(tonic: string, mode: ModeName): Scale {
  return { root: pitchClass(tonic), mode, steps: MODES[mode] };
}

export function inScale(s: Scale, midi: number): boolean {
  return s.steps.includes((((midi - s.root) % 12) + 12) % 12);
}

/**
 * The nearest scale tone. A tie goes down. With that rule invert() is an exact round trip on natural
 * minor, Phrygian, Dorian, whole tone and chromatic scales, which are the ones the game uses.
 */
export function snap(s: Scale, midi: number): number {
  for (let d = 0; d < 12; d++) {
    if (inScale(s, midi - d)) return midi - d;
    if (inScale(s, midi + d)) return midi + d;
  }
  return midi;
}

/**
 * Flips every interval of the motif around the axis pitch, then snaps each note to the scale.
 * Notes above the axis land below it by the same distance. The axis itself does not move.
 */
export function invert(motif: readonly number[], axis: number, s: Scale): number[] {
  return motif.map((n) => snap(s, 2 * axis - n));
}

// ------------------------------------------------------------------ chords

const QUALITY: Record<string, readonly number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7], dim: [0, 3, 6],
};

export interface Chord { symbol: string; root: number; tones: readonly number[] }

/** 'Dm7', 'Bbmaj7', 'A7', 'F', 'E'. */
export function chord(symbol: string): Chord {
  const m = /^([A-G][#b]?)(.*)$/.exec(symbol);
  const tones = m ? QUALITY[m[2]] : undefined;
  if (!m || !tones) throw new Error(`bad chord ${symbol}`);
  return { symbol, root: pitchClass(m[1]), tones };
}

/** Pitch classes of the chord, root first. */
export function chordPcs(symbol: string): number[] {
  const c = chord(symbol);
  return c.tones.map((t) => (c.root + t) % 12);
}

/** Every chord tone from lo to hi inclusive, ascending. */
export function pool(symbol: string, lo: number, hi: number): number[] {
  const pcs = chordPcs(symbol);
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out.push(m);
  return out;
}

/** The chord root closest to `near`, kept inside [lo, hi]. */
export function rootNear(symbol: string, near: number, lo: number, hi: number): number {
  const pc = chord(symbol).root;
  let best = -1;
  for (let m = lo; m <= hi; m++) {
    if (m % 12 === pc && (best < 0 || Math.abs(m - near) < Math.abs(best - near))) best = m;
  }
  if (best < 0) throw new Error(`no ${symbol} root between ${lo} and ${hi}`);
  return best;
}

// ------------------------------------------------------------------ composition helpers

/** One note event. pitch is a name like 'A5' or a MIDI number. */
export function ev(step: number, len: number, pitch: string | number, vel = 1): NoteEv {
  return { step, len, midi: typeof pitch === 'number' ? pitch : note(pitch), vel };
}

export function rest<T>(bars: number): T[][] {
  return Array.from({ length: bars }, () => [] as T[]);
}

/** Joins runs of bars end to end. */
export function cat<T>(...parts: T[][][]): T[][] {
  return parts.flat();
}

/** Scales velocity linearly from `from` at the first bar to `to` at the last. */
export function ramp<T extends { vel?: number }>(bars: T[][], from: number, to: number): T[][] {
  return bars.map((evs, i) => {
    const k = from + ((to - from) * i) / Math.max(1, bars.length - 1);
    return evs.map((e) => ({ ...e, vel: (e.vel ?? 1) * k }));
  });
}

export interface ArpSpec {
  /** Lowest and highest MIDI note the arp may use. */
  win: readonly [number, number];
  steps: readonly number[];
  /** Index into the chord's tones inside the window, one per step. Too-high indexes clamp to the top tone. */
  idx: readonly number[];
  len: number;
  vel?: readonly number[];
}

/** Chord progression to arpeggio: one bar per chord symbol. */
export function arpBars(prog: readonly string[], spec: ArpSpec): NoteEv[][] {
  return prog.map((sym) => {
    const tones = pool(sym, spec.win[0], spec.win[1]);
    return spec.steps.map((step, i) => ({
      step,
      len: spec.len,
      midi: tones[Math.min(spec.idx[i], tones.length - 1)],
      vel: spec.vel ? spec.vel[i] : 1,
    }));
  });
}

/** [step, len, semitones above the chord root]. Stick to 0, 7 and 12 so the note fits every chord. */
export type BassNotes = readonly (readonly [number, number, number])[];

export interface BassSpec {
  range: readonly [number, number];
  /** Either one pattern for every bar, or a function of the bar index. */
  notes: BassNotes | ((bar: number) => BassNotes);
}

/** Chord progression to bass line. Each root lands in the octave nearest the previous root. */
export function bassBars(prog: readonly string[], spec: BassSpec): NoteEv[][] {
  let prev = Math.round((spec.range[0] + spec.range[1]) / 2);
  return prog.map((sym, bar) => {
    const root = rootNear(sym, prev, spec.range[0], spec.range[1]);
    prev = root;
    const notes = typeof spec.notes === 'function' ? spec.notes(bar) : spec.notes;
    return notes.map(([step, len, off]) => ({ step, len, midi: root + off, vel: 1 }));
  });
}

/**
 * A slow line that moves to the nearest chord tone each bar: smooth voice leading for a pad.
 * It uses the root, third and fifth only, so it never leans on a seventh.
 */
export function lineBars(prog: readonly string[], o: { win: readonly [number, number]; start: number }): NoteEv[][] {
  let prev = o.start;
  return prog.map((sym) => {
    const triad = chordPcs(sym).slice(0, 3);
    const tones: number[] = [];
    for (let m = o.win[0]; m <= o.win[1]; m++) if (triad.includes(m % 12)) tones.push(m);
    let best = tones[0];
    for (const t of tones) if (Math.abs(t - prev) < Math.abs(best - prev)) best = t;
    prev = best;
    return [{ step: 0, len: STEPS_PER_BAR, midi: best, vel: 1 }];
  });
}

// ------------------------------------------------------------------ drums

/** How long each noise drum rings, in seconds. The sequencer and the compiler both read this. */
export const DRUM_SECONDS: Record<Drum, number> = {
  kick: 0.15, snare: 0.14, hat: 0.04, ohat: 0.15, tick: 0.03, tock: 0.035, swell: 2.2, crack: 0.02, wind: 1.7,
};

// When two rows claim the same step, the earlier drum in this list wins. The noise voice plays one hit at a time.
const PRIORITY: Drum[] = ['kick', 'snare', 'ohat', 'hat', 'crack', 'tick', 'tock', 'swell', 'wind'];

/**
 * A one-bar drum pattern from rows of up to sixteen characters.
 * '.' is silent, 'o' is a ghost hit, 'x' is normal, 'X' is an accent.
 */
export function grid(rows: Partial<Record<Drum, string>>): DrumEv[] {
  const taken = new Set<number>();
  const out: DrumEv[] = [];
  for (const drum of PRIORITY) {
    const row = rows[drum];
    if (!row) continue;
    for (let step = 0; step < row.length; step++) {
      const c = row[step];
      const vel = c === 'X' ? 1 : c === 'x' ? 0.7 : c === 'o' ? 0.4 : 0;
      if (vel > 0 && !taken.has(step)) {
        taken.add(step);
        out.push({ step, drum, vel });
      }
    }
  }
  return out.sort((a, b) => a.step - b.step);
}

/** One hit at one step. */
export function hit(step: number, drum: Drum, vel = 0.7): DrumEv {
  return { step, drum, vel };
}
