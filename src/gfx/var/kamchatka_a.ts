// Kamchatka looks 1 and 2 (stage 4.1, see look_kit.ts and kamchatka.ts). "Blizzard" is deep blue night snow under one sodium
// floodlight with cold grey concrete inside; "Overcast" is a flat grey day, dirty trampled snow and drab green paint on the
// block's walls. The painters below take a Kit (one palette name per role), so kamchatka_b.ts reuses them for Rust and Frost and
// only adds its own walls and floors. Night looks are painted in daytime values for the night pass to darken. No noise: every
// speck comes from a hand made arrangement picked by the tile's variant.
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { dots, rects, trace } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';

/** One palette name for every role the shared painters need. */
export interface Kit {
  s: N; sHi: N; sPk: N; sLo: N; sDp: N; dirt?: N; // snow: field, drift body, drift crest, hollows, drift undersides, grime
  t: N; tHi: N; tLo: N;                        // the trodden path
  post: N; postHi: N; postLo: N; wire: N;      // the fence
  roof: N; roofHi: N; roofLo: N; lip: N; edge: N; // wall tops
  face: N; faceHi: N; faceLo: N;               // wall faces
  fl: N; flHi: N; flLo: N; joint: N;           // floors
  cell: N; bar: N; barHi: N;                   // barred doors and grates
}

const STREAK: number[][][] = [ // wind ridges as [x, y, length]
  [[1, 3, 4], [9, 6, 3], [4, 11, 5], [11, 14, 3]], [[6, 1, 3], [0, 7, 4], [10, 10, 4], [3, 14, 3]],
  [[2, 5, 3], [10, 2, 4], [6, 9, 3], [12, 13, 3]], [[8, 3, 4], [1, 9, 3], [7, 12, 4], [12, 7, 2]],
];
const GLINT: Pt[][] = [[[7, 2], [13, 9], [2, 8], [9, 13]], [[3, 5], [12, 4], [8, 8], [1, 12]], [[13, 6], [5, 3], [3, 11], [10, 12]], [[10, 1], [4, 7], [14, 11], [6, 14]]];
const DIRT: Pt[][] = [[[5, 5], [6, 5], [12, 12]], [[10, 3], [3, 10], [4, 10]], [[8, 7], [9, 7], [2, 2]], [[13, 13], [12, 13], [6, 1]]];
const RAG = [[2, 1, 1, 2, 3, 2, 1, 1, 2, 2, 1, 2, 3, 2, 1, 1], [1, 2, 2, 1, 1, 2, 3, 3, 2, 1, 1, 1, 2, 2, 1, 2], [3, 2, 1, 1, 2, 2, 1, 2, 1, 1, 2, 3, 3, 2, 1, 1], [1, 1, 2, 3, 2, 1, 1, 2, 2, 3, 2, 1, 1, 2, 1, 2]];
const RUT = [[0, 6, 9, 7], [2, 5, 8, 8], [0, 4, 7, 9], [3, 6, 10, 6]];
const BARB = [[1, 12], [4, 13], [2, 14], [3, 12]];
const SEAM = [3, 11, 7, 15]; // where the vertical joints of the wall top's two courses fall, by variant
const CRACK: Pt[][] = [[[3, 2], [6, 6], [5, 10], [9, 14]], [[12, 1], [10, 5], [13, 9], [11, 13]], [[1, 7], [5, 8], [8, 12]], [[7, 3], [9, 7], [14, 8]]];

const solid = (ch: string): boolean => ch === '#' || ch === 'W' || ch === 'b';
const open = (ch: string): boolean => ch === 't' || ch === 'c' || ch === '#';

/** Open snow: wind ridges (a lit dash with a shaded dash under it), a few glints, grime if the look has any. */
export function snow(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.s);
  for (const [x, y, n] of STREAK[c.v]) px.rect(x, y, n, 1, k.sHi).rect(x + 1, y + 1, n, 1, k.sLo);
  dots(px, GLINT[c.v], k.sHi);
  if (k.dirt) dots(px, DIRT[c.v], k.dirt);
  if (c.n === 'f') px.rect(0, 0, 16, 2, k.sLo);
  return px;
}

