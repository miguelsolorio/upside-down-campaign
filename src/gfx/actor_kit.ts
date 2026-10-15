// Shared by the actors that are drawn from frames of their own (the Demogorgon, the demodog, the vine and the pod): the
// canvas a frame becomes for each way the game shows it. Normal, a white flash, a dithered tint, or faint when hidden
// (a hidden enemy in the corn: a thin ghost of dither, so only a careful eye sees it). Pure pixel work until canvasFromPixels.
import type { ActorView } from '../core/types.ts';
import { canvasFromPixels, px32 } from './canvas.ts';
import type { ColorName } from './palette.ts';
import type { Px } from './px.ts';

/** A frame ready to draw: its canvas, and the first row with a pixel in it (where the bar and the "!" go). */
export interface Frame { img: HTMLCanvasElement; top: number }

/** The first row with a pixel in it. */
export function topRow(p: Px): number {
  for (let i = 0; i < p.d.length; i++) if (p.d[i]) return (i / p.w) | 0;
  return p.h;
}

/** Which look a view asks for, as a short key. */
export function variantOf(v: Pick<ActorView, 'flash' | 'tint' | 'hidden'>): string {
  if (v.hidden) return 'h';
  if (v.flash > 0.6) return 'w';
  if (v.flash > 0.25) return 'tw';
  return v.tint ? `t${v.tint}` : 'n';
}

/** The canvas for a frame in a look. Built once per key. */
export function frameFor(cache: Map<string, Frame>, key: string, src: Px, v: Pick<ActorView, 'flash' | 'tint' | 'hidden'>): Frame {
  const mode = variantOf(v), full = `${key}|${mode}`;
  let f = cache.get(full);
  if (f) return f;
  const out = new Uint32Array(src.d.length);
  const white = px32('white'), ink = px32('ink');
  const tint: ColorName | null = mode === 'tw' ? 'white' : v.tint;
  const tc = mode.startsWith('t') && tint ? px32(tint) : 0;
  for (let i = 0; i < out.length; i++) {
    const d = src.d[i] as number;
    if (!d) continue;
    const x = i % src.w, y = (i / src.w) | 0;
    if (mode === 'h') { if (((x + y) & 1) === 0 && (x & 1) === 0) out[i] = d === ink ? ink : d; continue; }
    out[i] = mode === 'w' ? white : tc && d !== ink && ((x + y) & 1) === 0 ? tc : d;
  }
  f = { img: canvasFromPixels(out, src.w, src.h), top: topRow(src) };
  cache.set(full, f);
  return f;
}
