// Kamchatka looks 3 and 4 (stage 4.1, see look_kit.ts and kamchatka.ts). "Rust" is the block as old corrugated iron gone red brown,
// lit by the barrel fire; "Frost" is everything iced, pale snow, frost running down the walls, icicles on the faces, a white
// floodlight. Both reuse the painters of kamchatka_a.ts (snow, drifts, path, fence, wall tops, bars, grates, props) with their own
// palette, and add their own wall faces and floors. The night pass turns soil into a dull plum, so the rust is painted in blood
// reds, which it leaves alone. Painted in daytime values.
import { Px } from '../px.ts';
import type { ColorName } from '../palette.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { barrel, cast, crates, floodlight, pave, rig, slab, tiler } from './kamchatka_a.ts';
import type { Kit, Paint } from './kamchatka_a.ts';
import { dots, rects } from './tunnel_paint.ts';
import type { Pt } from './tunnel_paint.ts';

type Rect = [number, number, number, number];

const RUST: Kit = {
  s: 'soil3', sHi: 'sand', sPk: 'bone', sLo: 'shadow', sDp: 'night', dirt: 'blood0', t: 'soil2', tHi: 'soil3', tLo: 'soil1',
  post: 'soil3', postHi: 'sand', postLo: 'soil1', wire: 'blood0',
  roof: 'soil1', roofHi: 'soil2', roofLo: 'soil0', lip: 'sand', edge: 'ink', face: 'soil2', faceHi: 'soil3', faceLo: 'soil1',
  fl: 'soil2', flHi: 'soil3', flLo: 'soil0', joint: 'ink', cell: 'black', bar: 'soil3', barHi: 'sand',
};
const FROST: Kit = {
  s: 'bone', sHi: 'white', sPk: 'white', sLo: 'mist', sDp: 'slate', t: 'mist', tHi: 'white', tLo: 'slate',
  post: 'grey3', postHi: 'bone', postLo: 'grey2', wire: 'dusk',
  roof: 'dusk', roofHi: 'slate', roofLo: 'shadow', lip: 'white', edge: 'ink', face: 'grey3', faceHi: 'bone', faceLo: 'grey2',
  fl: 'grey2', flHi: 'grey3', flLo: 'grey1', joint: 'ink', cell: 'black', bar: 'bone', barHi: 'white',
};

const BLOOM: Rect[][] = [[[2, 3, 4, 3], [9, 5, 5, 3]], [[10, 2, 4, 3], [1, 4, 4, 3]], [[5, 4, 4, 3], [12, 3, 3, 3]], [[1, 3, 3, 4], [8, 5, 5, 2]]];
const CREEP = [[9, 9, 8, 8, 8, 10, 10, 9, 9, 8, 8, 10, 10, 10, 9, 9], [8, 8, 9, 9, 10, 10, 9, 8, 8, 7, 7, 8, 9, 9, 8, 8], [10, 10, 9, 8, 8, 9, 9, 9, 8, 8, 10, 10, 9, 9, 10, 10], [7, 8, 8, 9, 9, 10, 9, 8, 8, 9, 10, 10, 9, 8, 8, 7]];
const crest = (x: number, rust: boolean): ColorName => (rust ? (['blood0', 'blood0', 'soil1', 'soil0'] as const) : (['soil3', 'soil2', 'soil2', 'soil1'] as const))[x & 3];

/** Corrugated iron: vertical ridges (lit crest, two body, shaded trough, in step from tile to tile), a bolted lap seam, rust creeping up from the foot and blooming under the lip. */
function iron(c: TC): Px {
  const px = new Px(16);
  for (let x = 0; x < 16; x++) px.rect(x, 0, 1, 16, crest(x, false)).rect(x, CREEP[c.v][x], 1, 14 - CREEP[c.v][x], crest(x, true));
  for (const [x, y, w, h] of BLOOM[c.v].slice(0, c.v > 1 ? 2 : 1)) for (let i = x; i < x + w; i++) px.rect(i, y, 1, h + (i & 1 ? 2 : 4), crest(i, true));
  px.rect(0, 0, 16, 2, 'soil0').rect(0, 7, 16, 1, 'soil0').rect(0, 14, 16, 1, 'soil0').rect(0, 15, 16, 1, 'ink');
  for (let i = 0; i < 4; i++) if ((i + c.v) % 4 !== 3) px.set(i * 4, 6, 'sand').set(i * 4, 8, 'soil1');
  return px;
}

/** An iron deck: tread studs in a grid, plate joints, rust stains, a bolt in two corners. */
function deck(c: TC): Px {
  const px = new Px(16).fill('soil2');
  for (let y = 1; y < 15; y += 4) for (let x = 1; x < 15; x += 4) px.set(x + (y & 4 ? 2 : 0), y, 'soil3').set(x + (y & 4 ? 2 : 0) + 1, y + 1, 'soil1');
  const [x, y, w, h] = BLOOM[c.v][c.v & 1];
  px.rect(x, y + 4, w, h, 'soil1').rect(x + 1, y + 5, w - 2, h - 2, 'blood0');
  px.rect(0, 15, 16, 1, 'ink').rect(15, 0, 1, 16, 'ink').set(1, 1, 'sand').set(13, 13, 'sand');
  cast(px, c, RUST);
  return px;
}

