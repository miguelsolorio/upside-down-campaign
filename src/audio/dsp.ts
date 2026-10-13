// Pure DSP math for the synth: wave tables, the noise shift register, envelope shape. No DOM and no Web Audio
// objects, so Node tests can check the numbers.
import type { Env } from './tracks/types.ts';

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export const dbToGain = (db: number): number => Math.pow(10, db / 20);
export const gainToDb = (g: number): number => 20 * Math.log10(Math.max(g, 1e-9));

export interface Coefs { real: Float32Array; imag: Float32Array }

/**
 * Fourier series of a pulse wave with the given duty, DC removed. Index zero is DC and stays zero.
 * Use with createPeriodicWave: x(t) = sum real[n] cos(n w t) + imag[n] sin(n w t). The wave is high
 * for the first `duty` of each cycle.
 */
export function pulseCoefs(duty: number, harmonics: number): Coefs {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    const k = 2 / (n * Math.PI);
    real[n] = k * Math.sin(2 * Math.PI * n * duty);
    imag[n] = k * (1 - Math.cos(2 * Math.PI * n * duty));
  }
  return { real, imag };
}

/** The NES triangle: sixteen steps down, sixteen up, four bits. */
export const NES_TRIANGLE: readonly number[] = [
  15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

/** Fourier series of the stepped NES triangle, starting at mid level so a note begins without a jump. */
export function triCoefs(harmonics: number): Coefs {
  const n = NES_TRIANGLE.length;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let h = 1; h <= harmonics; h++) {
    let a = 0;
    let b = 0;
    for (let j = 0; j < n; j++) {
      const x = (NES_TRIANGLE[(j + 8) % n] - 7.5) / 7.5;
      const t0 = (2 * Math.PI * j) / n;
      const t1 = (2 * Math.PI * (j + 1)) / n;
      a += (x * (Math.sin(h * t1) - Math.sin(h * t0))) / h;
      b += (x * (Math.cos(h * t0) - Math.cos(h * t1))) / h;
    }
    real[h] = a / Math.PI;
    imag[h] = b / Math.PI;
  }
  return { real, imag };
}

/** Value of a Fourier series at phase theta, for checks. */
export function evalCoefs(c: Coefs, theta: number): number {
  let y = 0;
  for (let n = 1; n < c.real.length; n++) y += c.real[n] * Math.cos(n * theta) + c.imag[n] * Math.sin(n * theta);
  return y;
}

// ------------------------------------------------------------------ noise

/**
 * The noise channel's linear feedback shift register. Width 15 repeats every 32767 steps and sounds like
 * white noise. Width 7 repeats every 127 steps and sounds pitched and metallic. Feedback is bit 0 xor bit 1
 * fed into the top bit, which is a maximal sequence for both widths.
 */
export function lfsrBits(width: 15 | 7): Float32Array<ArrayBuffer> {
  const period = (1 << width) - 1;
  const out = new Float32Array(period);
  let reg = period;
  let sum = 0;
  for (let i = 0; i < period; i++) {
    out[i] = reg & 1 ? -1 : 1;
    sum += out[i];
    reg = lfsrNext(reg, width);
  }
  // The sequence has one more of one sign than the other. Remove that bias.
  const mean = sum / period;
  for (let i = 0; i < period; i++) out[i] -= mean;
  return out;
}

function lfsrNext(reg: number, width: number): number {
  const x = (reg ^ (reg >> 1)) & 1;
  return (reg >> 1) | (x << (width - 1));
}

/** Steps until the register returns to its starting state. */
export function lfsrPeriod(width: 15 | 7): number {
  const start = (1 << width) - 1;
  let reg = lfsrNext(start, width);
  let n = 1;
  while (reg !== start) {
    reg = lfsrNext(reg, width);
    n++;
  }
  return n;
}

/** A repeatable start point inside a noise loop, so a render sounds the same every time. */
export function noiseOffset(seed: number, period: number): number {
  return (Math.imul(seed + 1, 2654435761) >>> 0) % period;
}

// ------------------------------------------------------------------ envelopes

/** Envelope level, 0..1, `x` seconds after the key goes down while it is still held. */
export function envLevel(e: Env, x: number): number {
  if (x <= 0) return 0;
  if (x < e.a) return x / e.a;
  const y = x - e.a;
  if (e.d <= 0 || y >= e.d) return e.s;
  if (e.exp) return Math.pow(Math.max(e.s, 1e-3), y / e.d);
  return 1 + (e.s - 1) * (y / e.d);
}
