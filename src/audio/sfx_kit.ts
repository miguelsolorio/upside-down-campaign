// Shared pieces of the sound effect recipes: the part types and the little builders that make them.
// sfx.ts holds the original effects and sfx_levels34.ts the Level 3 and 4 ones. Pure data: no Web Audio.
import type { NoiseFilter } from './synth.ts';
import type { Vib, Wave } from './tracks/types.ts';

export interface Tn {
  k: 't';
  w: Wave;
  f: number;
  /** Glide to this frequency over the sound. */
  f2?: number;
  at: number;
  d: number;
  v: number;
  /** A flat beep with sharp edges. Without it the tone decays like a pluck. */
  hold: boolean;
  vib?: Vib;
  arp?: number[];
  ar?: number;
}
export interface Ns {
  k: 'n';
  m: 15 | 7;
  c: number;
  c2?: number;
  at: number;
  d: number;
  v: number;
  f?: NoiseFilter;
  rise?: number;
}
export type Part = Tn | Ns;
export interface Recipe {
  /** Random pitch variation, as a fraction either way. */
  j: number;
  parts: Part[];
}

export const T = (w: Wave, f: number, d: number, v: number, o: Partial<Tn> = {}): Tn => ({ k: 't', w, f, at: 0, d, v, hold: false, ...o });
export const N = (m: 15 | 7, c: number, d: number, v: number, o: Partial<Ns> = {}): Ns => ({ k: 'n', m, c, at: 0, d, v, ...o });
export const bp = (freq: number, freqEnd?: number, q = 1): NoiseFilter => ({ type: 'bandpass', freq, freqEnd, q });
export const lp = (freq: number, freqEnd?: number): NoiseFilter => ({ type: 'lowpass', freq, freqEnd, q: 0.7 });
export const hp = (freq: number): NoiseFilter => ({ type: 'highpass', freq, q: 0.7 });
export const R = (parts: Part[], j = 0.04): Recipe => ({ j, parts });