/** A dome of snow, lit upper left and shaded lower right, with a dark foot. Wide ones carry across two tiles. */
function dome(px: Px, k: Kit, cx: number, cy: number, rx: number, h: number): void {
  for (let y = cy - h; y <= cy; y++) {
    const t = (cy - y + 0.5) / (h + 1), hw = Math.round(rx * Math.sqrt(1 - t ** 2.4));
    px.rect(cx - hw, y, hw * 2, 1, k.sHi);
    if (y <= cy - h + 1) px.rect(cx - hw, y, y === cy - h ? hw : 3, 1, k.sPk);
    if (y >= cy - h / 2) px.rect(cx + hw - 3, y, 3, 1, k.s);
  }
  px.rect(cx - rx, cy + 1, rx * 2, 1, k.sLo).rect(cx - rx + 2, cy + 2, rx * 2 - 2, 1, k.sDp);
  px.rect(cx - 4, cy - Math.round(h / 2), 4, 1, k.sPk).rect(cx - 1, cy - 2, 4, 1, k.s);  // two wind ridges across the body
}

export function drift(k: Kit, c: TC): Px {
  const x0 = c.w === 'd' ? -15 : 1, x1 = c.e === 'd' ? 31 : 15;
  const px = snow(k, c);
  dome(px, k, (x0 + x1) / 2, 12, (x1 - x0) / 2, x1 - x0 > 14 ? 6 : 6 + (c.v & 1) * 2);
  return px;
}

/** The trodden path: ruts along its run, boot scuffs, and edges that fray into the snow on every side that isn't path. */
export function trail(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.t);
  const hz = open(c.e) || open(c.w), vt = open(c.n) || open(c.s), [a, l, b, m] = RUT[c.v];
  if (hz !== vt) for (const [p, n, y] of [[a, l, 5], [b, m, 10]]) { if (hz) px.rect(p, y, n, 1, k.tLo); else px.rect(y, p, 1, n, k.tLo); }
  dots(px, GLINT[c.v], k.tHi);
  dots(px, DIRT[c.v], k.dirt ?? k.tLo);
  for (let i = 0; i < 16; i++) {
    const r = RAG[c.v][i], hi = (i + c.v) & 1 ? k.s : k.sLo;
    if (!open(c.n)) px.rect(i, 0, 1, r, k.s).set(i, r, hi);
    if (!open(c.s)) px.rect(i, 16 - r, 1, r, k.s).set(i, 15 - r, hi);
    if (!open(c.w)) px.rect(0, i, r, 1, k.s).set(r, i, hi);
    if (!open(c.e)) px.rect(16 - r, i, r, 1, k.s).set(15 - r, i, hi);
  }
  return px;
}

/** The wire fence: a post with a snow cap and a heaped foot, three strands that sag between posts, slanted barbs with snow on some. */
export function fence(k: Kit, c: TC): Px {
  const px = snow(k, c);
  px.ellipse(8.5, 14.5, 6, 2, k.sLo).ellipse(8, 14, 5, 2, k.s).rect(6, 13, 4, 1, k.sHi);
  px.rect(7, 1, 1, 13, k.postHi).rect(8, 1, 1, 13, k.post).rect(9, 1, 1, 13, k.postLo).rect(7, 0, 3, 1, k.sHi);
  for (const y0 of [3, 7, 11]) {
    for (let x = 0; x < 16; x++) px.set(x, y0 + (x < 3 || x > 12 ? 1 : 0), k.wire);
    BARB[c.v].forEach((x, i) => {
      const y = y0 + (x < 3 || x > 12 ? 1 : 0), d = i ? -1 : 1;
      px.set(x - d, y - 1, k.wire).set(x + d, y + 1, k.wire);
      if (!i) px.set(x, y - 1, k.sHi);
    });
  }
  return px;
}

/** A wall top seen from above: slab joints, a lit rim on the exposed west side, a dark east edge, and a bright lip where a face drops below. */
export function cap(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.roof);
  px.rect(0, 7, 16, 1, k.roofLo).rect(SEAM[c.v], 0, 1, 7, k.roofLo).rect(SEAM[(c.v + 1) & 3] - 2, 8, 1, 7, k.roofLo);
  dots(px, GLINT[c.v], k.roofHi);
  if (c.w !== '#' && c.w !== 'W' && c.w !== 'b') px.rect(0, 0, 1, 16, k.lip);
  if (c.e !== '#') px.rect(14, 0, 1, 16, k.roofLo).rect(15, 0, 1, 16, k.edge);
  if (c.s === 'W' || c.s === 'b') px.rect(0, 13, 16, 1, k.lip).rect(0, 14, 16, 1, k.roofLo).rect(0, 15, 16, 1, k.edge);
  else if (c.s !== '#') px.rect(0, 14, 16, 2, k.edge);
  return px;
}

