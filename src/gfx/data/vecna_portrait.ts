// Vecna's portrait (docs/level-13.md, speaker `vecna`), Rooted: the skull of the sheet's sprite (gfx/var/vecna_scary.ts) at 24 by 24 on a dark red
// ground. A big cranium over a narrow jaw, a heavy brow, black sockets with red points for eyes, a bare row of teeth, a vine over the dome,
// ash grey flesh with its shade down the right, his shoulders hunched up either side of the head and four dark red tendrils rising behind
// them. It is the one portrait that is not on the shared head: the face is a skull, so it brings its own head and a face for every expression
// (PortraitSpec.head and .faces, ui.ts): neutral is the cold stare, happy the grin, worried the points shrunk in tilted sockets, determined the
// brow low over narrowed ones, hurt the sockets shut and the jaw dropped, shocked the sockets wide and the mouth open. Five fill colors (ash
// grey, dark grey, bone, red, dark red) and the ink. Roles: s grey, d dark grey, b bone, p red, v dark red, a the shoulders' grey, e ink, m the
// inside of a mouth.
import type { Expr } from '../../core/types.ts';
import type { PortraitSpec } from './portraits.ts';
import type { Part } from './types.ts';

type Grid = string[][];
const blank = (): Grid => Array.from({ length: 24 }, () => Array<string>(24).fill('.'));
const put = (g: Grid, x: number, y: number, ch: string): void => { if (x >= 0 && y >= 0 && x < 24 && y < 24) (g[y] as string[])[x] = ch; };
const box = (g: Grid, x: number, y: number, w: number, h: number, ch: string): void => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, ch); };
const dots = (g: Grid, pts: readonly (readonly [number, number])[], ch: string): void => { for (const [x, y] of pts) put(g, x, y, ch); };
const part = (g: Grid): Part => ({ y: 0, rows: g.map((r) => r.join('')) });
/** A line of single pixels from (x0, y0) to (x1, y1). */
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, ch: string): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) put(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), ch);
}

/** The columns the skull covers on each of rows 2 to 17: a dome, the widest at the brow, the cheekbones, a narrow jaw, a neck. */
const SKULL: [number, number][] = [
  [8, 15], [6, 17], [5, 18], [4, 19], [4, 19], [4, 19], [4, 19], [4, 19], [4, 19], [5, 18], [6, 17], [7, 16], [8, 15], [9, 14], [10, 13], [10, 13],
];

/** The head: lit on the left, shaded on the right and under the brow, a seam across the dome, a vine over it and a cheekbone each side. */
function skull(): Part {
  const g = blank();
  SKULL.forEach(([x0, x1], i) => {
    const y = 2 + i;
    box(g, x0, y, x1 - x0 + 1, 1, 's');
    if (y > 4) put(g, x1, y, 'd');
    if (y > 8 && y < 16) put(g, x1 - 1, y, 'd');
    if (y > 12) put(g, x0, y, 'd');
  });
  dots(g, [[7, 3], [6, 4], [5, 5], [5, 6]], 'b');
  box(g, 5, 8, 14, 1, 'd');
  dots(g, [[5, 11], [18, 11], [6, 12], [17, 12]], 'd');
  dots(g, [[11, 3], [12, 3]], 'd');
  line(g, 5, 5, 8, 2, 'v');
  line(g, 8, 2, 12, 3, 'v');
  line(g, 12, 3, 14, 2, 'v');
  line(g, 17, 5, 15, 3, 'v');
  dots(g, [[14, 2], [5, 5]], 'p');
  dots(g, [[11, 14], [12, 14]], 'd');
  return part(g);
}

/** Sockets and eyes, per expression: a socket is a box of ink with a red point in it. */
interface Face { socket: [number, number, number, number][]; points: [number, number][]; teeth: 'flat' | 'grin' | 'open' | 'shut' | 'gape'; brow?: 'low' | 'slant' | 'up' }

const FACES: Record<Expr, Face> = {
  neutral: { socket: [[7, 9, 3, 3], [14, 9, 3, 3]], points: [[8, 10], [15, 10]], teeth: 'flat' },
  happy: { socket: [[7, 9, 3, 3], [14, 9, 3, 3]], points: [[8, 10], [9, 10], [15, 10], [16, 10]], teeth: 'grin' },
  worried: { socket: [[7, 9, 3, 3], [14, 9, 3, 3]], points: [[9, 11], [14, 11]], teeth: 'shut', brow: 'up' },
  determined: { socket: [[7, 10, 3, 2], [14, 10, 3, 2]], points: [[8, 11], [15, 11]], teeth: 'flat', brow: 'low' },
  hurt: { socket: [[7, 10, 3, 1], [14, 10, 3, 1]], points: [], teeth: 'open', brow: 'slant' },
  shocked: { socket: [[6, 8, 4, 4], [14, 8, 4, 4]], points: [[7, 9], [8, 9], [15, 9], [16, 9]], teeth: 'gape' },
};

