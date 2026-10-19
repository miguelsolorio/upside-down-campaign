// The trailer park and the roof of Eddie's trailer (stage 4.3), in the Blue storm look of tile_udtown.ts and its two kits (the night between
// bolts, and the bolt). The sheet had none of these, so they are the game's own, painted with the sheet's palette roles: a trailer's front
// with its roof cap, its ribbed siding with a red stripe, a window or a door, and the skirting, a run of trailers one long home; a chain link
// fence on posts (or standing end on, when it runs north and south); a dead tree with red pods; and the roof deck, the song's arena, the
// flat roof of the trailer in standing seam sheet metal with puddles and a crack that glows, with the lip of its parapet round it. The
// lit edges (the roof's drip edge, a rail, a post, the coping) are the kit's, so a bolt floods them red, and the wet things streak bright.
// Painted in daytime values, for the night pass. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { kitOf, tcOf } from './tile_udtown.ts';
import { lawn, spores, vine } from './var/hawkinsud_a.ts';
import type { Kit } from './var/hawkinsud_a.ts';
import type { TC } from './var/look_kit.ts';
import { vein } from './var/tunnel_paint.ts';

export const PARK_TILES: TileName[] = ['udtrailer', 'udfence', 'udtree', 'roofdeck', 'roofedge'];

/** The lawn under a thing that stands on it, with no house or walk to shade it. */
const ground = (k: Kit, c: TC): Px => lawn(k, { ...c, ch: 'g', n: 'g', s: 'g', e: 'g', w: 'g' });

// ---------------------------------------------------------------- the trailer
/** A mobile home's front: a roof cap (ribbed, with its drip edge lit) on the top tile of a run, ribbed aluminum, a red stripe and skirting on the bottom one, and a sliding window or a door. */
function trailer(k: Kit, c: TC, flash: boolean): Px {
  const top = c.n !== 'T', bot = c.s !== 'T', l = c.w !== 'T', r = c.e !== 'T';
  const px = new Px(16).fill(k.rf);
  const y0 = top ? 6 : 0, y1 = bot ? 11 : 16;
  for (let y = y0 + 2; y < y1; y += 4) px.rect(0, y, 16, 1, k.fr);
  if (top) {
    px.rect(0, 0, 16, 5, k.fr).rect(0, 0, 16, 1, 'ink').rect(0, 4, 16, 1, k.lip).rect(0, 5, 16, 1, 'ink');
    for (let x = (c.tx & 1) * 2; x < 16; x += 4) px.rect(x, 1, 1, 3, k.rfLo);
  }
  if (bot) {
    px.rect(0, 11, 16, 1, flash ? 'red' : 'blood1').rect(0, 12, 16, 1, 'blood0').rect(0, 13, 16, 3, k.sdLo).rect(0, 15, 16, 1, 'ink');
    for (let x = 1; x < 16; x += 3) px.rect(x, 13, 1, 2, k.rfLo);
  }
  const wy = top ? 7 : 3;
  if (c.v === 1 && bot) {
    px.rect(4, wy, 8, 6, 'ink').rect(5, wy + 1, 6, 5, k.dr).rect(5, wy + 1, 1, 5, k.drHi).rect(6, wy + 1, 4, 2, k.pane).frame(6, wy + 3, 4, 3, k.drLo).set(9, wy + 4, k.slHi);
    px.rect(3, 13, 10, 1, k.slHi).rect(2, 14, 12, 1, k.slLo);
  } else if (c.v !== 3) {
    px.rect(3, wy, 10, 5, 'ink').rect(4, wy + 1, 8, 3, k.pane).rect(8, wy + 1, 1, 3, k.fr).rect(3, wy + 4, 10, 1, k.slHi);
    px.set(5, wy + 1, k.glint).set(6, wy + 2, k.glint);
    if (c.v === 0) px.rect(9, wy + 1, 3, 3, k.lit).rect(9, wy + 1, 3, 1, 'blood0');
  } else {
    px.rect(5, wy, 6, 3, 'ink').rect(6, wy + 1, 4, 1, k.slHi).set(7, wy + 1, k.rfLo).set(9, wy + 1, k.rfLo);
  }
  if (l) px.rect(0, 0, 1, 16, 'ink').rect(1, top ? 5 : 0, 1, bot ? 8 : 16, k.drHi);
  if (r) px.rect(15, 0, 1, 16, 'ink').rect(14, top ? 5 : 0, 1, bot ? 8 : 16, k.sdLo);
  return px;
}

