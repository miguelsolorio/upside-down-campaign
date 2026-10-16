// The tile painters the attic looks share (attic.ts): the underside of the roof (boards between rafters, a ridge on top, a top
// plate and a knee wall at the foot), floorboards, the eave as low floor with a dark wall strip at the edge, and the eave as a
// sloping roof in dark ribs. They take a few kits (one palette name per role), so each look only picks colors and a few
// overlays. Floorboards and the rug come from creel_a.ts. Night looks are painted in daytime values for the night pass to darken,
// which leaves the reds alone, so the storm showing through a gap stays lit. The painters read only the tile's letter, variant,
// neighbors and tx, ty parity (the tile cache keys on those), and no noise: every mark is a hand made arrangement by variant.
// Anything that depends on where in the room a tile is (vines, sky, rain) is a prop, in attic_fx.ts.
import type { ColorName as N } from '../palette.ts';
import { px32 } from '../canvas.ts';
import { Px } from '../px.ts';
import type { TC } from './look_kit.ts';
import { boards, rug } from './creel_a.ts';
import type { Kit, RugKit } from './creel_a.ts';

type Rect = [number, number, number, number];

/** One palette name for every role of the roof and the knee wall. */
export interface RoofKit {
  ridge: N; ridgeHi: N;                 // the ridge board along the top and its lit edge
  deck: N; deckHi: N; deckLo: N;        // roof boards, their lit top edge and the gap under
  raf: N; rafHi: N; rafLo: N;           // a rafter: lit side, body, shaded side
  plate: N; plateHi: N; plateLo: N;     // the top plate the rafters stand on
  wd: N; wdHi: N; wdLo: N;              // knee wall boards
  gap: N; gapHi: N;                     // what shows through a board that is gone
  moss: N; mossHi: N;                   // rot on the boards
  beam?: boolean;                       // a low tie beam across the knee wall
}
/** A sloping roof over the eave: three columns from the edge in, each a step lighter. */
export interface SlopeKit {
  deck: readonly [N, N, N]; rib: readonly [N, N, N]; ribHi: readonly [N, N, N]; low: N; sill: N; sillHi: N; seam: N;
}

const JOINTS: [number, number][][] = [[[0, 11], [2, 3]], [[1, 13], [3, 9]], [[0, 2], [2, 12]], [[1, 4], [3, 14]]]; // [plank, x] where a board ends, by variant
const GAPS: [number, number, number][][] = [[[10, 4, 4]], [], [[1, 8, 3]], [[11, 0, 4], [2, 12, 3]]]; // [x, y of the plank, width] where a board is gone
const MOSS: Rect[][] = [[[10, 5, 4, 2]], [[1, 9, 5, 2]], [], [[11, 2, 3, 2]]];

/** The roof's underside: planks 4 px tall with their joints, a rafter down the middle of the tile, the ridge board on the top row, and on the second row a top plate over a knee wall of upright boards. */
export function roof(k: RoofKit, c: TC): Px {
  const top = c.ch === '#', h = top ? 16 : 8;
  const px = new Px(16).fill(k.deck);
  for (let y = 0; y < h; y += 4) px.rect(0, y, 16, 1, k.deckHi).rect(0, y + 3, 16, 1, k.deckLo);
  for (const [r, x] of JOINTS[c.v]) if (r * 4 < h) px.rect(x, r * 4, 1, 4, k.deckLo).set(x + 1, r * 4, k.deckHi);
  for (const [x, y, w] of GAPS[c.v]) if (y + 3 < h) px.rect(x, y + 1, w, 2, k.gap).set(x, y + 1, k.gapHi).set(x + w - 1, y + 2, k.deckLo);
  for (const [x, y, w, hh] of MOSS[c.v]) if (y + hh <= h) px.rect(x, y, w, hh, k.moss).set(x, y, k.mossHi).set(x + w - 1, y + hh - 1, k.mossHi);
  px.rect(6, 0, 1, h, k.rafHi).rect(7, 0, 1, h, k.raf).rect(8, 0, 1, h, k.rafLo);
  if (top) {
    px.rect(0, 0, 16, 2, k.ridge).rect(0, 2, 16, 1, k.ridgeHi).rect(5, 2, 5, 1, k.rafLo);
    return px;
  }
  if (k.beam) px.rect(0, 1, 16, 1, k.rafHi).rect(0, 2, 16, 3, k.raf).rect(0, 5, 16, 1, k.rafLo);
  px.rect(5, 6, 5, 2, k.raf).rect(5, 6, 1, 2, k.rafHi);
  px.rect(0, 8, 16, 1, k.plateHi).rect(0, 9, 16, 1, k.plate);
  for (let x = 0; x < 16; x += 4) px.rect(x, 10, 1, 5, k.wdHi).rect(x + 1, 10, 2, 5, k.wd).rect(x + 3, 10, 1, 5, k.wdLo);
  px.rect(0, 15, 16, 1, k.plateLo);
  return px;
}

