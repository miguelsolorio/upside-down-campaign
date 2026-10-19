// Upside Down Hawkins (stage 4.3), the owner's pick: Blue storm (gfx/var/hawkinsud_mix.ts, with its bolt in hawkinsud_bolt.ts, docs/level-12.md). The street's tiles are the
// sheet's own painters (hawkinsud_a.ts: the roof, the lawn, the sidewalk, the road, the veins, the vines and spores), called through the
// pick's two kits: Blue night's between bolts, and the bolt's, where the lit edges (roof lips, curb tops, slab bevels, door frames) are red
// and the wet road is streaked bright. The play scene fades the bolt's bake over the night one (bakeStage(rows, night, 'flash')). The house
// fronts are the game's own: the sheet's read as one flat band along a row of houses, so here each front has its corner boards, an eave that
// throws a shadow down the wall, a foundation, and a fixture picked by the tile's variant (a downspout, a vent, a house number, a shuttered
// window, a porch over the door), and the lawn in front has a path to the door and a dead shrub under a window. Painted in daytime values,
// for the night pass; the lit edges are reds, which it leaves alone. No noise: every mark is a hand made arrangement. Pure pixel work.
import type { TileName } from '../core/tiles.ts';
import { hash2 } from './canvas.ts';
import { Px } from './px.ts';
import type { Near, TileCtx } from './tile_ground.ts';
import { front, isFront, lawn, overgrow, road, roof, spores, walk } from './var/hawkinsud_a.ts';
import type { Kit } from './var/hawkinsud_a.ts';
import { kitFor, rain } from './var/hawkinsud_bolt.ts';
import type { TC } from './var/look_kit.ts';

/** The letters the sheet's painters read the room by: # roof, H a house front, w a window in it, D a door, g lawn, c sidewalk, . road, = the center line, v veins. The park's are T, F, t, d and e. */
export const LETTER: Partial<Record<TileName, string>> = {
  udroof: '#', udhouse: 'H', udwindow: 'w', uddoor: 'D', udlawn: 'g', udwalk: 'c', udroad: '.', udline: '=', udveins: 'v',
  udtrailer: 'T', udfence: 'F', udtree: 't', roofdeck: 'd', roofedge: 'e',
};
const letter = (n: TileName): string => LETTER[n] ?? '?';

/** What a sheet painter knows about a tile of the stage: its letter, the variant (0 to 3) and the letters round it. */
export function tcOf(c: TileCtx, name: TileName): TC {
  return { ch: letter(name), tx: c.tx, ty: c.ty, v: hash2(c.tx, c.ty, 11) & 3, n: letter(c.near.n), s: letter(c.near.s), e: letter(c.near.e), w: letter(c.near.w) };
}

/** The kit of a bolt (1) or of the night between bolts (0): the same colors the sheet paints with. */
export const kitOf = (flash: boolean): Kit => kitFor(flash ? 2 : 0);

// ---------------------------------------------------------------- the house fronts
/** A corner board down the end of a house, lit on its outer edge. `left` is the west end. */
function corner(px: Px, k: Kit, left: boolean): void {
  if (left) px.rect(0, 2, 1, 13, 'ink').rect(1, 2, 1, 12, k.drHi).rect(2, 2, 2, 12, k.dr).rect(4, 2, 1, 12, k.sdLo);
  else px.rect(15, 2, 1, 13, 'ink').rect(14, 2, 1, 12, k.drLo).rect(12, 2, 2, 12, k.dr).rect(11, 2, 1, 12, k.sdLo).rect(12, 2, 1, 12, k.drHi);
}

/** The foundation: two rows of dark concrete under the siding, its top lit, with a vent in it on some. */
function foundation(px: Px, k: Kit, c: TC): void {
  px.rect(0, 13, 16, 2, k.cb).rect(0, 13, 16, 1, k.slHi).rect(0, 15, 16, 1, 'ink');
  if (c.v === 1 || c.v === 2) px.rect(c.v === 1 ? 4 : 9, 13, 3, 1, 'ink').rect(c.v === 1 ? 4 : 9, 14, 3, 1, k.slLo);
}