/** A cell door in the face: a dark opening in a frame (two tiles wide), a cot in the dark, vertical bars and two rails. */
export function bars(k: Kit, c: TC, face: Px): Px {
  const L = c.w !== 'b', R = c.e !== 'b', x0 = L ? 2 : 0, x1 = R ? 13 : 15;
  face.rect(x0, 2, x1 - x0 + 1, 13, k.cell).rect(x0, 2, x1 - x0 + 1, 1, k.barHi).rect(x0, 14, x1 - x0 + 1, 1, k.joint);
  if (L) face.rect(2, 2, 1, 13, k.barHi);
  if (R) face.rect(13, 2, 1, 13, k.bar);
  face.rect(L ? 4 : 0, 10, L ? 12 : 10, 2, k.faceLo).rect(L ? 4 : 9, 12, 1, 2, k.faceLo);
  for (const x of L && R ? [5, 8, 11] : L ? [5, 9, 13] : [1, 5, 9]) face.rect(x, 3, 1, 11, k.bar).set(x, 3, k.barHi);
  face.rect(x0 + 1, 5, x1 - x0 - 1, 1, k.bar).rect(x0 + 1, 11, x1 - x0 - 1, 1, k.bar);
  return face;
}

/** The shadow a wall throws on the floor south and east of it, and the path's slush blown in over the doorway sill. */
export function cast(px: Px, c: TC, k: Kit): void {
  if (solid(c.n)) px.rect(0, 0, 16, 1, k.joint).rect(0, 1, 16, 2, k.flLo);
  if (solid(c.w)) px.rect(0, 0, 1, 16, k.joint).rect(1, 0, 1, 16, k.flLo);
  if (c.w === 't') for (let y = 0; y < 16; y++) px.rect(0, y, RAG[c.v][y] + 1, 1, y & 1 ? k.t : k.tLo);
}

/** A floor of 16 px slabs: lit bevel, dark joints, a hairline crack, stains. */
export function pave(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.fl);
  px.rect(0, 0, 15, 1, k.flHi).rect(0, 0, 1, 15, k.flHi);
  dots(px, trace(CRACK[c.v]), k.flLo);
  dots(px, DIRT[c.v], k.flLo);
  px.rect(0, 15, 16, 1, k.joint).rect(15, 0, 1, 16, k.joint);
  cast(px, c, k);
  return px;
}

/** A drain grate set in the floor: a frame, a dark well and five slats. */
export function grate(k: Kit, px: Px): Px {
  px.rect(2, 2, 12, 12, k.cell).frame(2, 2, 12, 12, k.bar).rect(2, 2, 12, 1, k.barHi);
  for (let y = 4; y < 13; y += 2) px.rect(3, y, 10, 1, k.bar);
  return px.rect(2, 14, 12, 1, k.joint);
}

export type Paint = (c: TC, phase: number) => Px;
/** The tile painter of a look: its own wall face and floor, the shared painters for everything else. */
export function tiler(k: Kit, wall: Paint, floor: Paint): Paint {
  return (c, phase) => {
    switch (c.ch) {
      case 'd': return drift(k, c);
      case 't': return trail(k, c);
      case 'f': return fence(k, c);
      case '#': return cap(k, c);
      case 'W': return wall(c, phase);
      case 'b': return bars(k, c, wall(c, phase));
      case 'c': return floor(c, phase);
      case 'g': return grate(k, floor(c, phase));
      default: return snow(k, c);
    }
  };
}

/** Poured concrete panels: a shade under the lip, form tie holes, rain streaks, a seam on some tiles. */
const TIES: Pt[][] = [[[3, 6], [11, 6]], [[4, 5], [12, 9]], [[3, 9], [10, 4]], [[5, 7], [12, 7]]];
const RAIN: number[][] = [[4, 11], [7, 13], [2, 9], [6, 12]];
export function slab(k: Kit, c: TC): Px {
  const px = new Px(16).fill(k.face);
  px.rect(0, 0, 16, 2, k.faceLo).rect(0, 14, 16, 1, k.faceLo).rect(0, 15, 16, 1, k.joint);
  for (const x of RAIN[c.v]) px.rect(x, 2, 1, 4 + (x & 3), k.faceLo);
  if (c.v < 2) px.rect(15, 2, 1, 12, k.faceLo); else px.rect(0, 2, 1, 12, k.faceHi);
  for (const [x, y] of TIES[c.v]) px.rect(x, y, 2, 2, k.faceLo).set(x, y, k.joint).set(x + 2, y + 2, k.faceHi);
  return px;
}

