// The tiles of the Hellfire Club room (hellfire.ts, stage 4.2), shared by all four looks: a Hawkins High classroom after hours.
// Painted blocks of wall with a rubber base, a checker linoleum floor, a chalkboard three tiles wide with the club's doodles on
// it, two windows, two posters, a door, a bookshelf of rule books, and student desks with their chairs. A look gives a Kit (one
// palette name for every role), a glass painter for the windows and, if it wants, an overlay (light on the floor, say). Night
// looks are painted in daytime values for the night pass to darken. The painters read only the tile's letter, variant,
// neighbors and tx, ty parity (the tile cache keys on those), so a tile can be tall or wide by looking at its neighbors.
import type { ColorName as N } from '../palette.ts';
import { hash2, px32 } from '../canvas.ts';
import { Px } from '../px.ts';
import type { TC } from './look_kit.ts';

export interface PosterKit { bg: N; a: N; b: N; c: N }
export interface Kit {
  top: N; topHi: N;                          // the wall top and its lit edge
  wall: N; wallHi: N; wallLo: N;             // painted block: the field, the lit row of each course, the mortar
  base: N; baseHi: N; baseLo: N;             // rubber cove base
  fa: N; fb: N; fHi: N; fLo: N; shade: N;    // linoleum: the two squares, lit edge, grout, the wall's shadow
  wood: N; woodHi: N; woodLo: N;             // board frame, door, bookcase
  board: N; boardHi: N; chalk: N; chalk2: N; // the chalkboard and its chalk
  frame: N; frameHi: N; slot: N;             // window frame, its sill, the door's little window
  desk: N; deskHi: N; deskLo: N; leg: N; seat: N; seatLo: N;
  books: N[];
  poster: PosterKit;
}
export type Glass = (px: Px, c: TC, g0: number, g1: number, phase: number) => void;
export interface Parts { k: Kit; glass: Glass; fx?: (px: Px, c: TC, phase: number) => void }
export const isWall = (ch: string): boolean => '#WCPwDS'.includes(ch);

/** A wall top seen from above: one solid color with a thin lit edge where it meets the face and where it looks out over the room. */
function crown(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.top);
  if (c.s !== '#') px.rect(0, 15, 16, 1, k.topHi);
  if (!isWall(c.n)) px.rect(0, 0, 16, 1, k.topHi);
  if (!isWall(c.w)) px.rect(0, 0, 1, 16, k.topHi);
  return px;
}

/** A wall face: painted cinder block in two courses with the joints stepped, a shaded top row, a black rubber base. */
export function face(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.wall);
  px.rect(0, 0, 16, 1, k.wallLo).rect(0, 1, 16, 1, k.wallHi).rect(0, 7, 16, 1, k.wallHi).rect(0, 6, 16, 1, k.wallLo);
  px.rect(8, 2, 1, 4, k.wallLo).rect(0, 8, 1, 4, k.wallLo);
  if (c.v === 2) px.rect(11, 2, 3, 1, k.wallLo).set(3, 9, k.wallLo);
  px.rect(0, 12, 16, 1, k.baseHi).rect(0, 13, 16, 2, k.base).rect(0, 15, 16, 1, k.baseLo);
  return px;
}

// ---------------------------------------------------------------- posters
const SKULL = ['..aaaaaa..', '.aaaaaaaa.', 'aaaaaaaaaa', 'aabbaabbaa', 'aabbaabbaa', '.aaabbaaa.', '..aaaaaa..', '..a.aa.a..', '..........', 'cc.cc.ccc.'];
const BOLT = ['aaaaaaaaaa', 'a....cc..a', 'a...cc...a', 'a..cc....a', 'a..cccc..a', 'a....cc..a', 'a...cc...a', 'a..cc....a', 'a.c......a', 'bbb.bb.bbb'];
function poster(px: Px, p: PosterKit, kind: number): void {
  px.rect(4, 2, 10, 10, 'ink').rect(3, 1, 10, 10, p.bg).art(kind ? BOLT : SKULL, { a: p.a, b: p.b, c: p.c }, 3, 1);
  px.set(3, 1, p.c).set(12, 1, p.c);
}

