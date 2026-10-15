// Pit looks 1 and 2. Ice: the pit is cut in frozen stone, the rim under snow, the wall glazed in ice with icicles hanging
// from its top course, the floor packed ice, a pale light falling through a grate in the ceiling. Rust: an iron pit built of
// riveted plates gone orange with rust, a deck plate rim, an iron grating for a floor over the dark. See pit_kit.ts.
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import type { StageLook, TC } from './look_kit.ts';
import { pitProps, pitTile, torch } from './pit_kit.ts';
import type { PitPaint } from './pit_kit.ts';

const open = (ch: string): boolean => ch !== '#' && ch !== 'W' && ch !== 'G';
const isWall = (ch: string): boolean => ch === 'W' || ch === 'G';

/** The rim's edges: a lip where the wall drops away below it, a side edge where the floor runs beside it. */
function rimEdges(px: Px, c: TC, lit: ColorName, drop: ColorName): void {
  if (isWall(c.s)) px.rect(0, 12, 16, 1, lit).rect(0, 13, 16, 3, drop);
  if (open(c.e)) px.rect(15, 0, 1, 16, drop).rect(14, 0, 1, 16, lit);
  if (open(c.w)) px.rect(0, 0, 1, 16, drop).rect(1, 0, 1, 16, lit);
  if (open(c.n)) px.rect(0, 0, 16, 1, lit);
}

/** Blocks in courses five px tall, every other course shifted half a block. */
function blocks(px: Px, c: TC, face: ColorName, joint: ColorName, hi: ColorName, top: number): void {
  px.fill(face);
  for (let y = top; y < 16; y += 5) {
    px.rect(0, y, 16, 1, joint);
    const off = ((y / 5 + c.tx) & 1) * 4 + (c.v & 1) * 2;
    for (let x = off % 8; x < 16; x += 8) { px.rect(x, y, 1, 5, joint); px.rect(x + 1, y + 1, 4, 1, hi); }
  }
}

/** Bars over the dark, two px each with a shade, and a crossbar; the upper half closes in an arch. */
function bars(px: Px, c: TC, upper: boolean, stone: ColorName, bar: ColorName, barShade: ColorName): void {
  px.fill('ink');
  if (upper) {
    const left = c.e === 'G';
    for (let y = 0; y < 6; y++) {
      const w = Math.max(0, Math.round(6 - Math.sqrt(Math.max(0, 36 - (6 - y) * (6 - y)))));
      if (left) px.rect(0, y, w + 1, 1, stone); else px.rect(15 - w, y, w + 1, 1, stone);
    }
  }
  for (const x of [2, 7, 12]) px.rect(x, upper ? 3 : 0, 2, upper ? 13 : 16, bar).rect(x + 1, upper ? 3 : 0, 1, upper ? 13 : 16, barShade);
  px.rect(0, upper ? 9 : 6, 16, 1, barShade);
}

// ---------------------------------------------------------------- 1. Ice
const ICE_PAINT: PitPaint = {
  stain: 'blood1', bone: 'bone', boneShade: 'mist', metal: 'grey2', metalHi: 'grey3', shade: 'slate',
  cap(c) {
    const px = new Px(16).fill('mist');
    const spots = [[[4, 4], [11, 9]], [[9, 3], [4, 11]], [[3, 8], [12, 4]], [[7, 6], [12, 12]]][c.v] as [number, number][];
    for (const [x, y] of spots) px.ellipse(x, y, 3, 2, 'bone').set(x - 1, y - 1, 'white');
    px.rect((c.v * 5) % 12 + 2, 13, 2, 1, 'slate');
    rimEdges(px, c, 'white', 'slate');
    return px;
  },
  face(c, upper) {
    const px = new Px(16);
    blocks(px, c, 'teal1', 'teal0', 'sky', upper ? 0 : 2);
    if (upper) {
      px.rect(0, 0, 16, 2, 'sky').rect(0, 0, 16, 1, 'white');
      for (const [x, h] of [[1, 4], [4, 2], [7, 5], [11, 3], [14, 4]] as const) { px.rect(x, 2, 1, h, 'white'); px.set(x, 2 + h, 'sky'); }
    } else {
      px.rect(0, 13, 16, 3, 'bone');
      for (const x of [1, 6, 10, 13]) px.set(x, 12, 'bone');
    }
    return px;
  },
  gate(c, upper) { const px = new Px(16); bars(px, c, upper, 'teal1', 'grey3', 'grey2'); return px; },
  floor(c) {
    const px = new Px(16).fill('mist');
    const streaks = [[[2, 4, 6], [9, 11, 5]], [[5, 2, 7], [3, 12, 4]], [[8, 7, 6], [1, 13, 5]], [[3, 9, 5], [10, 3, 4]]][c.v] as [number, number, number][];
    for (const [x, y, w] of streaks) px.rect(x, y, w, 1, 'sky').rect(x + 1, y + 1, w - 2, 1, 'bone');
    px.line((c.v * 3) % 10 + 2, 10, (c.v * 3) % 10 + 6, 14, 'slate');
    return px;
  },
};