/** A plastered block with a drab green dado: grey plaster above, oil paint below a lit stripe, bare patches where the paint has gone. */
const PEEL: number[][][] = [[[3, 8, 3, 2], [11, 11, 2, 2]], [[8, 7, 2, 3], [2, 12, 3, 1]], [[12, 9, 3, 2], [5, 7, 2, 1]], [[1, 10, 2, 3], [9, 12, 4, 1]]];
function dado(c: TC): Px {
  const px = new Px(16).fill('grey3');
  px.rect(0, 0, 16, 2, 'grey2').rect(0, 6, 16, 8, 'pine1').rect(0, 6, 16, 1, 'pine2').rect(0, 14, 16, 1, 'pine0').rect(0, 15, 16, 1, 'ink');
  for (const x of RAIN[c.v]) px.rect(x, 2, 1, 3, 'soil1');
  for (const [x, y, w, h] of PEEL[c.v]) px.rect(x, y, w, h, 'grey2').rect(x, y + h, w, 1, 'soil1').rect(x, y, w, 1, 'grey3');
  for (const x of [2 + c.v * 3, 12 - c.v]) px.rect(x, 7, 1, 2, 'pine2');
  if (c.v < 2) px.rect(15, 2, 1, 4, 'grey2').rect(15, 6, 1, 8, 'pine0');
  return px;
}

export interface Rig { pole: N; poleHi: N; poleLo: N; shell: N; shellHi: N; lens: N; foot: N }
/** The floodlight: a pole on a concrete foot and a lamp head. `lit` is the lens glow (or a dull lens when it's off). */
export function floodlight(r: Rig, lit: N): Px {
  const px = new Px(16, 32);
  px.rect(7, 7, 1, 23, r.poleHi).rect(8, 7, 1, 23, r.pole).rect(9, 7, 1, 23, r.poleLo).rect(4, 29, 8, 3, r.foot).rect(4, 29, 8, 1, r.poleHi);
  px.art(['..HHHHHHHHHHHH..', '.HSSSSSSSSSSSSD.', '.HSSSSSSSSSSSSD.', '.DLLLLLLLLLLLLD.', '..DLLLLLLLLLLD..', '...DDDDDDDDDD...'], { H: r.shellHi, S: r.shell, D: r.poleLo, L: r.lens }, 0, 1);
  return px.rect(4, 4, 8, 1, lit).rect(3, 7, 10, 1, r.poleLo).outline('ink');
}

const TONGUES: number[][][] = [ // per phase: [centre x, height, lean]
  [[5, 4, -1], [11, 5, 1], [8, 7, 1]], [[11, 3, 1], [5, 5, 0], [8, 6, -1]], [[4, 3, -1], [11, 4, 0], [7, 7, -1]], [[12, 3, -1], [6, 4, 0], [9, 6, 1]],
];
export interface Drum { body: N; hi: N; lo: N; rib: N; rim: N }
/** A burning oil drum: ribbed steel, a ring of rim, coals, and tongues of fire that lean and change with the phase. */
export function barrel(d: Drum, phase: number): Px {
  const px = new Px(16);
  px.rect(3, 8, 10, 7, d.body).rect(3, 8, 2, 7, d.hi).rect(11, 8, 2, 7, d.lo).rect(3, 10, 10, 1, d.rib).rect(3, 13, 10, 1, d.rib);
  px.ellipse(8, 8, 5.5, 2.2, d.rim).outline('ink').ellipse(8, 8, 4.2, 1.5, 'blood1').ellipse(8, 8.2, 3, 1, 'red');
  for (const [cx, h, lean] of TONGUES[phase & 3]) {
    for (let i = 0; i < h; i++) {
      const hw = Math.round((1 - i / h) * (h * 0.45 + 0.6)), x0 = cx + Math.round((lean * i * 2) / h);
      for (let dx = -hw; dx <= hw; dx++) px.set(x0 + dx, 7 - i, Math.abs(dx) === hw && i > 1 ? 'red' : Math.abs(dx) >= hw - 1 ? 'orange' : i < h / 2 && Math.abs(dx) <= 1 ? 'cream' : 'yellow');
    }
  }
  return px;
}