// ---------------------------------------------------------------- the chalkboard
/** The board is three tiles: the left has the club's notes, the middle a d20, the right a dungeon room map. */
function board(k: Kit, c: TC): Px {
  const px = face(k, c);
  const L = c.w !== 'C', R = c.e !== 'C', x0 = L ? 1 : 0, x1 = R ? 14 : 15;
  px.rect(x0, 1, x1 - x0 + 1, 10, 'ink');
  const a = x0 + (L ? 1 : 0), b = x1 - (R ? 1 : 0);
  px.rect(a, 2, b - a + 1, 9, k.wood).rect(a, 2, b - a + 1, 1, k.woodHi).rect(a, 10, b - a + 1, 1, k.woodLo);
  const ba = a + (L ? 1 : 0), bb = b - (R ? 1 : 0);
  px.rect(ba, 3, bb - ba + 1, 7, k.board);
  px.rect(ba + 2, 4, 5, 1, k.boardHi).rect(ba + 6, 7, 6, 1, k.boardHi);
  if (L) {
    px.rect(4, 4, 8, 1, k.chalk).rect(4, 6, 10, 1, k.chalk2).rect(4, 8, 5, 1, k.chalk).set(11, 8, k.chalk);
  } else if (!R) {
    px.line(8, 3, 12, 5, k.chalk).line(12, 5, 12, 7, k.chalk).line(12, 7, 8, 9, k.chalk).line(8, 9, 4, 7, k.chalk).line(4, 7, 4, 5, k.chalk).line(4, 5, 8, 3, k.chalk);
    px.line(8, 4, 10, 7, k.chalk2).line(10, 7, 6, 7, k.chalk2).line(6, 7, 8, 4, k.chalk2);
  } else {
    px.frame(2, 4, 5, 4, k.chalk).frame(8, 5, 5, 4, k.chalk).rect(6, 6, 3, 1, k.chalk2).set(3, 5, k.chalk2).set(10, 7, k.chalk2).set(11, 6, k.chalk2);
  }
  px.rect(a + 3, 10, 3, 1, k.chalk).set(b - 3, 10, k.chalk2);
  return px;
}

// ---------------------------------------------------------------- windows, the door, the bookcase
/** A window two tiles wide (left half when c.w isn't a window, right half when c.e isn't): ink edge, frame, a sill, glass from `glass`, one cross bar. */
function windowTile(k: Kit, c: TC, glass: Glass, phase: number): Px {
  const px = face(k, c), L = c.w !== 'w', R = c.e !== 'w';
  const x0 = L ? 1 : 0, x1 = R ? 14 : 15, g0 = L ? 3 : 2, g1 = R ? 12 : 13;
  px.rect(x0, 1, x1 - x0 + 1, 10, 'ink');
  const a = x0 + (L ? 1 : 0), b = x1 - (R ? 1 : 0);
  px.rect(a, 2, b - a + 1, 9, k.frame);
  glass(px, c, g0, g1, phase);
  px.rect(g0, 6, g1 - g0 + 1, 1, k.frame).rect(x0, 11, x1 - x0 + 1, 1, k.frameHi);
  return px;
}

/** A classroom door with its narrow window, a kick plate and a handle. */
function doorTile(k: Kit, c: TC): Px {
  const px = face(k, c);
  px.rect(1, 1, 14, 15, 'ink').rect(2, 2, 12, 14, k.woodLo).rect(3, 3, 10, 13, k.wood).rect(3, 3, 10, 1, k.woodHi).rect(3, 3, 1, 13, k.woodHi);
  px.rect(6, 5, 4, 6, 'ink').rect(7, 6, 2, 4, k.slot).rect(7, 6, 1, 4, k.frameHi).rect(3, 13, 10, 2, k.leg).rect(3, 13, 10, 1, k.frameHi).rect(11, 9, 2, 2, k.frameHi).set(12, 10, k.leg);
  return px;
}

/** A bookcase two tiles wide: three bays of rule books and binders, the lowest only half full. */
function shelfTile(k: Kit, c: TC): Px {
  const px = face(k, c), L = c.w !== 'S', R = c.e !== 'S', x0 = L ? 1 : 0, x1 = R ? 14 : 15;
  px.rect(x0, 0, x1 - x0 + 1, 16, 'ink');
  const a = x0 + (L ? 1 : 0), b = x1 - (R ? 1 : 0), n = b - a + 1;
  px.rect(a, 1, n, 14, k.wood).rect(a, 1, n, 1, k.woodHi);
  [[2, 5], [7, 10], [12, 14]].forEach(([y0, y1], bi) => {
    px.rect(a, y0 as number, n, (y1 as number) - (y0 as number) + 1, k.woodLo);
    let x = a;
    while (x <= b) {
      const h = hash2(x + (c.tx & 1) * 16, bi, 91), w = 2 + ((h >> 3) & 1), hh = Math.min((y1 as number) - (y0 as number) + 1, 2 + ((h >> 5) % 3));
      if (bi === 2 && x > a + 6) break;
      if (x + w - 1 > b) break;
      px.rect(x, (y1 as number) - hh + 1, w, hh, k.books[h % k.books.length] as N).set(x, (y1 as number) - hh + 1, k.woodHi);
      x += w + (h & 16 ? 1 : 0);
    }
  });
  px.rect(a, 6, n, 1, k.woodHi).rect(a, 11, n, 1, k.woodHi);
  return px;
}