/** A downspout down the wall, a vent box by the foot, or the house number on a plate: what a plain wall has by its variant. */
function fixture(px: Px, k: Kit, c: TC): void {
  if (c.v === 1) {
    const x = c.tx & 1 ? 3 : 11;
    px.rect(x, 2, 3, 2, k.eave).rect(x, 3, 3, 1, k.dr).rect(x + 1, 4, 2, 9, k.dr).rect(x + 1, 4, 1, 9, k.drHi).rect(x + 2, 4, 1, 9, k.drLo);
    px.rect(x, 5, 1, 1, k.dr).rect(x + 3, 5, 1, 1, k.drLo).rect(x, 10, 1, 1, k.dr).rect(x + 3, 10, 1, 1, k.drLo).rect(x - 1, 12, 5, 1, k.dr);
  } else if (c.v === 2) {
    const x = c.tx & 1 ? 8 : 2;
    px.rect(x, 7, 6, 5, 'ink').rect(x + 1, 8, 4, 3, k.dr).rect(x + 1, 8, 4, 1, k.drHi);
    for (const i of [1, 3]) px.rect(x + 1, 8 + i, 4, 1, 'ink');
    px.rect(x + 2, 12, 2, 1, k.dr);
  } else if (c.v === 3) {
    const x = c.tx & 1 ? 9 : 3;
    px.rect(x, 5, 5, 4, 'ink').rect(x + 1, 6, 3, 2, k.dr).set(x + 2, 6, k.lit).set(x + 1, 7, k.lit).set(x + 3, 7, k.lit);
  }
}

/** A window set in the siding: a lit header and sill, a thick frame round four panes of dark glass (a faint light behind one, or one broken), and louvered shutters when there is bare wall at its side. */
function window(px: Px, k: Kit, c: TC, phase: number): void {
  const shut = c.v === 1 || c.v === 2;
  const x0 = shut ? 4 : 3, w = shut ? 9 : 11;
  px.rect(x0 - 1, 3, w + 2, 1, k.drHi).rect(x0 - 1, 4, w + 2, 1, k.dr);
  px.rect(x0, 4, w, 9, 'ink').rect(x0 + 1, 5, w - 2, 7, k.fr).rect(x0 + 2, 6, w - 4, 5, k.pane);
  px.rect(x0 + (w >> 1), 6, 1, 5, k.fr).rect(x0 + 2, 8, w - 4, 1, k.fr);
  px.rect(x0 - 1, 12, w + 2, 1, k.drHi).rect(x0 - 1, 13, w + 2, 1, k.dr);
  px.set(x0 + 2, 6, k.glint).set(x0 + 3, 7, k.glint).set(x0 + w - 3, 10, k.glint);
  if (c.v === 0) px.rect(x0 + 2, 9, 2, 2, k.lit).rect(x0 + w - 4, phase & 2 ? 9 : 10, 2, 1, k.lit);
  if (c.v === 3) px.rect(x0 + w - 4, 6, 2, 2, 'black').set(x0 + w - 4, 7, k.glint).set(x0 + 3, 10, 'black').set(x0 + 4, 10, 'black');
  if (!shut) return;
  for (const [sx, bare] of [[0, c.w === 'H'], [13, c.e === 'H']] as const) {
    if (!bare) continue;
    px.rect(sx, 4, 2, 9, k.drLo).rect(sx, 4, 2, 1, k.drHi).rect(sx, 12, 2, 1, k.cb);
    for (const y of [6, 8, 10]) px.rect(sx, y, 2, 1, 'ink');
  }
}

/** A porch over the door: a little shingled roof on two posts with its lip lit, a dead red lamp, the door in its frame (ajar on some, boarded on others) and steps. */
function porch(px: Px, k: Kit, c: TC): void {
  px.rect(0, 2, 16, 1, k.rfHi).rect(0, 3, 16, 3, k.rf).rect(0, 6, 16, 1, k.lip).rect(0, 7, 16, 1, k.eave);
  for (const x of [2, 7, 12]) px.rect(x, 4, 2, 1, k.rfSeam);
  px.rect(1, 8, 2, 6, k.dr).rect(1, 8, 1, 6, k.drHi).rect(13, 8, 2, 6, k.dr).rect(14, 8, 1, 6, k.drLo);
  px.rect(4, 8, 8, 6, 'ink').rect(5, 9, 6, 5, k.drLo).rect(5, 9, 1, 5, k.drHi).frame(6, 10, 4, 3, k.dr).set(9, 12, k.slHi);
  px.set(12, 9, k.lit).set(12, 10, 'blood0');
  px.rect(2, 14, 12, 1, k.slHi).rect(1, 15, 14, 1, 'ink');
  if (c.v === 2) px.rect(8, 9, 3, 5, 'black').rect(8, 9, 1, 5, 'ink').rect(10, 11, 1, 2, k.lit);
  if (c.v === 3) px.rect(4, 10, 8, 2, 'ink').rect(5, 10, 6, 1, k.drHi).rect(4, 13, 8, 1, 'ink').rect(5, 13, 6, 1, k.drHi);
}