export interface Box { body: N; hi: N; lo: N; mark: N }
function crate(px: Px, x: number, y: number, w: number, h: number, b: Box): void {
  px.rect(x, y, w, h, b.body).rect(x + 1, y + 1, w - 2, 1, b.hi).rect(x + 1, y + 1, 1, h - 2, b.hi);
  px.line(x + 2, y + h - 3, x + w - 3, y + 2, b.lo).frame(x, y, w, h, b.lo).rect(x + 3, y + 3, 3, 1, b.mark);
}
/** Stacked supply crates, a Z brace and a stencil on each; `top` lays snow or frost along the upper edges. */
export function crates(b: Box, top?: N): Px {
  const px = new Px(32, 16);
  crate(px, 1, 5, 15, 11, b); crate(px, 17, 8, 14, 8, b); crate(px, 19, 1, 10, 7, b);
  px.rect(4, 11, 4, 1, b.mark);
  if (top) rects(px, [[2, 5, 13, 1], [20, 1, 8, 1], [17, 8, 2, 1], [29, 8, 2, 1]], top);
  return px.outline('ink');
}

const BLIZZARD: Kit = {
  s: 'slate', sHi: 'mist', sPk: 'bone', sLo: 'dusk', sDp: 'shadow', t: 'dusk', tHi: 'slate', tLo: 'shadow',
  post: 'mist', postHi: 'bone', postLo: 'slate', wire: 'black',
  roof: 'night', roofHi: 'dusk', roofLo: 'shadow', lip: 'mist', edge: 'ink', face: 'grey3', faceHi: 'mist', faceLo: 'grey2',
  fl: 'grey2', flHi: 'grey3', flLo: 'grey1', joint: 'ink', cell: 'black', bar: 'mist', barHi: 'bone',
};
const OVERCAST: Kit = {
  s: 'bone', sHi: 'white', sPk: 'white', sLo: 'grey3', sDp: 'grey2', dirt: 'soil1', t: 'grey3', tHi: 'bone', tLo: 'grey2',
  post: 'soil2', postHi: 'soil3', postLo: 'soil1', wire: 'grey1',
  roof: 'grey2', roofHi: 'grey3', roofLo: 'grey1', lip: 'bone', edge: 'ink', face: 'grey3', faceHi: 'bone', faceLo: 'grey2',
  fl: 'grey3', flHi: 'bone', flLo: 'grey2', joint: 'grey1', cell: 'ink', bar: 'grey3', barHi: 'bone',
};

export const rig = (pole: N, hi: N, lo: N, shell: N, shellHi: N, lens: N, foot: N): Rig => ({ pole, poleHi: hi, poleLo: lo, shell, shellHi, lens, foot });
const LAMP1 = rig('grey2', 'grey3', 'grey1', 'grey2', 'mist', 'amber', 'grey3');
const LAMP2 = rig('grey2', 'grey3', 'grey1', 'grey3', 'white', 'grey2', 'grey3');

export const KAMCHATKA_A: StageLook[] = [
  {
    slug: 'blizzard', name: 'Blizzard', night: true, glow: [600, 360, 30],
    note: 'Deep blue snow under one sodium floodlight, wind ridges in the drifts, and cold grey concrete inside the block with its bars just visible.',
    tile: tiler(BLIZZARD, (c) => slab(BLIZZARD, c), (c) => pave(BLIZZARD, c)),
    props: (phase): Prop[] => [
      { px: floodlight(LAMP1, phase & 1 ? 'yellow' : 'cream'), x: 40, y: 24 },
      { px: barrel({ body: 'grey2', hi: 'grey3', lo: 'grey1', rib: 'grey1', rim: 'grey3' }, phase), x: 96, y: 72 },
      { px: crates({ body: 'soil2', hi: 'soil3', lo: 'soil1', mark: 'sand' }, 'mist'), x: 208, y: 48 },
    ],
    lights: [[48, 29, 60, 1], [104, 80, 36, 0.75], [192, 62, 46, 0.7], [188, 140, 42, 0.6]],
  },
  {
    slug: 'overcast', name: 'Overcast', night: false, glow: [0, 0, 0],
    note: 'A flat grey day: dirty trampled snow, a switched off floodlight, and drab green oil paint on plaster inside the block.',
    tile: tiler(OVERCAST, (c) => dado(c), (c) => pave(OVERCAST, c)),
    props: (phase): Prop[] => [
      { px: floodlight(LAMP2, 'grey3'), x: 40, y: 24 },
      { px: barrel({ body: 'pine1', hi: 'pine2', lo: 'pine0', rib: 'pine0', rim: 'grey3' }, phase), x: 96, y: 72 },
      { px: crates({ body: 'pine1', hi: 'pine2', lo: 'pine0', mark: 'bone' }, 'white'), x: 208, y: 48 },
    ],
    lights: [],
  },
];