/** Floorboards, shaded under the roof; next to a sloping roof a shadow runs down the edge too. */
export function floor(k: Kit, c: TC, slope = false): Px {
  const px = boards(k, c);
  if (slope && c.w === '<') px.rect(0, 0, 1, 16, k.seam).rect(1, 0, 1, 16, k.flLo);
  if (slope && c.e === '>') px.rect(15, 0, 1, 16, k.seam).rect(14, 0, 1, 16, k.flLo);
  return px;
}

/** The west side of a tile as the east: the painters draw the west eave and the east one is its mirror. */
const west = (c: TC): TC => (c.ch === '<' ? c : { ...c, ch: '<', w: c.e, e: c.w });
const mirror = (c: TC, px: Px): Px => (c.ch === '<' ? px : new Px(16).blit(px, 0, 0, true));

/** The eave as low floor: boards under a low roof, shaded by a dither that thins toward the room, and at the very edge a strip of the knee wall's top with a lit line. */
export function eave(k: Kit, c: TC): Px {
  const w = west(c), px = boards(k, w), lo = px32(k.fl);
  const edge = w.w === '#' ? 0 : w.e === '.' ? 2 : 1, reach = [14, 10, 5][edge] as number;
  for (let y = 0; y < 16; y++) for (let x = 0; x < reach; x++) if ((x + y) % 2 === 0 && px.get(x, y) === lo) px.set(x, y, k.flLo);
  if (edge === 0) px.rect(0, 0, 3, 16, k.top).rect(3, 0, 1, 16, k.topHi);
  return mirror(c, px);
}

/** The eave as a roof sloping in: dark deck with the rafters across it as ribs, each a lit top edge, a body and a shadow, darkest at the edge and lighter toward the floor, with a sill beam where it meets the boards. */
export function slope(s: SlopeKit, c: TC): Px {
  const w = west(c), lv = w.w === '#' ? 0 : w.e === '.' ? 2 : 1;
  const px = new Px(16).fill(s.deck[lv] as N);
  for (const x of [3, 8, 13]) px.rect(x + (c.v & 1), 0, 1, 16, s.seam);
  for (let y = 0; y < 16; y += 8) {
    px.rect(0, y, 16, 1, s.ribHi[lv] as N).rect(0, y + 1, 16, 2, s.rib[lv] as N).rect(0, y + 3, 16, 1, s.low);
  }
  if (lv === 0) px.rect(0, 0, 2, 16, s.low).rect(2, 0, 1, 16, s.seam);
  if (lv === 2) px.rect(13, 0, 1, 16, s.sillHi).rect(14, 0, 1, 16, s.sill).rect(15, 0, 1, 16, s.low);
  return mirror(c, px);
}

export interface AtticParts {
  roof: RoofKit; floor: Kit; rug: RugKit;
  /** Set when the eave slopes in; otherwise the eave is low floor. */
  slope?: SlopeKit;
  extra?: (px: Px, c: TC, phase: number) => void;
}
/** The tile painter of a look: the shared painters with the look's own kits, then its overlay. */
export function tiler(p: AtticParts): (c: TC, phase: number) => Px {
  return (c, phase) => {
    let px: Px;
    switch (c.ch) {
      case '#': case 'W': px = roof(p.roof, c); break;
      case '<': case '>': px = p.slope ? slope(p.slope, c) : eave(p.floor, c); break;
      case 'r': px = rug(p.rug, c); break;
      default: px = floor(p.floor, c, !!p.slope);
    }
    p.extra?.(px, c, phase);
    return px;
  };
}
