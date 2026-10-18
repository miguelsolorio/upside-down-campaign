// The Hawkins map screen's layout: the wavy horizon between Hawkins and the Upside Down, where each stage sits, where the
// labels go, and the route the token walks. Pure numbers, no DOM, so Node can test the walk. See docs/map-screen.md.
import type { Place } from '../core/mapdata.ts';

export const SCREEN_W = 256, SCREEN_H = 224;
/** The slim strip on top holds the chapter and the stage. The party band at the bottom is 28 px. */
export const TOP_H = 10;
export const BAND_H = 28;
export const BAND_Y = SCREEN_H - BAND_H;
/** Where Hawkins ends and the Upside Down begins, before the waves. */
export const HZ = 98;

const WAVE: number[] = [];
for (let x = 0; x < SCREEN_W; x++) WAVE.push(HZ + Math.round(2.4 * Math.sin(x * 0.052 + 0.5) + 1.2 * Math.sin(x * 0.17 + 1.7)));

/** The row where Hawkins ends in column x. Rows above are the right-side-up world, this row and below the Upside Down. */
export const hzAt = (x: number): number => WAVE[Math.max(0, Math.min(SCREEN_W - 1, Math.round(x)))] as number;

/** Every stage on the map, in play order. */
export const ORDER = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '4.1', '4.2'] as const;

export interface Pt { x: number; y: number }

/**
 * Node centers. Each sits on the near side of its landmark: in front of it in Hawkins, above it in the Upside Down, so the
 * token standing on a node leaves most of the landmark in view. 2.1 sits over the hole in the pumpkin patch, on the horizon.
 */
export const POS: Record<string, Pt> = {
  '1.1': { x: 28, y: 91 },
  '1.2': { x: 88, y: 73 },
  '1.3': { x: 150, y: 89 },
  '2.1': { x: 210, y: 91 },
  '2.2': { x: 194, y: 122 },
  '2.3': { x: 112, y: 157 },
  // Chapter 3 (docs/map-screen.md, "Chapter three on the map"): Starcourt Mall stands in Hawkins between the lab and the school, 3.1 in
  // front of its door on the parking lot. The bunker of the base is on the horizon below it, 3.2 above the bunker, and the food court is
  // the glass dome on the mall's roof, 3.3 on it. The route from the Gate climbs out of the Upside Down up the road to the mall, turns
  // the token over at the horizon like the drop through the hole in the patch, and comes down again to the bunker.
  '3.1': { x: 124, y: 78 },
  '3.2': { x: 96, y: 93 },
  '3.3': { x: 118, y: 48 },
  // Chapter 4 (docs/map-screen.md, "Chapter four on the map"): Kamchatka is half a world away, so 4.1 sits on the inset in the top left corner
  // (map_inset.ts), on its lower right corner where the token stands over the picture. The Creel House stands on its hill in the top right of
  // the town (map_house.ts), 4.2 in front of it on the road.
  '4.1': { x: 57, y: 30 },
  '4.2': { x: 188, y: 57 },
};

/** The place each stage sits in. */
export const PLACE_OF: Record<string, Place> = {
  '1.1': 'woods', '1.2': 'lab', '1.3': 'school', '2.1': 'patch', '2.2': 'tunnels', '2.3': 'gate', '3.1': 'mall', '3.2': 'base', '3.3': 'foodcourt',
  '4.1': 'kamchatka', '4.2': 'creel',
};

/** The landmarks: Hawkins ones stand on `base` (their bottom row), the ones below hang from `top`. */
export const LAND = {
  woods: { x: 30, base: 80 },
  lab: { x: 88, base: 62 },
  school: { x: 150, base: 78 },
  hole: { x: 210, y: HZ },
  tunnels: { x: 194, top: 133 },
  gate: { x: 112, top: 168 },
  mall: { x: 118, base: 72 },
  food: { x: 118, base: 52 },
  bunker: { x: 96, y: HZ },
  creel: { x: 190, base: 50 },
};

/** How far each leg of the route bows, in px: the sign picks the side. The last two are the flights to Kamchatka and back to the Creel House. */
const BEND = [6, 12, 5, -8, 10, -12, 4, -6, 7, -12];

export interface Leg {
  pts: [number, number][];
  /** Cumulative length at each point. */
  at: number[];
  len: number;
}

function leg(a: Pt, b: Pt, bend: number): Leg {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const cx = (a.x + b.x) / 2 - (dy / d) * bend, cy = (a.y + b.y) / 2 + (dx / d) * bend;
  const n = Math.ceil(d * 2);
  const pts: [number, number][] = [], at: number[] = [];
  let len = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const p: [number, number] = [u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y];
    if (i > 0) { const q = pts[i - 1] as [number, number]; len += Math.hypot(p[0] - q[0], p[1] - q[1]); }
    pts.push(p);
    at.push(len);
  }
  return { pts, at, len };
}

/** Leg i runs from node i to node i + 1. */
export const LEGS: Leg[] = ORDER.slice(0, -1).map((id, i) => leg(POS[id] as Pt, POS[ORDER[i + 1] as string] as Pt, BEND[i] as number));

const idx = (id: string): number => ORDER.indexOf(id as typeof ORDER[number]);

/** The length in px of the walk from one stage to another, along the route. 0 for the same stage or an unknown one. */
export function hopLength(from: string, to: string): number {
  const a = idx(from), b = idx(to);
  if (a < 0 || b < 0) return 0;
  let n = 0;
  for (let i = Math.min(a, b); i < Math.max(a, b); i++) n += (LEGS[i] as Leg).len;
  return n;
}

/** Where the token is: standing on a node, or k of the way along the route from one node to another. Also its heading. */
export function tokenAt(sel: string, walk: { from: string; to: string; k: number } | null): { x: number; y: number; dx: number; dy: number } {
  const fallback = (id: string): { x: number; y: number; dx: number; dy: number } => {
    const p = POS[id] ?? (POS['1.1'] as Pt);
    return { x: p.x, y: p.y, dx: 0, dy: 1 };
  };
  if (!walk) return fallback(sel);
  const a = idx(walk.from), b = idx(walk.to);
  if (a < 0 || b < 0 || a === b) return fallback(walk.to);
  const lo = Math.min(a, b), hi = Math.max(a, b), sgn = a < b ? 1 : -1;
  const parts = LEGS.slice(lo, hi);
  let total = 0;
  for (const l of parts) total += l.len;
  let want = Math.max(0, Math.min(1, walk.k)) * total;
  if (a > b) want = total - want;
  for (const l of parts) {
    if (want <= l.len + 0.001) {
      let i = 1;
      while (i < l.at.length - 1 && (l.at[i] as number) < want) i++;
      const p0 = l.pts[i - 1] as [number, number], p1 = l.pts[i] as [number, number];
      const span = (l.at[i] as number) - (l.at[i - 1] as number) || 1;
      const f = Math.max(0, Math.min(1, (want - (l.at[i - 1] as number)) / span));
      return { x: p0[0] + (p1[0] - p0[0]) * f, y: p0[1] + (p1[1] - p0[1]) * f, dx: (p1[0] - p0[0]) * sgn, dy: (p1[1] - p0[1]) * sgn };
    }
    want -= l.len;
  }
  return fallback(walk.to);
}
