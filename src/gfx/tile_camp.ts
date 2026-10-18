// The Kamchatka camp (stage 4.1), the owner's pick: Blizzard (gfx/var/kamchatka_a.ts, docs/level-10.md). Deep blue snow with wind ridges and
// glints, banks of it (a run of them is one long drift), a trodden path that frays into the snow, a wire fence on its posts with barbed
// strands that sag between them, and inside the block poured concrete: a wall top with slab joints over a face of panels (a cell door set in
// it, two tiles wide, with a cot behind the bars), a floor of slabs with a grate here and there. The yard has supply crates and burning oil
// drums standing on the ground the neighbors show, the drum's fire changing at every step of its pulse (tiles.ts). Everything is painted in
// day values, like the other night stages: the night pass (night.ts) turns the snow blue and dims the concrete, and leaves the drum's fire
// and the glints of its glow as they are, so they lead the eye with the floodlight. No noise: every speck is a hand made arrangement
// picked by the tile's variant. The painters take the sheet's context (TC), which `tcOf` builds from a tile's neighbors. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import { dots } from './paint_kit.ts';
import type { Pt } from './paint_kit.ts';
import type { Near, TileCtx } from './tile_ground.ts';

export const CAMP_TILES: TileName[] = ['snow', 'drift', 'snowpath', 'wire', 'campcap', 'campwall', 'celldoor', 'campfloor', 'grate', 'campcrate', 'barrel'];

/** What a painter knows about its place: the tile's letter, its variant (0 to 3), the letters of the four neighbors, and for a drift the run it is in. */
interface TC { ch: string; tx: number; ty: number; v: number; n: string; s: string; e: string; w: string; blk?: TileCtx['blk'] }

/** The letters the painters read the neighbors by: . snow, d drift, t path, f wire, # wall top, W wall face, b cell door, c floor (a grate is floor). */
const LETTER: Partial<Record<TileName, string>> = {
  snow: '.', drift: 'd', snowpath: 't', wire: 'f', campcap: '#', campwall: 'W', celldoor: 'b', campfloor: 'c', grate: 'c', campcrate: '.', barrel: '.',
};
const CH: Partial<Record<TileName, string>> = { ...LETTER, grate: 'g' };

function tcOf(c: TileCtx, name: TileName): TC {
  const l = (n: TileName): string => LETTER[n] ?? '.';
  return { ch: CH[name] ?? '.', tx: c.tx, ty: c.ty, v: hash2(c.tx, c.ty, 11) & 3, n: l(c.near.n), s: l(c.near.s), e: l(c.near.e), w: l(c.near.w), ...(c.blk ? { blk: c.blk } : {}) };
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
const TIES: Pt[][] = [[[3, 6], [11, 6]], [[4, 5], [12, 9]], [[3, 9], [10, 4]], [[5, 7], [12, 7]]];
const RAIN: number[][] = [[4, 11], [7, 13], [2, 9], [6, 12]];

/** Every pixel along a polyline, in order, with no repeats. */
function trace(pts: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Pt, b = pts[i + 1] as Pt;
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
    for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push([Math.round(a[0] + ((b[0] - a[0]) * k) / n), Math.round(a[1] + ((b[1] - a[1]) * k) / n)]);
  }
  return out;
}

const solid = (ch: string): boolean => ch === '#' || ch === 'W' || ch === 'b';
const open = (ch: string): boolean => ch === 't' || ch === 'c' || ch === '#';
const face = (ch: string): boolean => ch === 'W' || ch === 'b';

// ---------------------------------------------------------------- snow
/** Open snow: wind ridges (a lit dash with a shaded dash under it), a few glints, and the shadow of a wall face or the wire to the north. */
function snow(c: TC): Px {
  const px = new Px(16).fill('slate');
  for (const [x, y, n] of STREAK[c.v]) px.rect(x, y, n, 1, 'mist').rect(x + 1, y + 1, n, 1, 'dusk');
  dots(px, GLINT[c.v], 'mist');
  if (c.n === 'f') px.rect(0, 0, 16, 2, 'dusk');
  else if (face(c.n)) px.rect(0, 0, 16, 1, 'shadow').rect(0, 1, 16, 2, 'dusk');
  return px;
}

