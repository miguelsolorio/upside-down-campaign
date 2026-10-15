// Shared by the actors that are drawn from frames of their own (the Demogorgon, the demodog, the vine and the pod): the
// canvas a frame becomes for each way the game shows it. Normal, a white flash, a dithered tint, or faint when hidden
// (a hidden enemy in the corn: a thin ghost of dither, so only a careful eye sees it; a hidden hero, Lucas under his Camo, is half dither
// with his outline kept, so the player still sees him). Pure pixel work until canvasFromPixels.
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

/** The fields of a view that decide which look a frame gets. */
export type Look = Pick<ActorView, 'flash' | 'tint' | 'hidden'> & { kind?: ActorView['kind'] };

/**
 * Whether the pixel at (x, y) of a hidden actor's frame is drawn. A hidden enemy keeps one in four, a thin ghost. A hidden hero keeps
 * half, a checker, and all of its outline (ink), so it is faint but clear.
 */
export function ghostKeep(hero: boolean, x: number, y: number, ink: boolean): boolean {
  if (hero) return ink || ((x + y) & 1) === 0;
  return ((x + y) & 1) === 0 && (x & 1) === 0;
}

/** Which look a view asks for, as a short key. */
export function variantOf(v: Look): string {
  if (v.hidden) return v.kind === 'hero' ? 'hh' : 'h';
  if (v.flash > 0.6) return 'w';
  if (v.flash > 0.25) return 'tw';
  return v.tint ? `t${v.tint}` : 'n';
}

/** The canvas for a frame in a look. Built once per key. */
export function frameFor(cache: Map<string, Frame>, key: string, src: Px, v: Look): Frame {
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
    if (mode === 'h' || mode === 'hh') { if (ghostKeep(mode === 'hh', x, y, d === ink)) out[i] = d; continue; }
    out[i] = mode === 'w' ? white : tc && d !== ink && ((x + y) & 1) === 0 ? tc : d;
  }
  f = { img: canvasFromPixels(out, src.w, src.h), top: topRow(src) };
  cache.set(full, f);
  return f;
}