const SEAM: Pt[] = [[1, 6], [4, 9], [6, 2], [3, 5]];
/** Frost down the face: a crust that hangs from the lip in tongues of different depth, white at the top, icicles with ice blue tips. */
const DEPTH = [[4, 6, 9, 7, 5, 4, 6, 10, 12, 9, 6, 5, 4, 5, 7, 5], [6, 5, 4, 7, 9, 11, 8, 5, 4, 5, 8, 10, 7, 5, 4, 6], [3, 4, 6, 8, 6, 5, 9, 11, 9, 6, 4, 4, 6, 8, 6, 4], [8, 6, 5, 4, 6, 9, 7, 5, 6, 10, 12, 8, 5, 4, 5, 7]];
const ICICLE: Pt[][] = [[[2, 5], [7, 3], [12, 6]], [[4, 4], [9, 6], [13, 3]], [[1, 3], [6, 5], [11, 4]], [[3, 6], [8, 3], [14, 5]]];
function frosted(c: TC): Px {
  const px = slab(FROST, c);
  DEPTH[c.v].forEach((d, x) => {
    px.rect(x, 2, 1, d - 1, 'bone').rect(x, 2, 1, (x + c.v) & 1 ? 1 + (d >> 1) : 2, 'white').set(x, d + 1, 'mist');
  });
  for (const [x, len] of ICICLE[c.v]) px.rect(x, 0, 1, len, 'white').rect(x + 1, 0, 1, 1 + (len >> 1), 'bone').set(x, len, 'sky');
  px.rect(SEAM[c.v][0], 13, 2, 1, 'white');
  return px;
}

const SHEEN: number[][] = [[2, 13, 9, 6], [6, 14, 13, 8], [1, 11, 6, 6], [4, 14, 12, 9]]; // one diagonal gloss stroke per tile, the same way on all of them
/** Slabs with a glaze of ice: a diagonal gloss, a frosted joint. */
function iced(c: TC): Px {
  const px = pave(FROST, c), [x0, y0, x1, y1] = SHEEN[c.v];
  px.line(x0, y0, x1, y1, 'slate').line(x0 + 1, y0, x1 + 1, y1, 'mist').line(x0 + 2, y0, x1 + 2, y1, 'bone').set(x1 + 2, y1, 'white');
  px.rect(c.v * 3, 14, 5, 1, 'mist');
  return px;
}

const SPARK: Pt[] = [[3, 4], [11, 6], [7, 10], [13, 12]];
/** The frost look's extras, over the shared painters: ice glints on the path, a twinkle on the open ground that moves with the phase. */
function glaze(paint: Paint): Paint {
  return (c, phase) => {
    const px = paint(c, phase);
    if (c.ch === 't') dots(px, [[2 + c.v, 3], [9, 12 - c.v], [13, 6]], 'sky');
    if ('.dtc'.includes(c.ch) && c.ch !== 'c') { const [x, y] = SPARK[(c.v + phase) & 3]; px.set(x, y, 'sky'); }
    return px;
  };
}

export const KAMCHATKA_B: StageLook[] = [
  {
    slug: 'rust', name: 'Rust', night: true, glow: [620, 210, 20],
    note: 'An old iron block gone red brown, corrugated and bolted, with rust bleeding into the snow. The barrel fire is the only warm light.',
    tile: tiler(RUST, (c) => iron(c), (c) => deck(c)),
    props: (phase): Prop[] => {
      const drum = barrel({ body: 'soil1', hi: 'soil2', lo: 'soil0', rib: 'blood0', rim: 'soil3' }, phase);
      rects(drum, [[5, 11, 3, 2], [10, 9, 2, 3], [4, 14, 4, 1]] as Rect[], 'blood0');
      return [
        { px: floodlight(rig('soil3', 'sand', 'soil1', 'soil2', 'soil3', 'orange', 'soil2'), phase & 1 ? 'amber' : 'orange'), x: 40, y: 24 },
        { px: drum, x: 96, y: 72 },
        { px: crates({ body: 'soil2', hi: 'soil3', lo: 'soil1', mark: 'blood1' }, 'blood1'), x: 208, y: 48 },
      ];
    },
    lights: [[48, 29, 46, 0.5], [104, 80, 54, 1], [192, 62, 44, 0.55], [188, 140, 40, 0.5]],
  },
  {
    slug: 'frost', name: 'Frost', night: true, glow: [210, 232, 255],
    note: 'Pale snow, hoar on the wire, frost creeping down the walls from the roof line with icicles hanging from it, and a white floodlight over the yard.',
    tile: glaze(tiler(FROST, (c) => frosted(c), (c) => iced(c))),
    props: (phase): Prop[] => {
      const lamp = floodlight(rig('grey3', 'white', 'grey2', 'grey3', 'white', 'bone', 'grey3'), phase & 1 ? 'white' : 'cream');
      rects(lamp, [[3, 8, 1, 2], [5, 8, 1, 1], [10, 8, 1, 3], [12, 8, 1, 1]] as Rect[], 'white');
      return [
        { px: lamp, x: 40, y: 24 },
        { px: barrel({ body: 'grey3', hi: 'bone', lo: 'grey2', rib: 'grey1', rim: 'white' }, phase), x: 96, y: 72 },
        { px: crates({ body: 'soil2', hi: 'soil3', lo: 'soil1', mark: 'sand' }, 'white'), x: 208, y: 48 },
      ];
    },
    lights: [[48, 29, 60, 0.75], [104, 80, 34, 0.7], [192, 62, 46, 0.7], [188, 140, 42, 0.6]],
  },
];