/** A dome of snow, lit upper left and shaded lower right, with a dark foot. */
function dome(px: Px, cx: number, cy: number, rx: number, h: number): void {
  for (let y = cy - h; y <= cy; y++) {
    const t = (cy - y + 0.5) / (h + 1), hw = Math.round(rx * Math.sqrt(1 - t ** 2.4));
    px.rect(cx - hw, y, hw * 2, 1, 'mist');
    if (y <= cy - h + 1) px.rect(cx - hw, y, y === cy - h ? hw : 3, 1, 'bone');
    if (y >= cy - h / 2) px.rect(cx + hw - 3, y, 3, 1, 'slate');
  }
  px.rect(cx - rx, cy + 1, rx * 2, 1, 'dusk').rect(cx - rx + 2, cy + 2, rx * 2 - 2, 1, 'shadow');
  px.rect(cx - 4, cy - Math.round(h / 2), 4, 1, 'bone').rect(cx - 1, cy - 2, 4, 1, 'slate'); // two wind ridges across the body
}

/** A bank of snow. A run of them is one dome across and down (the block the tile sits in), so two or three side by side are a long drift. */
function drift(c: TC): Px {
  const px = snow(c);
  const b = c.blk ?? { ox: 0, oy: 0, w: 1, h: 1 };
  const x0 = 1 - b.ox * 16, x1 = (b.w - b.ox) * 16 - 1, H = b.h * 16;
  const bump = (hash2(c.tx - b.ox, c.ty - b.oy, 5) & 1) * 2;
  dome(px, (x0 + x1) / 2, H - 4 - b.oy * 16, (x1 - x0) / 2, H - 10 + bump);
  return px;
}

/** The trodden path: ruts along its run, boot scuffs, and edges that fray into the snow on every side that isn't path. */
function trail(c: TC): Px {
  const px = new Px(16).fill('dusk');
  const hz = open(c.e) || open(c.w), vt = open(c.n) || open(c.s), [a, l, b, m] = RUT[c.v];
  if (hz !== vt) for (const [p, n, y] of [[a, l, 5], [b, m, 10]]) { if (hz) px.rect(p, y, n, 1, 'shadow'); else px.rect(y, p, 1, n, 'shadow'); }
  dots(px, GLINT[c.v], 'slate');
  dots(px, DIRT[c.v], 'shadow');
  for (let i = 0; i < 16; i++) {
    const r = RAG[c.v][i], hi = (i + c.v) & 1 ? 'slate' : 'dusk';
    if (!open(c.n)) px.rect(i, 0, 1, r, 'slate').set(i, r, hi);
    if (!open(c.s)) px.rect(i, 16 - r, 1, r, 'slate').set(i, 15 - r, hi);
    if (!open(c.w)) px.rect(0, i, r, 1, 'slate').set(r, i, hi);
    if (!open(c.e)) px.rect(16 - r, i, r, 1, 'slate').set(15 - r, i, hi);
  }
  return px;
}

// ---------------------------------------------------------------- the wire
/** The post with its snow cap and its heaped foot. */
function post(px: Px): void {
  px.ellipse(8.5, 14.5, 6, 2, 'dusk').ellipse(8, 14, 5, 2, 'slate').rect(6, 13, 4, 1, 'mist');
  px.rect(7, 1, 1, 13, 'bone').rect(8, 1, 1, 13, 'mist').rect(9, 1, 1, 13, 'slate').rect(7, 0, 3, 1, 'mist');
}

