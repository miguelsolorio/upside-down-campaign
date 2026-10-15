// Map variant 3 (Hawkins at night): the Upside Down. A bank of ink and purple fog that swallows the last two stages,
// painted once into the land with an ordered dither, with dark red veins creeping out of it, and a few spores that drift.
import { BAYER4, hash2 } from '../canvas.ts';
import { Px } from '../px.ts';

/** Smooth value noise in 0..1. */
function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, seed) / 4294967296, b = hash2(xi + 1, yi, seed) / 4294967296;
  const c = hash2(xi, yi + 1, seed) / 4294967296, d = hash2(xi + 1, yi + 1, seed) / 4294967296;
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number, seed: number): number => vnoise(x, y, seed) * 0.6 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.4;

const blob = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): number => {
  const a = (x - cx) / rx, b = (y - cy) / ry;
  return 1 - (a * a + b * b);
};

/** How thick the fog is at a pixel, 0 to 1. A node that is no longer locked keeps a clearing around it. */
export function fogDensity(x: number, y: number, clear: [number, number][]): number {
  let d = Math.max(
    blob(x, y, 230, 134, 40, 34), blob(x, y, 240, 52, 34, 40), blob(x, y, 248, 96, 22, 52), blob(x, y, 214, 112, 16, 22),
  );
  d += (fbm(x / 7, y / 7, 3) - 0.5) * 0.95;
  // Thick in puffs, thin between them, so the bank reads as cloud and not a flat fill.
  const cap = 0.5 + 0.45 * fbm(x / 5.5, y / 5.5, 13);
  let t = Math.min(cap, Math.max(0, d * 1.7));
  for (const [cx, cy] of clear) {
    const dist = Math.hypot(x - cx, y - cy);
    t *= Math.min(1, Math.max(0, (dist - 11) / 15));
  }
  return t;
}

/** Paints the fog over the land inside the rows y0 to y1. Ramp: what is there, purple, ink; wisps of brighter purple ride on it. */
export function paintFog(p: Px, y0: number, y1: number, clear: [number, number][]): void {
  for (let y = y0; y < y1; y++) {
    for (let x = 150; x < 256; x++) {
      const t = fogDensity(x, y, clear);
      if (t <= 0.02) continue;
      const b = (BAYER4[(y & 3) * 4 + (x & 3)] as number + 0.5) / 16;
      const lvl = t * 2, base = Math.floor(lvl), frac = lvl - base;
      const step = frac > b ? base + 1 : base;
      if (step === 0) continue;
      p.set(x, y, step === 1 ? 'purple0' : 'ink');
      // Wisps: slanted bands of lighter purple inside the fog.
      if (step >= 1 && t > 0.3) {
        const w = Math.sin((x * 0.23 + y * 0.31) + fbm(x / 9, y / 9, 11) * 7);
        if (w > 0.86 && ((x + y) & 1) === 0) p.set(x, y, 'purple');
      }
    }
  }
}

/** Veins: jagged dark red lines that run out of the fog across the land, with a dark shadow and a few bright tips. */
export function paintVeins(p: Px, y0: number, y1: number): void {
  const veins: [number, number, number, number][] = [
    [226, 120, 176, 150], [222, 104, 186, 92], [236, 70, 196, 54], [214, 130, 204, 170], [240, 100, 208, 90], [232, 40, 214, 22], [226, 150, 190, 168],
  ];
  veins.forEach(([sx, sy, ex, ey], n) => {
    let x = sx, y = sy;
    const steps = Math.ceil(Math.hypot(ex - sx, ey - sy));
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      x = sx + (ex - sx) * k + (vnoise(i / 5, n, 21) - 0.5) * 9 * Math.sin(Math.PI * k);
      y = sy + (ey - sy) * k + (vnoise(n, i / 5, 22) - 0.5) * 9 * Math.sin(Math.PI * k);
      const ix = Math.round(x), iy = Math.round(y);
      if (iy < y0 || iy >= y1) continue;
      p.set(ix, iy + 1, 'blood0').set(ix, iy, k > 0.8 ? 'blood0' : 'blood1');
      if (i % 11 === 5 && k < 0.8) {
        // A short branch.
        const dx = hash2(i, n, 5) & 1 ? 1 : -1;
        for (let j = 1; j < 5; j++) if (iy + j >= y0 && iy + j < y1) p.set(ix + dx * j, iy + j, 'blood1');
      }
    }
  });
}

export interface Spore { x: number; y: number; vy: number; sway: number; ph: number; big: boolean; c: 'purple' | 'magenta' }
/** Spores: each rises slowly and sways. Frozen by passing t = 0. */
export const SPORES: Spore[] = [];
for (let i = 0; i < 22; i++) {
  const r = (k: number): number => hash2(i, k, 99) / 4294967296;
  SPORES.push({ x: 176 + r(1) * 78, y: 30 + r(2) * 140, vy: 0.04 + r(3) * 0.07, sway: 2 + r(4) * 3, ph: r(5) * 6.28, big: r(6) > 0.78, c: r(7) > 0.75 ? 'magenta' : 'purple' });
}

/** A spore's pixel position at frame t, wrapped inside the fog's rows. */
export function sporeAt(s: Spore, t: number, y0: number, y1: number): [number, number] {
  const span = y1 - y0;
  const y = y0 + ((((s.y - y0 - t * s.vy) % span) + span) % span);
  return [Math.round(s.x + Math.sin(t * 0.02 + s.ph) * s.sway), Math.round(y)];
}
