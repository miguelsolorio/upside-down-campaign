// Spectrum and loudness of a rendered signal, for the audio tests. Not a test file. The signal comes from renderWith (render.ts) on
// the offline context in offline-audio.ts; the numbers here are the ones the old browser measurements recorded.
const RATE = 44100;

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** Power at each frequency from 0 to the Nyquist frequency, as [Hz, power] pairs. */
function power(x: Float32Array): [number, number][] {
  let n = 1;
  while (n < x.length) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  x.forEach((v, i) => { re[i] = v; });
  fft(re, im);
  const out: [number, number][] = [];
  for (let k = 1; k < n / 2; k++) out.push([(k * RATE) / n, (re[k] * re[k] + im[k] * im[k]) / n]);
  return out;
}

/** Octave bands from 90 Hz up, with everything under 90 Hz in the first. */
export const BAND_EDGES = [0, 90, 180, 360, 720, 1440, 2880, 5760, 22050] as const;

/** The share of the signal's energy in each octave band of BAND_EDGES. */
export function bands(x: Float32Array): number[] {
  const out = new Array<number>(BAND_EDGES.length - 1).fill(0);
  let total = 0;
  for (const [f, p] of power(x)) {
    total += p;
    out[BAND_EDGES.findIndex((e, i) => f >= e && f < BAND_EDGES[i + 1])] += p;
  }
  return out.map((v) => v / Math.max(total, 1e-30));
}

/** The share of the energy between two frequencies. */
export function share(x: Float32Array, lo: number, hi: number): number {
  let total = 0;
  let inside = 0;
  for (const [f, p] of power(x)) {
    total += p;
    if (f >= lo && f < hi) inside += p;
  }
  return inside / Math.max(total, 1e-30);
}

/** The spectral centroid in Hz. */
export function centroid(x: Float32Array): number {
  let total = 0;
  let sum = 0;
  for (const [f, p] of power(x)) { total += p; sum += f * p; }
  return sum / Math.max(total, 1e-30);
}

/** Half the summed difference of two band profiles: 0 for the same spectrum, 1 for spectra that share no band. */
export function distance(a: readonly number[], b: readonly number[]): number {
  return a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / 2;
}

/** The IEC 61672 A-weighting curve, as a gain. */
function aWeight(f: number): number {
  const f2 = f * f;
  return ((12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2))) * 1.2589;
}

/**
 * The ear's view of how loud a short sound is: the energy of the A-weighted signal, in dB. This is the figure the blips and
 * stingers were balanced by (tests/tracks-78-voices.test.ts): a blip sits near 9.6 dB and a stinger between 24 and 26.
 */
export function energyDb(x: Float32Array): number {
  let e = 0;
  for (const [f, p] of power(x)) e += p * aWeight(f) ** 2;
  return 10 * Math.log10(Math.max(2 * e, 1e-30));
}