/** The wire fence: a post with a snow cap and a heaped foot. Along a row three strands sag between posts with slanted barbs, snow on one; down a column they run away as three lines. */
function fence(c: TC): Px {
  const px = snow(c);
  const across = c.e === 'f' || c.w === 'f', down = c.n === 'f' || c.s === 'f';
  post(px);
  if (across || !down) {
    for (const y0 of [3, 7, 11]) {
      for (let x = 0; x < 16; x++) px.set(x, y0 + (x < 3 || x > 12 ? 1 : 0), 'black');
      BARB[c.v].forEach((x, i) => {
        const y = y0 + (x < 3 || x > 12 ? 1 : 0), d = i ? -1 : 1;
        px.set(x - d, y - 1, 'black').set(x + d, y + 1, 'black');
        if (!i) px.set(x, y - 1, 'mist');
      });
    }
  }
  if (down) {
    for (const x0 of [4, 8, 12]) {
      for (let y = 0; y < 16; y++) if (x0 !== 8 || y < 1 || y > 13) px.set(x0 + (y > 11 ? 1 : 0), y, 'black');
      BARB[c.v].forEach((y, i) => { px.set(x0 - 1 + (i & 1) * 2, y - 1, 'black'); });
    }
    px.rect(7, 0, 3, 1, 'mist');
  }
  return px;
}

// ---------------------------------------------------------------- the block
/** A wall top seen from above: slab joints, a lit rim on the exposed west side, a dark east edge, and a bright lip where a face drops below. */
function cap(c: TC): Px {
  const px = new Px(16).fill('night');
  px.rect(0, 7, 16, 1, 'shadow').rect(SEAM[c.v], 0, 1, 7, 'shadow').rect(SEAM[(c.v + 1) & 3] - 2, 8, 1, 7, 'shadow');
  dots(px, GLINT[c.v], 'dusk');
  if (c.w !== '#' && c.w !== 'W' && c.w !== 'b') px.rect(0, 0, 1, 16, 'mist');
  if (c.e !== '#') px.rect(14, 0, 1, 16, 'shadow').rect(15, 0, 1, 16, 'ink');
  if (face(c.s)) px.rect(0, 13, 16, 1, 'mist').rect(0, 14, 16, 1, 'shadow').rect(0, 15, 16, 1, 'ink');
  else if (c.s !== '#') px.rect(0, 14, 16, 2, 'ink');
  return px;
}

/** Poured concrete panels: a shade under the lip, form tie holes, rain streaks, a seam on some tiles. */
function slab(c: TC): Px {
  const px = new Px(16).fill('grey3');
  px.rect(0, 0, 16, 2, 'grey2').rect(0, 14, 16, 1, 'grey2').rect(0, 15, 16, 1, 'ink');
  for (const x of RAIN[c.v]) px.rect(x, 2, 1, 4 + (x & 3), 'grey2');
  if (c.v < 2) px.rect(15, 2, 1, 12, 'grey2'); else px.rect(0, 2, 1, 12, 'mist');
  for (const [x, y] of TIES[c.v]) px.rect(x, y, 2, 2, 'grey2').set(x, y, 'ink').set(x + 2, y + 2, 'mist');
  return px;
}

/** A cell door in the face: a dark opening in a frame (two tiles wide), a cot in the dark, vertical bars and two rails. */
function bars(c: TC): Px {
  const px = slab(c);
  const L = c.w !== 'b', R = c.e !== 'b', x0 = L ? 2 : 0, x1 = R ? 13 : 15;
  px.rect(x0, 2, x1 - x0 + 1, 13, 'black').rect(x0, 2, x1 - x0 + 1, 1, 'bone').rect(x0, 14, x1 - x0 + 1, 1, 'ink');
  if (L) px.rect(2, 2, 1, 13, 'bone');
  if (R) px.rect(13, 2, 1, 13, 'mist');
  px.rect(L ? 4 : 0, 10, L ? 12 : 10, 2, 'grey2').rect(L ? 4 : 9, 12, 1, 2, 'grey2');
  for (const x of L && R ? [5, 8, 11] : L ? [5, 9, 13] : [1, 5, 9]) px.rect(x, 3, 1, 11, 'mist').set(x, 3, 'bone');
  px.rect(x0 + 1, 5, x1 - x0 - 1, 1, 'mist').rect(x0 + 1, 11, x1 - x0 - 1, 1, 'mist');
  return px;
}