// ---------------------------------------------------------------- the fence
const MESH: [number, number][] = [];
for (let y = 6; y < 12; y++) for (let x = 0; x < 16; x++) if (((x + y) & 3) === 0 || ((x - y + 16) & 3) === 0) MESH.push([x, y]);

/** Chain link on posts over the dead lawn: a top rail with a lit edge, the diamond mesh, a post in the middle of the tile, and the shadow of it on the ground. End on (a run going north and south) it is the rail and posts only. */
function fence(k: Kit, c: TC): Px {
  const px = ground(k, c);
  const end = (c.n === 'F' || c.s === 'F') && c.e !== 'F' && c.w !== 'F';
  if (end) {
    px.rect(9, 0, 2, 16, k.grLo).rect(7, 0, 2, 16, k.drLo).rect(7, 0, 1, 16, k.cbHi).rect(8, 0, 1, 16, k.sdLo);
    if (c.n !== 'F') px.rect(6, 1, 4, 2, 'ink').rect(7, 1, 2, 1, k.cbHi);
    for (const y of [3, 11]) px.rect(5, y, 6, 1, k.drLo).rect(5, y, 6, 1, k.slLo).rect(7, y, 1, 1, k.cbHi);
    return px;
  }
  px.rect(0, 14, 16, 1, k.grLo).rect(0, 13, 16, 1, 'ink');
  px.rect(0, 4, 16, 1, k.cbHi).rect(0, 5, 16, 1, k.drLo).rect(0, 12, 16, 1, k.drLo);
  for (const [x, y] of MESH) px.set(x, y, c.v === 3 && x > 4 && x < 11 && y > 7 ? 0 : (k.slHi));
  if (c.v === 3) { px.rect(5, 8, 6, 4, k.gr).rect(5, 8, 6, 1, k.grLo); px.set(6, 9, k.vn).set(9, 10, k.vn); vine(px, [[5, 12], [6, 9], [5, 6]], k); }
  px.rect(7, 2, 2, 12, k.drLo).rect(7, 2, 1, 12, k.cbHi).rect(8, 2, 1, 12, k.sdLo).rect(7, 1, 2, 1, 'ink');
  return px;
}

// ---------------------------------------------------------------- the tree
/** Limbs as polylines from the trunk's fork, one per limb: the tree's four shapes by the tile's variant. */
const LIMBS: [number, number][][][] = [
  [[[7, 10], [5, 7], [2, 4], [1, 1]], [[9, 9], [12, 6], [13, 3], [14, 0]], [[8, 9], [8, 5], [7, 2], [7, 0]], [[5, 7], [6, 5]], [[13, 3], [11, 2]], [[2, 4], [0, 5]], [[12, 6], [15, 5]]],
  [[[7, 10], [4, 8], [2, 5], [3, 1]], [[9, 10], [12, 7], [15, 7]], [[8, 9], [9, 5], [11, 2], [10, 0]], [[9, 5], [6, 3], [5, 0]], [[12, 7], [13, 10]], [[2, 5], [0, 4]], [[4, 8], [3, 10]]],
  [[[7, 10], [6, 6], [3, 3], [0, 3]], [[9, 9], [11, 5], [10, 1]], [[8, 9], [13, 8], [15, 4]], [[6, 6], [8, 3], [7, 0]], [[11, 5], [14, 2]], [[3, 3], [3, 0]], [[13, 8], [14, 11]]],
  [[[7, 10], [4, 9], [1, 7], [0, 4]], [[9, 9], [10, 5], [8, 2], [9, 0]], [[8, 8], [13, 6], [14, 2]], [[10, 5], [12, 4], [15, 5]], [[4, 9], [3, 12]], [[1, 7], [3, 5]], [[13, 6], [15, 7]]],
];
const PODS: [number, number][][] = [[[1, 1], [14, 0], [7, 0], [15, 5], [0, 5]], [[3, 1], [10, 0], [5, 0], [15, 7], [0, 4]], [[0, 3], [10, 1], [14, 2], [7, 0], [3, 0]], [[0, 4], [9, 0], [14, 2], [15, 5], [3, 5]]];