/** The front of a house: siding with its corner boards, the eave's shadow and the foundation, and a window, a door or a fixture. */
function houseFront(k: Kit, c: TC, phase: number): Px {
  const px = front(k, { ...c, ch: 'H' }, phase);
  px.rect(0, 2, 16, 1, k.eave);
  for (let x = c.tx & 1; x < 16; x += 2) px.set(x, 3, k.eave);
  if (!isFront(c.w)) corner(px, k, true);
  if (!isFront(c.e)) corner(px, k, false);
  foundation(px, k, c);
  if (c.ch === 'w') window(px, k, c, phase);
  else if (c.ch === 'D') porch(px, k, c);
  else fixture(px, k, c);
  return px;
}

// ---------------------------------------------------------------- roof, lawn
/** A brick chimney on a roof, its cap lit. */
function chimney(px: Px, k: Kit, c: TC): void {
  const x = c.tx & 1 ? 3 : 9;
  px.rect(x, 3, 5, 9, 'ink').rect(x + 1, 4, 3, 8, k.rfLo).rect(x + 1, 4, 1, 8, k.rfHi).rect(x - 1, 2, 7, 2, 'ink').rect(x, 2, 5, 1, k.lip);
  for (const y of [6, 8, 10]) px.rect(x + 1, y, 3, 1, k.rfSeam);
  px.rect(x + 1, 3, 3, 1, 'black');
}

/** The gable over a porch: the house's wall rising through the roof to a peak, a round vent in it, its slopes lit. */
function gable(px: Px, k: Kit): void {
  for (let y = 5; y < 14; y++) {
    const half = Math.min(7, y - 4);
    px.rect(8 - half, y, half * 2, 1, k.sd).set(8 - half, y, k.lip).set(7 + half, y, k.rfLo);
  }
  px.rect(7, 4, 2, 1, k.lip).rect(6, 9, 4, 3, 'ink').rect(7, 9, 2, 3, k.pane).set(7, 9, k.glint);
  px.rect(1, 13, 14, 1, 'ink');
}

/** A dormer: a small box with a window in it standing out of the roof, its own little roof lit along the edge. */
function dormer(px: Px, k: Kit): void {
  px.rect(3, 4, 10, 1, k.lip).rect(2, 5, 12, 2, 'ink').rect(3, 5, 10, 1, k.rfHi).rect(3, 7, 10, 7, 'ink').rect(4, 7, 8, 6, k.sd);
  px.rect(5, 8, 6, 4, k.fr).rect(6, 9, 4, 2, k.pane).rect(8, 9, 1, 2, k.fr).set(6, 9, k.glint);
}

/** A roof with its ridge cap along the top of a run, a gable over a porch, a dormer over some windows and a chimney on one in a few. */
function houseRoof(k: Kit, c: TC): Px {
  const px = roof(k, c);
  if (c.n !== '#') px.rect(0, 0, 16, 1, 'ink').rect(0, 1, 16, 1, k.lip).rect(0, 2, 16, 1, k.rfLo);
  if (c.s === 'D') gable(px, k);
  else if (c.s === 'w' && c.v === 1) dormer(px, k);
  else if (c.v === 2 && c.n !== '#' && c.s === 'H' && (c.tx + c.ty) % 3 === 0) chimney(px, k, c);
  return px;
}