const ICE: StageLook = {
  slug: 'ice', name: 'Ice pit', night: true,
  note: 'A pit cut in frozen stone: snow on the rim, the wall glazed in ice with icicles along its top course, packed ice underfoot, and pale light falling through a grate in the ceiling onto the middle of the floor.',
  tile: (c) => pitTile(ICE_PAINT, c),
  props: (phase) => pitProps(torch(phase, 'grey2', ['orange', 'amber', 'yellow'])),
  lights: [[48, 26, 34, 0.9], [208, 26, 34, 0.9], [128, 100, 56, 0.85]],
  glow: [120, 170, 255],
};

// ---------------------------------------------------------------- 2. Rust
const RUST_PAINT: PitPaint = {
  stain: 'soil0', bone: 'sand', boneShade: 'soil3', metal: 'grey2', metalHi: 'grey3', shade: 'soil0',
  cap(c) {
    const px = new Px(16).fill('grey1');
    px.rect(0, 7, 16, 1, 'ink').rect(7 + (c.v & 1) * 2, 0, 1, 16, 'ink');
    for (const [x, y] of [[2, 2], [13, 2], [2, 12], [13, 12]] as const) px.set(x, y, 'grey3');
    px.ellipse(4 + c.v * 2, 10 - c.v, 2, 1.5, 'soil2').set(4 + c.v * 2, 10 - c.v, 'orange');
    rimEdges(px, c, 'grey3', 'soil0');
    return px;
  },
  face(c, upper) {
    const px = new Px(16).fill('soil2');
    px.rect(c.tx & 1 ? 0 : 8, 0, 1, 16, 'soil1').rect(0, 8, 16, 1, 'soil1');
    for (const [x, y] of [[2, 2], [6, 2], [10, 2], [14, 2], [2, 10], [6, 10], [10, 10], [14, 10]] as const) px.set(x, y, 'sand').set(x, y + 1, 'soil1');
    const sx = [3, 11, 6, 13][c.v] as number;
    px.rect(sx, 3, 1, 5 + c.v, 'orange').rect(sx, 12, 1, 3, 'orange');
    if (upper) px.rect(0, 0, 16, 2, 'grey2').rect(0, 0, 16, 1, 'grey3');
    else px.rect(0, 14, 16, 2, 'soil0');
    return px;
  },
  gate(c, upper) {
    const px = new Px(16);
    bars(px, c, upper, 'soil2', 'grey2', 'grey1');
    px.set(3, 12, 'orange').set(8, 5, 'orange').set(13, 10, 'orange');
    return px;
  },
  floor(c) {
    const px = new Px(16).fill('ink');
    for (let k = 0; k < 16; k += 4) px.rect(0, k, 16, 1, 'grey1').rect(k, 0, 1, 16, 'grey1');
    for (let k = 0; k < 16; k += 4) for (let j = 0; j < 16; j += 4) px.set(k, j, 'grey2');
    const wet = [[5, 5], [9, 1], [1, 9], [13, 13]][c.v] as [number, number];
    px.rect(wet[0], wet[1], 3, 3, 'soil1');
    return px;
  },
};

const RUST: StageLook = {
  slug: 'rust', name: 'Rust cage',
  note: 'An iron pit: riveted plates gone orange with rust, a deck plate rim, iron bars on the gate, and an iron grating for a floor with the dark under it. Torches on the wall and nothing else lit.',
  night: true,
  tile: (c) => pitTile(RUST_PAINT, c),
  props: (phase) => pitProps(torch(phase, 'grey1', ['orange', 'amber', 'yellow'])),
  lights: [[48, 26, 44, 1], [208, 26, 44, 1], [128, 104, 52, 0.85]],
  glow: [255, 140, 60],
};

export const PIT_A: StageLook[] = [ICE, RUST];