/** A dead tree: a trunk forking into limbs that twist up and out to the edge of the tile, in bark of three tones (lit along the upper left, shaded on the lower right), red pods at the tips and a vine hanging from one limb. */
function tree(k: Kit, c: TC): Px {
  const px = ground(k, c), t = new Px(16), flip = c.tx & 1;
  px.ellipse(8, 14, 6, 1.6, k.grLo);
  for (const limb of LIMBS[c.v] as [number, number][][]) for (let i = 0; i + 1 < limb.length; i++) {
    const [[x0, y0], [x1, y1]] = [limb[i], limb[i + 1]] as [[number, number], [number, number]];
    t.line(x0, y0, x1, y1, k.fr);
    if (i < 2 && limb.length > 3) t.line(x0 + 1, y0, x1 + 1, y1, k.fr);
  }
  t.rect(6, 10, 4, 6, k.fr).rect(5, 13, 6, 3, k.fr).rect(4, 15, 8, 1, k.fr).rect(7, 9, 2, 1, k.fr);
  const lit: [number, number][] = [], shade: [number, number][] = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!t.get(x, y)) continue;
    if (!t.get(x, y - 1) || !t.get(x - 1, y)) lit.push([x, y]); else if (!t.get(x + 1, y) || !t.get(x, y + 1)) shade.push([x, y]);
  }
  for (const [x, y] of shade) t.set(x, y, k.rfLo);
  for (const [x, y] of lit) t.set(x, y, k.lip);
  t.rect(6, 15, 4, 1, 'ink').rect(4, 15, 1, 1, k.rfLo);
  for (const [x, y] of PODS[c.v] as [number, number][]) t.set(x, y, k.g.mid).set(x, y + 1, k.g.base);
  if (flip) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px.set(x, y, t.get(15 - x, y) || px.get(x, y)); } else px.blit(t, 0, 0);
  if (c.v & 1) vine(px, [[flip ? 5 : 10, 10], [flip ? 4 : 11, 12], [flip ? 5 : 10, 14]], k);
  return px;
}

// ---------------------------------------------------------------- the roof deck
const PATCH = [[3, 4, 6, 4], [7, 9, 7, 4], [2, 8, 6, 3], [9, 3, 5, 5]] as const;

/** The deck: a flat roof of sheet metal with a standing seam every eight pixels (its upper side lit) and rivets along it, and on some tiles a seam crossing it, a patch of tar, a puddle holding the red sky or a crack with a vein glowing in it. Most are plain, so the deck is calm under a fight. */
function deck(k: Kit, c: TC, flash: boolean, phase: number): Px {
  const px = new Px(16).fill(k.rf);
  const x0 = c.tx & 1 ? 4 : 0, what = hash2(c.tx, c.ty, 77) % 12;
  for (const x of [x0, x0 + 8]) px.rect(x, 0, 1, 16, 'ink').rect(x + 1, 0, 1, 16, k.slHi).rect((x + 15) & 15, 0, 1, 16, k.rfLo);
  for (let y = 3; y < 16; y += 6) { px.set(x0 + 3, y, k.rfLo); px.set(x0 + 11, y, k.rfLo); }
  if (what === 3) px.rect(0, 5 + (c.ty & 1) * 3, 16, 1, 'ink').rect(0, 6 + (c.ty & 1) * 3, 16, 1, k.fr);
  if (what < 2) { const [x, y, w, h] = PATCH[(c.tx + c.ty) & 3] as readonly number[]; px.rect(x, y, w, h, 'ink').rect(x + 1, y + 1, w - 2, h - 2, k.sdLo).set(x + 1, y + 1, k.sdHi); }
  if (what === 2) {
    px.ellipse(8, 9, 5.5, 2.6, 'ink').ellipse(8, 9, 4.5, 1.8, 'night');
    px.rect(5, 8, 4, 1, flash ? 'hot' : 'blood1').rect(8, 10, 3, 1, flash ? 'red' : 'blood0').set(5, 8, flash ? 'pink' : 'red');
  }
  if (what === 4) {
    px.line(1, 3, 6, 6, 'ink').line(6, 6, 9, 5, 'ink').line(9, 5, 14, 9, 'ink');
    vein(px, [[2, 3], [6, 6], [9, 5], [13, 9]], phase, k.g);
  }
  return px;
}