/** A floor of 16 px slabs: lit bevel, dark joints, a hairline crack, stains, the shadow a wall throws on it and the slush blown in from the path. */
function pave(c: TC): Px {
  const px = new Px(16).fill('grey2');
  px.rect(0, 0, 15, 1, 'grey3').rect(0, 0, 1, 15, 'grey3');
  dots(px, trace(CRACK[c.v]), 'grey1');
  dots(px, DIRT[c.v], 'grey1');
  px.rect(0, 15, 16, 1, 'ink').rect(15, 0, 1, 16, 'ink');
  if (solid(c.n)) px.rect(0, 0, 16, 1, 'ink').rect(0, 1, 16, 2, 'grey1');
  if (solid(c.w)) px.rect(0, 0, 1, 16, 'ink').rect(1, 0, 1, 16, 'grey1');
  if (c.w === 't') for (let y = 0; y < 16; y++) px.rect(0, y, RAG[c.v][y] + 1, 1, y & 1 ? 'dusk' : 'shadow');
  return px;
}

/** A drain grate set in the floor: a frame, a dark well and five slats. */
function grate(c: TC): Px {
  const px = pave(c);
  px.rect(2, 2, 12, 12, 'black').frame(2, 2, 12, 12, 'mist').rect(2, 2, 12, 1, 'bone');
  for (let y = 4; y < 13; y += 2) px.rect(3, y, 10, 1, 'mist');
  return px.rect(2, 14, 12, 1, 'ink');
}

// ---------------------------------------------------------------- the yard's dressing
/** The ground a crate or a drum stands on: the block's slabs where the neighbors are the block's floor, the yard's snow everywhere else. */
function ground(c: TileCtx, t: TC): Px {
  const floors = Object.values(c.near).filter((n) => n === 'campfloor' || n === 'grate').length;
  const snows = Object.values(c.near).filter((n) => n === 'snow' || n === 'snowpath' || n === 'drift' || n === 'wire').length;
  return floors > snows ? pave(t) : snow(t);
}

/** A supply crate, a Z brace and a stencil on it, snow along its top edge. */
function crate(px: Px, x: number, y: number, w: number, h: number): void {
  px.rect(x, y, w, h, 'soil2').rect(x + 1, y + 1, w - 2, 1, 'soil3').rect(x + 1, y + 1, 1, h - 2, 'soil3');
  px.line(x + 2, y + h - 3, x + w - 3, y + 2, 'soil1').frame(x, y, w, h, 'soil1').rect(x + 3, y + 3, 3, 1, 'sand');
}

/** Supply crates: one big one, or two stacked, by the tile's place, so a row of them alternates. */
function crates(c: TileCtx, t: TC): Px {
  const obj = new Px(16);
  if (c.tx & 1) {
    crate(obj, 1, 8, 14, 8); crate(obj, 3, 1, 10, 7);
    obj.rect(4, 12, 4, 1, 'sand').rect(4, 8, 8, 1, 'mist').rect(4, 1, 6, 1, 'mist');
  } else {
    crate(obj, 1, 4, 14, 12);
    obj.rect(4, 10, 4, 1, 'sand').rect(2, 4, 12, 1, 'mist');
  }
  return ground(c, t).blit(obj.outline('ink'), 0, 0);
}

/** The spurts of the drum's fire, by step of its pulse: [center x, height, lean] for each tongue. */
const TONGUES: number[][][] = [
  [[5, 4, -1], [11, 5, 1], [8, 7, 1]], [[11, 3, 1], [5, 5, 0], [8, 6, -1]], [[4, 3, -1], [11, 4, 0], [7, 7, -1]], [[12, 3, -1], [6, 4, 0], [9, 6, 1]],
];
/** Where the firelight falls on the snow beside the drum: a dithered warm fleck, more at the foot of it. */
const FIRELIGHT: Pt[] = [[1, 9], [0, 12], [2, 14], [14, 10], [15, 13], [13, 15], [0, 7], [15, 8], [2, 11], [13, 12]];