// ---------------------------------------------------------------- the floor and the desks
/** Linoleum in 8 px squares laid on the room's grid so they run on across tiles, a lit top left and a dark grout, a fleck here and there. */
export function floor(k: Kit, c: TC): Px {
  const px = new Px(16);
  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      const x = qx * 8, y = qy * 8, dark = ((c.tx * 2 + qx + c.ty * 2 + qy) & 1) === 1;
      px.rect(x, y, 8, 8, dark ? k.fb : k.fa).rect(x, y + 7, 8, 1, k.fLo).rect(x + 7, y, 1, 8, k.fLo);
      if (!dark) px.rect(x, y, 7, 1, k.fHi).rect(x, y, 1, 7, k.fHi);
      if (!(hash2(c.tx * 2 + qx, c.ty * 2 + qy, 7) % 7)) px.set(x + 3 + (qx ^ qy), y + 3, dark ? k.fHi : k.fLo);
    }
  }
  if (isWall(c.n)) px.rect(0, 0, 16, 2, k.shade);
  return px;
}

/** Light on the floor: inside a box, each floor color becomes the one a step brighter (from[i] to to[i]), so the squares keep their pattern. */
export function lightFloor(px: Px, from: readonly N[], to: readonly N[], x0: number, y0: number, x1: number, y1: number): void {
  const map = new Map(from.map((f, i) => [px32(f), px32(to[i] as N)]));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const v = map.get(px.get(x, y)); if (v !== undefined) px.d[y * 16 + x] = v; }
}

/** A student desk with its chair tucked behind it, over the floor: a laminate top with a book, papers or a pencil, steel legs. */
function deskTile(k: Kit, c: TC): Px {
  const px = floor(k, c), d = new Px(16);
  d.rect(3, 11, 1, 4, k.leg).rect(12, 11, 1, 4, k.leg).rect(4, 11, 8, 2, k.seat).rect(4, 13, 8, 2, k.seatLo);
  d.rect(2, 2, 12, 8, k.desk).rect(2, 2, 12, 1, k.deskHi).rect(2, 2, 1, 8, k.deskHi).rect(2, 9, 12, 1, k.deskLo).rect(13, 2, 1, 8, k.deskLo).rect(2, 10, 12, 1, k.leg);
  if (c.v === 0) d.rect(4, 4, 5, 4, k.books[0] as N).rect(4, 7, 5, 1, 'white');
  else if (c.v === 1) d.rect(5, 4, 6, 4, 'white').rect(6, 5, 4, 1, 'mist').rect(6, 7, 3, 1, 'mist');
  else if (c.v === 2) d.rect(4, 5, 4, 3, k.books[1] as N).line(8, 7, 12, 4, 'yellow');
  else d.rect(9, 4, 3, 4, 'white').set(4, 6, k.deskLo).set(5, 5, k.deskLo);
  px.rect(2, 15, 13, 1, k.fLo);
  return px.blit(d.outline('ink'), 0, 0);
}

/** The tile painter of a look: the shared painters with the look's own kit and glass, then its overlay. */
export function tiler(p: Parts): (c: TC, phase: number) => Px {
  return (c, phase) => {
    let px: Px;
    switch (c.ch) {
      case '#': px = crown(p.k, c); break;
      case 'C': px = board(p.k, c); break;
      case 'P': px = face(p.k, c); poster(px, p.k.poster, c.tx & 1); break;
      case 'w': px = windowTile(p.k, c, p.glass, phase); break;
      case 'D': px = doorTile(p.k, c); break;
      case 'S': px = shelfTile(p.k, c); break;
      case '.': px = floor(p.k, c); break;
      case 'd': px = deskTile(p.k, c); break;
      default: px = face(p.k, c);
    }
    p.fx?.(px, c, phase);
    return px;
  };
}
