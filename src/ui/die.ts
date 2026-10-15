// A d20 drawn pixel by pixel at any size, upright or tumbling. The 8 by 8 icon in gfx stays the tiny one.
// The shape is the classic face-on d20: a hexagon, a center triangle and nine more triangles around it.
import type { ColorName } from '../gfx/palette.ts';
import { box } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface DieScheme { center: ColorName; top: ColorName; side: ColorName; low: ColorName; line: ColorName; edge: ColorName }
// Lines between faces are always darker than every fill, so the facets read at any size.
export const DIE_BONE: DieScheme = { center: 'white', top: 'bone', side: 'grey3', low: 'grey3', line: 'grey2', edge: 'ink' };
export const DIE_GOLD: DieScheme = { center: 'cream', top: 'yellow', side: 'amber', low: 'amber', line: 'orange', edge: 'ink' };
export const DIE_DIM: DieScheme = { center: 'mist', top: 'slate', side: 'dusk', low: 'dusk', line: 'shadow', edge: 'slate' };

type V = [number, number];
const APO = Math.sqrt(3) / 2;
const H: V[] = [[0, -1], [APO, -0.5], [APO, 0.5], [0, 1], [-APO, 0.5], [-APO, -0.5]];
const T: V[] = [[0, -0.5], [0.433, 0.25], [-0.433, 0.25]];
const TIERS = ['center', 'top', 'side', 'low'] as const;

interface Face { e: [number, number, number][]; tier: number }

/** A triangle as three edge functions that are positive inside. Units are the die radius. */
function face(a: V, b: V, c: V, tier: number): Face {
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const pts = area < 0 ? [a, c, b] : [a, b, c];
  const e = pts.map((p, i) => {
    const q = pts[(i + 1) % 3] as V;
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    return [-dy / len, dx / len, (dy * p[0] - dx * p[1]) / len] as [number, number, number];
  });
  return { e, tier };
}

const [T0, T1, T2] = T as [V, V, V];
const [H0, H1, H2, H3, H4, H5] = H as [V, V, V, V, V, V];
const TRIS: [V, V, V, number][] = [
  [T0, T1, T2, 0],
  [T0, H5, H0, 1], [T0, H0, H1, 1], [T2, H5, T0, 1],
  [T0, H1, T1, 2], [T1, H1, H2, 2], [T2, H4, H5, 1],
  [T1, H2, H3, 3], [T1, H3, T2, 3], [T2, H3, H4, 3],
];
const FACES: Face[] = TRIS.map(([a, b, c, tier]) => face(a, b, c, tier));

/** The same faces as triangles in die units (radius 1, point up), for drawing the die with smooth paths. */
export const DIE_TRIS: readonly { pts: readonly [V, V, V]; tier: (typeof TIERS)[number] }[] =
  TRIS.map(([a, b, c, tier]) => ({ pts: [a, b, c], tier: TIERS[tier] as (typeof TIERS)[number] }));
/** The die's outline in die units. */
export const DIE_HEX: readonly V[] = H;
const HEX_N: V[] = [-60, 0, 60, 120, 180, 240].map((d) => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)] as V);

/** The color at a point of the die, in die units, or null outside it. px is half a screen pixel in die units. */
function shade(u: number, v: number, px: number, sc: DieScheme): ColorName | null {
  let hd = 9;
  for (const n of HEX_N) {
    const d = APO - (u * n[0] + v * n[1]);
    if (d < hd) hd = d;
  }
  if (hd < -px) return null;
  if (hd < px) return sc.edge;
  for (const f of FACES) {
    let m = 9;
    for (const e of f.e) {
      const d = e[0] * u + e[1] * v + e[2];
      if (d < m) m = d;
      if (m < -1e-9) break;
    }
    if (m < -1e-9) continue;
    return m < px ? sc.line : sc[TIERS[f.tier] as keyof DieScheme];
  }
  return sc.line;
}

export interface DieOpts {
  scheme?: DieScheme;
  /** Spin in radians and a horizontal squash from 0 to 1, for the tumble. */
  angle?: number;
  squash?: number;
  /** 0..1 of the die lit from the bottom up in litScheme. The HUD meter uses this. */
  lit?: number;
  litScheme?: DieScheme;
}

/** Draws a d20 of radius r centered on cx, cy. The die is 1.73 r wide and 2 r tall. */
export function drawDie(ctx: Ctx, cx: number, cy: number, r: number, o: DieOpts = {}): void {
  const sc = o.scheme ?? DIE_BONE;
  const lit = o.litScheme ?? DIE_GOLD;
  const sq = Math.max(0.15, Math.min(1, o.squash ?? 1));
  const ca = Math.cos(o.angle ?? 0), sa = Math.sin(o.angle ?? 0);
  const span = Math.ceil(r * 1.1) + 1;
  const ox = Math.round(cx), oy = Math.round(cy);
  const px = 0.5 / r;
  const fillFrom = o.lit === undefined ? 2 : 1 - 2 * o.lit;
  for (let j = -span; j < span; j++) {
    let run: ColorName | null = null;
    let start = 0;
    for (let i = -span; i <= span; i++) {
      let c: ColorName | null = null;
      if (i < span) {
        // A hair off the pixel center, so a line that falls exactly between two columns lands on one of them.
        const dx = i + 0.511, dy = j + 0.517;
        const u = (dx * ca + dy * sa) / (r * sq);
        const v = (dy * ca - dx * sa) / r;
        c = shade(u, v, px, v >= fillFrom ? lit : sc);
      }
      if (c !== run) {
        if (run) box(ctx, ox + start, oy + j, i - start, 1, run);
        run = c;
        start = i;
      }
    }
  }
}