/** The face over the head: the brow, the sockets and their points, the nose, and the teeth. */
function face(f: Face): Part {
  const g = blank();
  if (f.brow === 'low') { box(g, 6, 9, 5, 1, 'd'); box(g, 13, 9, 5, 1, 'd'); put(g, 10, 10, 'd'); put(g, 13, 10, 'd'); }
  if (f.brow === 'slant') { line(g, 6, 9, 10, 8, 'd'); line(g, 17, 9, 13, 8, 'd'); }
  if (f.brow === 'up') { line(g, 6, 8, 10, 7, 'd'); line(g, 17, 8, 13, 7, 'd'); }
  for (const [x, y, w, h] of f.socket) { box(g, x, y, w, h, 'e'); }
  for (const [x, y] of f.points) put(g, x, y, 'p');
  if (f.teeth === 'shut' || f.teeth === 'flat') {
    box(g, 9, 14, 6, 2, 'e');
    for (let x = 9; x < 15; x += 2) put(g, x, 14, 'b');
    for (let x = 10; x < 14; x += 2) put(g, x, 15, 'b');
    if (f.teeth === 'shut') { put(g, 8, 15, 'e'); put(g, 15, 15, 'e'); }
  }
  if (f.teeth === 'grin') {
    box(g, 7, 13, 10, 3, 'e');
    for (let x = 8; x < 16; x++) put(g, x, 13, x & 1 ? 'e' : 'b');
    for (let x = 9; x < 15; x++) put(g, x, 15, x & 1 ? 'b' : 'e');
    dots(g, [[6, 12], [17, 12]], 'e');
  }
  if (f.teeth === 'open') {
    box(g, 8, 13, 8, 4, 'e');
    for (let x = 8; x < 16; x += 2) put(g, x, 13, 'b');
    for (let x = 9; x < 15; x += 2) put(g, x, 16, 'b');
    box(g, 9, 14, 6, 2, 'm');
  }
  if (f.teeth === 'gape') {
    box(g, 8, 13, 8, 5, 'e');
    for (let x = 8; x < 16; x += 2) put(g, x, 13, 'b');
    for (let x = 9; x < 15; x += 2) put(g, x, 17, 'b');
    box(g, 9, 14, 6, 3, 'm');
  }
  dots(g, [[11, 12], [12, 12]], 'e');
  return part(g);
}

/** Draws `fn` on the left of the portrait and again turned round on the right: x is the distance from the edge, `w` the width of what it fills. */
function both(g: Grid, fn: (put: (x: number, y: number, ch: string, w?: number) => void) => void): void {
  for (const s of [-1, 1]) fn((x, y, ch, w = 1) => { for (let i = 0; i < w; i++) put(g, s < 0 ? x + i : 23 - x - i, y, ch); });
}

/** The tendrils behind him, two a side, rising from the shoulders past the dome with a red tip each. */
function back(): Part[] {
  const g = blank();
  both(g, (set) => {
    const at = (pts: [number, number][], w: number): void => { for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i] as [number, number], [x1, y1] = pts[i + 1] as [number, number], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 'v', w); } };
    at([[1, 18], [0, 12], [1, 6], [3, 2]], 2); set(3, 1, 'p', 2);
    at([[4, 17], [3, 11], [5, 6], [8, 3]], 1); set(8, 2, 'p');
  });
  return [part(g)];
}

/** The shoulders raised up either side of the jaw, ink at their edge, and the veins down the chest between them. */
function trim(): Part[] {
  const g = blank();
  both(g, (set) => {
    for (let y = 15; y < 24; y++) set(y < 17 ? 3 : 1, y, 'a', y < 17 ? 2 : 5);
    for (let y = 17; y < 24; y++) set(0, y, 'e');
    set(2, 15, 'e'); set(3, 14, 'e'); set(4, 14, 'e'); set(5, 15, 'e');
  });
  const v = blank();
  line(v, 10, 18, 8, 21, 'v'); line(v, 13, 18, 15, 22, 'v'); line(v, 8, 21, 11, 23, 'v');
  dots(v, [[8, 21], [15, 22]], 'p');
  return [part(g), part(v)];
}

export const VECNA_PORTRAIT: PortraitSpec = {
  bg: 'blood0', shirt: 'plain',
  pal: { s: 'grey2', d: 'grey1', b: 'bone', p: 'red', v: 'blood1', a: 'grey2' },
  back: back(),
  head: [skull()],
  faces: Object.fromEntries((Object.keys(FACES) as Expr[]).map((e) => [e, [face(FACES[e])]])) as Record<Expr, Part[]>,
  front: [],
  trim: trim(),
};