/** A burning oil drum: ribbed steel, a ring of rim, coals, and tongues of fire that lean and change with the phase, on the ground it stands on with its light on it. */
export function campBarrel(c: TileCtx, phase: number): Px {
  const t = tcOf(c, 'barrel'), px = ground(c, t);
  dots(px, FIRELIGHT.filter((_, i) => (i + phase) % 3 !== 2), 'blood1');
  dots(px, FIRELIGHT.filter((_, i) => i % 3 === phase % 3 && i < 6), 'orange');
  const obj = new Px(16);
  obj.rect(3, 8, 10, 7, 'grey2').rect(3, 8, 2, 7, 'grey3').rect(11, 8, 2, 7, 'grey1').rect(3, 10, 10, 1, 'grey1').rect(3, 13, 10, 1, 'grey1');
  obj.ellipse(8, 8, 5.5, 2.2, 'grey3').outline('ink').ellipse(8, 8, 4.2, 1.5, 'blood1').ellipse(8, 8.2, 3, 1, 'red');
  for (const [cx, h, lean] of TONGUES[phase & 3]) {
    for (let i = 0; i < h; i++) {
      const hw = Math.round((1 - i / h) * (h * 0.45 + 0.6)), x0 = cx + Math.round((lean * i * 2) / h);
      for (let dx = -hw; dx <= hw; dx++) obj.set(x0 + dx, 7 - i, Math.abs(dx) === hw && i > 1 ? 'red' : Math.abs(dx) >= hw - 1 ? 'orange' : i < h / 2 && Math.abs(dx) <= 1 ? 'cream' : 'yellow');
    }
  }
  return px.blit(obj, 0, 0);
}

const PAINT: Partial<Record<TileName, (c: TC) => Px>> = { snow, drift, snowpath: trail, wire: fence, campcap: cap, campwall: slab, celldoor: bars, campfloor: pave, grate };

/** A camp tile, or null when `name` isn't one. */
export function campTile(name: TileName, c: TileCtx): Px | null {
  if (name === 'campcrate') return crates(c, tcOf(c, name));
  if (name === 'barrel') return campBarrel(c, 0);
  const paint = PAINT[name];
  return paint ? paint(tcOf(c, name)) : null;
}

/** The camp's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function campNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'snow': return v === 2 ? { n: 'campwall', e: name, s: name, w: name } : v === 1 ? { n: 'wire', e: name, s: name, w: name } : all(name);
    case 'drift': return all('snow');
    case 'snowpath': return v === 0 ? { n: 'snow', e: name, s: 'snow', w: name } : v === 1 ? { n: name, e: 'snow', s: name, w: 'snow' } : { n: 'snow', e: 'campfloor', s: name, w: 'snow' };
    case 'wire': return v === 0 ? { n: 'snow', e: name, s: 'snow', w: name } : v === 1 ? { n: name, e: 'snow', s: name, w: 'snow' } : { n: 'snow', e: name, s: name, w: 'snow' };
    case 'campcap': return v === 0 ? { n: name, e: name, s: 'campwall', w: name } : v === 1 ? { n: 'snow', e: name, s: 'campwall', w: 'snow' } : { n: 'snow', e: 'snow', s: 'campwall', w: name };
    case 'campwall': return v === 0 ? { n: 'campcap', e: name, s: 'campfloor', w: name } : v === 1 ? { n: 'campcap', e: 'campfloor', s: 'snow', w: name } : { n: 'campcap', e: name, s: 'snow', w: 'campfloor' };
    case 'celldoor': return v === 0 ? { n: 'campcap', e: name, s: 'campfloor', w: 'campwall' } : v === 1 ? { n: 'campcap', e: 'campwall', s: 'campfloor', w: name } : { n: 'campcap', e: 'campwall', s: 'campfloor', w: 'campwall' };
    case 'campfloor': return v === 0 ? all(name) : v === 1 ? { n: 'campwall', e: name, s: name, w: name } : { n: 'campwall', e: name, s: name, w: 'snowpath' };
    case 'grate': return all('campfloor');
    case 'campcrate': return v === 2 ? all('campfloor') : all('snow');
    case 'barrel': return v === 2 ? all('campfloor') : all('snow');
    default: return near;
  }
}
