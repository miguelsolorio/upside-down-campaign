// Design 4, "Two Hawkins": where things sit. The wavy horizon, the node positions and the route between them.

export const HZ = 98;

const WAVE: number[] = [];
for (let x = 0; x < 256; x++) WAVE.push(HZ + Math.round(2.4 * Math.sin(x * 0.052 + 0.5) + 1.2 * Math.sin(x * 0.17 + 1.7)));

/** The row where Hawkins ends in column x. Rows above are the right-side-up world, this row and below the Upside Down. */
export const hzAt = (x: number): number => WAVE[Math.max(0, Math.min(255, Math.round(x)))] as number;

export const ORDER = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'] as const;

/** Node centers. 2.1 sits on the horizon, over the hole in the pumpkin patch. */
export const POS: Record<string, { x: number; y: number }> = {
  '1.1': { x: 34, y: 91 },
  '1.2': { x: 96, y: 89 },
  '1.3': { x: 154, y: 91 },
  '2.1': { x: 204, y: 91 },
  '2.2': { x: 198, y: 117 },
  '2.3': { x: 136, y: 127 },
};

/** How far each leg of the route bows, in px: the sign picks the side. */
const BEND = [5, -5, 4, -7, 9];

export interface Leg {
  pts: [number, number][];
  /** Cumulative length at each point. */
  at: number[];
  len: number;
}

function leg(a: { x: number; y: number }, b: { x: number; y: number }, bend: number): Leg {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const cx = (a.x + b.x) / 2 - (dy / d) * bend, cy = (a.y + b.y) / 2 + (dx / d) * bend;
  const n = Math.ceil(d * 2);
  const pts: [number, number][] = [], at: number[] = [];
  let len = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const p: [number, number] = [u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y];
    if (i > 0) len += Math.hypot(p[0] - (pts[i - 1] as [number, number])[0], p[1] - (pts[i - 1] as [number, number])[1]);
    pts.push(p);
    at.push(len);
  }
  return { pts, at, len };
}

/** Leg i runs from node i to node i + 1. */
export const LEGS: Leg[] = ORDER.slice(0, -1).map((id, i) => leg(POS[id] as { x: number; y: number }, POS[ORDER[i + 1] as string] as { x: number; y: number }, BEND[i] as number));

/** Where the token is: standing on a node, or k of the way along the route from one node to another. Also its heading. */
export function tokenAt(sel: string, walk: { from: string; to: string; k: number } | null): { x: number; y: number; dx: number; dy: number } {
  if (!walk) {
    const p = POS[sel] ?? (POS['1.1'] as { x: number; y: number });
    return { x: p.x, y: p.y, dx: 0, dy: 1 };
  }
  const a = ORDER.indexOf(walk.from as typeof ORDER[number]), b = ORDER.indexOf(walk.to as typeof ORDER[number]);
  if (a < 0 || b < 0 || a === b) {
    const p = POS[walk.to] ?? (POS['1.1'] as { x: number; y: number });
    return { x: p.x, y: p.y, dx: 0, dy: 1 };
  }
  // Lay the legs between the two nodes end to end, in the direction of travel.
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const parts = LEGS.slice(lo, hi);
  let total = 0;
  for (const l of parts) total += l.len;
  let want = (a < b ? walk.k : 1 - walk.k) * total;
  for (const l of parts) {
    if (want <= l.len + 0.001) {
      let i = 1;
      while (i < l.at.length - 1 && (l.at[i] as number) < want) i++;
      const p0 = l.pts[i - 1] as [number, number], p1 = l.pts[i] as [number, number];
      const span = (l.at[i] as number) - (l.at[i - 1] as number) || 1;
      const f = Math.max(0, Math.min(1, (want - (l.at[i - 1] as number)) / span));
      const sgn = a < b ? 1 : -1;
      return { x: p0[0] + (p1[0] - p0[0]) * f, y: p0[1] + (p1[1] - p0[1]) * f, dx: (p1[0] - p0[0]) * sgn, dy: (p1[1] - p0[1]) * sgn };
    }
    want -= l.len;
  }
  const p = POS[walk.to] as { x: number; y: number };
  return { x: p.x, y: p.y, dx: 0, dy: 1 };
}
