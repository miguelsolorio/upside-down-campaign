// Track data model. Pure types: no DOM and no Web Audio, so Node tests can import the tracks.
import type { TrackId } from '../../core/types.ts';

/** Five voices at most, like the NES: three pulse slots, one triangle, one noise. */
export type PitchedSlot = 'p1' | 'p2' | 'p3' | 'tri';
export type Slot = PitchedSlot | 'noi';
export type LayerId = 'base' | 'combat';
/** Pulse at 12.5, 25 and 50 percent duty, or the stepped triangle. */
export type Wave = 'p12' | 'p25' | 'p50' | 'tri';
export type Drum = 'kick' | 'snare' | 'hat' | 'ohat' | 'tick' | 'tock' | 'swell' | 'crack';
export type ModeName = 'minor' | 'phrygian' | 'dorian' | 'major' | 'whole' | 'chromatic';

/** Seconds. s is the sustain level, 0..1. exp makes the decay exponential. */
export interface Env { a: number; d: number; s: number; r: number; exp?: boolean }
/** Vibrato: rate in Hz, depth in cents, delay in seconds before it fades in. */
export interface Vib { rate: number; cents: number; delay: number }

export interface Inst {
  wave: Wave;
  /** Peak gain before velocity. */
  vol: number;
  env: Env;
  /** Fraction of a note's length the key stays down. The rest is room for the release. */
  gate: number;
  vib?: Vib;
  /** How much of this voice feeds the track's echo, 0..1. */
  send?: number;
}

/** step is in sixteenths from the bar line and may be fractional. len is in sixteenths and may cross bar lines. */
export interface NoteEv { step: number; len: number; midi: number; vel?: number }
export interface DrumEv { step: number; drum: Drum; vel?: number }

export interface PitchedChannel { slot: PitchedSlot; layer: LayerId; inst: Inst; bars: NoteEv[][] }
export interface NoiseChannel { slot: 'noi'; layer: LayerId; bars: DrumEv[][] }
export type Channel = PitchedChannel | NoiseChannel;

/** A feedback delay shared by the voices that send to it. beats is the delay time. */
export interface Echo { beats: number; feedback: number; mix: number; cutoff: number }

export interface Scale { root: number; mode: ModeName; steps: readonly number[] }

export interface Track {
  id: TrackId;
  title: string;
  bpm: number;
  /** Tonic name, for example 'D'. */
  tonic: string;
  mode: ModeName;
  /** Pitch classes allowed outside the scale. Each track says why next to the list. */
  chromatic: readonly number[];
  /** Loop length in bars. Every channel has exactly this many bars. */
  bars: number;
  layers: readonly LayerId[];
  /** One chord symbol per bar. Drives the arp and bass helpers and the loop-closure test. */
  harmony: readonly string[];
  echo?: Echo;
  channels: readonly Channel[];
}
