// The plain arithmetic of the recorder's sound, with no Web Audio in it so Node can test it: when a logged call is heard, how
// a shot's piece of the mix is cut and faded, and how it travels to the recorder.
import { FPS } from '../core/config.ts';
import type { CapEvent } from '../core/capture.ts';

export const SAMPLE_RATE = 44100;
/** Samples in one video frame: 44100 over 60 is a whole number, so a shot of N frames is exactly N times this and nothing drifts. */
export const FRAME_SAMPLES = SAMPLE_RATE / FPS;

/**
 * Seconds from the start of the page's run to the moment a logged call is heard. A call made while tick k ran (the log says k)
 * first shows in the frame drawn after that tick, which is the capture's tick count k + 1, so the sound lands with the picture.
 */
export function heardAt(e: Pick<CapEvent, 'tick'>): number {
  return (e.tick + 1) / FPS;
}

/** A small seeded random source (mulberry32). The mix gives every logged effect its own, so a render never depends on its neighbours. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed for the n-th call of the log. */
export const seedOf = (e: Pick<CapEvent, 'tick'>, n: number): number => Math.imul(e.tick + 1, 2654435761) ^ Math.imul(n + 1, 40503);

/**
 * Cuts `count` video frames of sound out of a render, starting `from` frames into it, and fades the ends over `fadeIn` and
 * `fadeOut` seconds with a quarter sine, so a cut is soft but quick.
 */
export function cutShot(samples: Float32Array, from: number, count: number, fadeIn: number, fadeOut: number): Float32Array {
  const start = Math.round(from * FRAME_SAMPLES);
  const n = count * FRAME_SAMPLES;
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) res[i] = samples[start + i] ?? 0;
  const fi = Math.round(fadeIn * SAMPLE_RATE);
  const fo = Math.round(fadeOut * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    let g = 1;
    if (i < fi) g = Math.sin(((i + 0.5) / fi) * (Math.PI / 2));
    if (i >= n - fo) g = Math.min(g, Math.sin(((n - i - 0.5) / fo) * (Math.PI / 2)));
    res[i] = (res[i] as number) * g;
  }
  return res;
}

/** Samples in -1..1 as little-endian 16-bit PCM, in base64, for the trip out of the page. */
export function pcmBase64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] as number));
    view.setInt16(i * 2, Math.round(s < 0 ? s * 32768 : s * 32767), true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