/** The yard in front of a house: the sheet's dead lawn, with a flagstone path from a door to the walk and a dead shrub under a window. */
function yard(k: Kit, c: TC): Px {
  const px = lawn(k, c);
  if (c.n === 'D') {
    px.rect(0, 0, 16, 2, k.gr);
    const rows: [number, number, number][] = [[0, 5, 6], [4, 6, 6], [8, 4, 7], [12, 6, 5]];
    for (const [y, x, w] of rows) px.rect(x, y, w, 3, k.sl).rect(x, y, w, 1, k.slHi).rect(x, y + 3, w, 1, k.slLo).rect(x - 1, y, 1, 4, 'ink');
  } else if (c.n === 'w' || (c.n === 'H' && c.v === 3)) {
    px.rect(2, 1, 12, 3, 'ink').rect(3, 2, 10, 2, k.grLo).rect(4, 2, 3, 1, k.vn).rect(9, 2, 3, 1, k.vn);
    px.line(4, 4, 3, 1, k.vnLo).line(8, 4, 8, 0, k.vnLo).line(12, 4, 13, 1, k.vnLo).set(3, 1, k.g.mid).set(8, 0, k.g.mid).set(13, 1, k.g.mid);
  }
  return px;
}

// ---------------------------------------------------------------- the set
/** The Upside Down Hawkins street tile of this name, or null. `phase` is the step of the veins' pulse; `flash` paints the bolt's colors. */
export function townTile(name: TileName, c: TileCtx, flash: boolean, phase: number): Px | null {
  const ch = LETTER[name];
  if (!ch || 'TFtde'.includes(ch)) return null;
  const k = kitOf(flash), tc = tcOf(c, name);
  const px = ch === '#' ? houseRoof(k, tc) : isFront(ch) ? houseFront(k, tc, phase) : ch === 'g' || ch === 'v' ? yard(k, tc) : ch === 'c' ? walk(k, tc) : road(k, tc);
  rain(flash ? 2 : 0)(px, tc);
  overgrow(px, k, tc, phase);
  spores(px, k, tc, phase);
  return px;
}

/** The street's tiles, in the order of the sheet's room. */
export const TOWN_TILES: TileName[] = ['udroof', 'udhouse', 'udwindow', 'uddoor', 'udlawn', 'udwalk', 'udroad', 'udline', 'udveins'];

/** The street's tiles at their best for the sheet: v 0 in a run, v 1 at an edge, v 2 beside something else they meet. */
export function townNear(name: TileName, v: number, near: Near): Near {
  const all = (n: TileName): Near => ({ n, e: n, s: n, w: n });
  switch (name) {
    case 'udroof': return v === 0 ? all(name) : v === 1 ? { n: name, e: name, s: 'udhouse', w: name } : { n: 'udlawn', e: name, s: 'udhouse', w: 'udlawn' };
    case 'udhouse': return v === 0 ? { n: 'udroof', e: name, s: 'udlawn', w: name } : v === 1 ? { n: 'udroof', e: 'udwindow', s: 'udlawn', w: 'udwindow' } : { n: 'udroof', e: name, s: 'udlawn', w: 'udlawn' };
    case 'udwindow': return v === 2 ? { n: 'udroof', e: 'udhouse', s: 'udlawn', w: 'udhouse' } : { n: 'udroof', e: 'udhouse', s: 'udlawn', w: 'udwindow' };
    case 'uddoor': return { n: 'udroof', e: 'udhouse', s: 'udlawn', w: 'udhouse' };
    case 'udlawn': return v === 0 ? { n: 'udhouse', e: name, s: 'udwalk', w: name } : v === 1 ? { n: 'uddoor', e: name, s: 'udwalk', w: name } : { n: 'udwindow', e: name, s: 'udwalk', w: name };
    case 'udwalk': return v === 0 ? { n: 'udlawn', e: name, s: 'udroad', w: name } : v === 1 ? { n: 'udroad', e: name, s: 'udlawn', w: name } : all(name);
    case 'udroad': return v === 0 ? { n: 'udwalk', e: name, s: name, w: name } : v === 1 ? all(name) : { n: name, e: name, s: 'udwalk', w: name };
    case 'udline': return { n: 'udroad', e: 'udroad', s: 'udroad', w: 'udroad' };
    case 'udveins': return v === 0 ? all(name) : v === 1 ? { n: 'udlawn', e: name, s: 'udlawn', w: 'udlawn' } : { n: name, e: 'udlawn', s: 'udlawn', w: name };
    default: return near;
  }
}