// ---------------------------------------------------------------- the roof's lip
/** The parapet round the deck: the coping (a lit cap with a drip edge) along the deck side, the wall face under it with its courses, and the drop beyond. */
function edge(k: Kit, c: TC, flash: boolean): Px {
  const px = new Px(16).fill(k.eave);
  const dn = c.n === 'd', ds = c.s === 'd', de = c.e === 'd', dw = c.w === 'd';
  if (ds) {
    px.rect(0, 5, 16, 11, k.sd).rect(0, 0, 16, 4, k.cbHi === 'hot' ? k.cbHi : k.fr).rect(0, 0, 16, 1, k.lip).rect(0, 4, 16, 1, 'ink');
    for (let y = 7; y < 15; y += 4) px.rect(0, y, 16, 1, k.sdLo);
    for (let y = 5; y < 15; y += 4) for (let x = (y & 4 ? 0 : 4) + (c.tx & 3); x < 16; x += 8) px.rect(x, y + 1, 1, 3, k.sdLo);
    px.rect(0, 15, 16, 1, 'ink');
  } else if (dn) {
    px.rect(0, 0, 16, 3, k.fr).rect(0, 0, 16, 1, k.lip).rect(0, 3, 16, 1, 'ink');
    for (let x = c.tx & 3; x < 16; x += 5) px.rect(x, 5, 1, 7, k.rfLo);
  } else if (de || dw) {
    const x = de ? 12 : 0;
    px.rect(x, 0, 4, 16, k.fr).rect(x + (de ? 0 : 3), 0, 1, 16, k.lip).rect(x + (de ? 3 : 0), 0, 1, 16, 'ink');
  } else px.rect(0, 0, 16, 4, k.rfLo).rect(0, 0, 16, 1, k.sdHi).rect(0, 4, 16, 1, 'ink');
  if (c.v === 1 && (ds || dn)) px.rect(3 + (c.tx & 1) * 6, 6, 2, 8, flash ? 'blood1' : 'blood0');
  if (de || dw) for (let y = 3 + (c.ty & 3); y < 16; y += 7) px.set(de ? 13 : 2, y, k.lip);
  return px;
}

/** The park's tile of this name, or null. `phase` is the step of the veins in a crack on the deck. */
export function parkTile(name: TileName, c: TileCtx, flash: boolean, phase: number): Px | null {
  const k = kitOf(flash), tc = tcOf(c, name);
  const px = name === 'udtrailer' ? trailer(k, tc, flash) : name === 'udfence' ? fence(k, tc) : name === 'udtree' ? tree(k, tc) : name === 'roofdeck' ? deck(k, tc, flash, phase)
    : name === 'roofedge' ? edge(k, tc, flash) : null;
  if (px) spores(px, k, tc, phase);
  return px;
}

/** The park's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function parkNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'udtrailer': return v === 0 ? { n: 'udtrailer', e: name, s: 'udlawn', w: name } : v === 1 ? { n: 'udlawn', e: 'udlawn', s: 'udlawn', w: name } : { n: name, e: name, s: name, w: 'udlawn' };
    case 'udfence': return v === 0 ? { n: 'udlawn', e: name, s: 'udlawn', w: name } : v === 1 ? { n: name, e: 'udlawn', s: name, w: 'udlawn' } : { n: 'udlawn', e: 'udlawn', s: 'udlawn', w: name };
    case 'udtree': return all('udlawn');
    case 'roofdeck': return all(name);
    case 'roofedge': return v === 0 ? { n: 'udroof', e: name, s: 'roofdeck', w: name } : v === 1 ? { n: 'roofdeck', e: name, s: 'udroof', w: name } : { n: name, e: 'roofdeck', s: name, w: 'udroof' };
    default: return near;
  }
}
