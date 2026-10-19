// The map's Vecna's lair (docs/map-screen.md, "Chapter four on the map"; docs/level-13.md): the Creel House's twin in the Upside Down, the same
// house turned upside down and hanging by its hill from the underside of the earth, under the town it stands in. The map's own Creel House
// (map_house.ts) in the Upside Down's purples, drawn over again with everything pointing down: a clod of earth with the fence's pickets hanging
// from it, the turret on the left with its cone roof and finial pointing down, the gable like a spearhead, the dead tree reaching down, two
// windows and the turret's lit red, red vines down the walls, a few spores, and three long roots that go up from the clod to the cut edge of the
// earth it hangs from. Locked, the windows are dark and the roots dull (the caller greys the whole picture, as for every landmark). One bold
// shape in code. Pure pixel work.
import type { ColorName } from './palette.ts';
import { Px } from './px.ts';

/** The twin is 44 wide and 26 tall, with its outline's margin. */
export const LAIR_W = 44, LAIR_H = 26;

/** The clod of earth the house hangs from: a flat top where it meets the earth, a rounded underside lit red along its lip, with stones in it and the fence's pickets hanging from it. */
function clod(p: Px, lit: boolean): void {
  p.ellipse(22, 2, 20.5, 7, lit ? 'blood0' : 'night');
  p.ellipse(21, 1.2, 18.5, 5.4, lit ? 'blood1' : 'dusk').ellipse(21, 0.4, 17, 4.2, lit ? 'blood0' : 'night');
  for (const [x, y] of [[8, 4], [14, 6], [27, 5], [33, 3], [19, 3], [37, 5]] as const) p.set(x, y, lit ? 'blood1' : 'dusk').set(x + 1, y, lit ? 'red' : 'purple0');
  for (const x of [4, 6, 8, 10, 12, 31, 33, 35, 37, 39]) p.rect(x, 8, 1, 4, 'purple0').set(x, 11, 'purple');
  p.rect(3, 9, 10, 1, 'purple0').rect(30, 9, 10, 1, 'purple0');
}

/** The turret on the left, hanging: a round body, its cone roof pointing down with a finial, and a window lit red. */
function turret(p: Px, lit: boolean): void {
  p.rect(6, 6, 8, 10, 'purple0').rect(6, 6, 1, 10, 'purple').rect(13, 6, 1, 10, 'night');
  p.rect(4, 15, 12, 1, 'night').set(4, 15, 'purple');
  for (let i = 0; i < 8; i++) p.rect(5 + Math.ceil(i / 2), 16 + i, 10 - Math.ceil(i / 2) * 2, 1, 'purple').set(5 + Math.ceil(i / 2), 16 + i, 'magenta').set(14 - Math.ceil(i / 2), 16 + i, 'night');
  p.rect(9, 24, 2, 2, 'night').set(9, 25, 'purple');
  p.rect(8, 8, 4, 5, 'ink').rect(9, 9, 2, 3, lit ? 'blood1' : 'ink');
  if (lit) p.rect(9, 9, 2, 1, 'red').set(9, 11, 'hot').set(10, 10, 'hot');
}

/** The body on the right of it, hanging: two windows, a door at the top under a porch, the gable pointing down like a spearhead, a chimney under it. */
function body(p: Px, lit: boolean): void {
  p.rect(14, 6, 20, 8, 'purple0').rect(14, 6, 1, 8, 'purple').rect(33, 6, 1, 8, 'night');
  for (let i = 0; i < 9; i++) p.rect(13 + Math.ceil(i * 1.1), 14 + i, 22 - Math.ceil(i * 1.1) * 2, 1, 'purple').set(13 + Math.ceil(i * 1.1), 14 + i, 'magenta').set(34 - Math.ceil(i * 1.1), 14 + i, 'night');
  p.rect(12, 13, 24, 1, 'night').set(12, 13, 'purple');
  p.rect(27, 14, 3, 6, 'night').set(27, 14, 'purple0').rect(26, 19, 5, 1, 'purple0');
  for (const x of [16, 28]) p.rect(x, 9, 3, 4, 'ink').rect(x + 1, 10, 1, 2, lit ? 'blood1' : 'ink'), lit && p.rect(x + 1, 10, 1, 1, 'red');
  p.rect(21, 6, 5, 7, 'ink').rect(22, 7, 3, 6, 'night').rect(20, 11, 7, 1, 'purple');
  if (lit) p.set(23, 9, 'hot');
}

/** The dead tree on the far side, hanging from the clod, its branches reaching down. */
function tree(p: Px, lit: boolean): void {
  const [body, edge, root]: ColorName[] = lit ? ['blood1', 'red', 'blood0'] : ['dusk', 'purple0', 'night'];
  p.rect(38, 6, 2, 9, body).rect(38, 6, 1, 9, edge).rect(37, 5, 4, 1, root);
  p.line(38, 14, 35, 19, body).line(35, 19, 34, 22, body).line(39, 13, 42, 18, body).line(42, 18, 42, 21, body).line(39, 11, 36, 14, body);
}

/** A vine from the hill down a wall, a hot point at its tip when lit. */
function vine(p: Px, pts: readonly (readonly [number, number])[], lit: boolean): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i] as [number, number], [x1, y1] = pts[i + 1] as [number, number];
    p.line(x0 + 1, y0, x1 + 1, y1, lit ? 'blood0' : 'ink').line(x0, y0, x1, y1, lit ? (i & 1 ? 'red' : 'blood1') : 'night');
  }
  const [tx, ty] = pts[pts.length - 1] as [number, number];
  if (lit) p.set(tx, ty, 'hot');
}

/** The twin, 44 by 26: the house hanging under its hill, windows lit red when `lit`. */
export function lair(lit: boolean): Px {
  const p = new Px(LAIR_W, LAIR_H);
  tree(p, lit);
  body(p, lit);
  turret(p, lit);
  clod(p, lit);
  vine(p, [[16, 8], [15, 12], [17, 16], [16, 19]], lit);
  vine(p, [[33, 9], [31, 13], [32, 17], [30, 20]], lit);
  for (const [x, y] of [[2, 14], [41, 12], [24, 23], [18, 22], [30, 24]] as const) p.set(x, y, lit ? 'pink' : 'grey3');
  return p.outline('ink');
}

/** The roots that hold it up, from the top of the house's hill to the cut edge of the earth `drop` rows above it: three wavy vines with a red point
 *  every few rows, painted into `p` (the whole map) with the picture's top at (x, y). */
export function lairRoots(p: Px, x: number, y: number, drop: number, lit: boolean): void {
  for (const [dx, sway] of [[11, 1], [22, -1], [33, 1]] as const) {
    let cx = x + dx;
    for (let k = 0; k < drop; k++) {
      const yy = y - 1 - k;
      p.set(cx + 1, yy, lit ? 'blood0' : 'ink');
      p.set(cx, yy, lit ? (k % 6 === 4 ? 'red' : 'blood1') : 'night');
      if (k % 5 === 2) cx += sway * (k % 10 === 2 ? 1 : -1);
    }
  }
}
