// Pit looks 3 and 4. Floodlit: a concrete arena with hazard stripes, a steel shutter for the gate and a sand floor, lit hard
// from above by one floodlight, the way the guards watch a fight. Mine: an old shaft under the camp, rough rock held up by
// timber, a plank barricade for a gate, a dirt floor and hanging lanterns. See pit_kit.ts.
import type { ColorName } from '../palette.ts';
import { Px } from '../px.ts';
import type { StageLook, TC } from './look_kit.ts';
import { pitProps, pitTile } from './pit_kit.ts';
import type { PitPaint } from './pit_kit.ts';

const open = (ch: string): boolean => ch !== '#' && ch !== 'W' && ch !== 'G';
const isWall = (ch: string): boolean => ch === 'W' || ch === 'G';

function rimEdges(px: Px, c: TC, lit: ColorName, drop: ColorName): void {
  if (isWall(c.s)) px.rect(0, 12, 16, 1, lit).rect(0, 13, 16, 3, drop);
  if (open(c.e)) px.rect(15, 0, 1, 16, drop).rect(14, 0, 1, 16, lit);
  if (open(c.w)) px.rect(0, 0, 1, 16, drop).rect(1, 0, 1, 16, lit);
  if (open(c.n)) px.rect(0, 0, 16, 1, lit);
}

/** Diagonal hazard stripes across a band of rows. */
function hazard(px: Px, y: number, h: number, a: ColorName, b: ColorName, shift: number): void {
  for (let j = 0; j < h; j++) for (let x = 0; x < 16; x++) px.set(x, y + j, ((x + j + shift) >> 2) & 1 ? a : b);
}

/** A caged lamp on a wall bracket, 8 by 16. */
function lamp(phase: number): Px {
  const p = new Px(8, 16);
  p.rect(3, 9, 2, 6, 'grey2').rect(1, 3, 6, 6, 'grey1').rect(2, 4, 4, 4, phase & 1 ? 'white' : 'cream');
  p.rect(1, 5, 6, 1, 'grey2').rect(3, 3, 1, 6, 'grey2');
  return p.outline('ink');
}

/** A lantern on a hook, 8 by 16: amber glass in a dark frame. */
function lantern(phase: number): Px {
  const p = new Px(8, 16);
  p.rect(3, 0, 1, 4, 'grey2').rect(2, 4, 4, 1, 'grey1').rect(1, 5, 6, 7, 'grey1').rect(2, 6, 4, 5, phase & 1 ? 'amber' : 'yellow');
  p.rect(3, 6, 2, 5, 'cream').rect(1, 12, 6, 1, 'grey2');
  return p.outline('ink');
}

// ---------------------------------------------------------------- 3. Floodlit
const ARENA_PAINT: PitPaint = {
  stain: 'soil2', bone: 'bone', boneShade: 'grey3', metal: 'grey2', metalHi: 'grey3', shade: 'soil3',
  cap(c) {
    const px = new Px(16).fill('grey3');
    px.rect(0, (c.v * 4) % 12 + 2, 16, 1, 'grey2').set((c.v * 7) % 14 + 1, 5, 'grey2');
    if (isWall(c.s)) { hazard(px, 9, 3, 'amber', 'ink', c.tx * 16); px.rect(0, 12, 16, 1, 'bone').rect(0, 13, 16, 3, 'grey1'); }
    if (open(c.e)) px.rect(15, 0, 1, 16, 'grey1').rect(14, 0, 1, 16, 'bone');
    if (open(c.w)) px.rect(0, 0, 1, 16, 'grey1').rect(1, 0, 1, 16, 'bone');
    if (open(c.n)) px.rect(0, 0, 16, 1, 'bone');
    return px;
  },
  face(c, upper) {
    const px = new Px(16).fill('grey2');
    for (let y = upper ? 4 : 0; y < 16; y += 6) px.rect(0, y, 16, 1, 'grey1');
    px.rect(c.tx & 1 ? 3 : 11, 0, 1, 16, 'grey1').rect(c.tx & 1 ? 4 : 12, 0, 1, 16, 'grey3');
    if (upper) px.rect(0, 0, 16, 3, 'red').rect(0, 0, 16, 1, 'hot');
    else hazard(px, 11, 5, 'amber', 'ink', c.tx * 16);
    return px;
  },
  gate(c, upper) {
    const px = new Px(16).fill('grey1');
    for (let y = upper ? 1 : 0; y < 16; y += 3) px.rect(0, y, 16, 1, 'grey2').rect(0, y + 1, 16, 1, 'grey3');
    if (upper) px.rect(0, 0, 16, 1, 'ink');
    else px.rect(0, 12, 16, 4, 'ink').rect(c.e === 'G' ? 3 : 0, 11, 13, 1, 'grey2');
    return px;
  },
  floor(c) {
    const px = new Px(16).fill('sand');
    const rip = [[2, 5, 9], [6, 3, 11], [1, 11, 8], [4, 8, 6]][c.v] as [number, number, number];
    px.rect(rip[0], rip[1], rip[2], 1, 'soil3').rect(rip[0] + 3, rip[1] + 6, rip[2] - 2, 1, 'soil3');
    if (c.v & 1) px.rect(10, 9, 2, 3, 'soil3').rect(12, 5, 2, 3, 'soil3');
    return px;
  },
};

const ARENA: StageLook = {
  slug: 'floodlit', name: 'Floodlit arena',
  note: 'The guards\' fight pit: concrete walls painted with a red band and hazard stripes, a steel shutter for the beast\'s gate, a sand floor, and one hard floodlight from above that leaves the corners dark.',
  night: true,
  tile: (c) => pitTile(ARENA_PAINT, c),
  props: (phase) => pitProps(lamp(phase)),
  lights: [[128, 92, 84, 1], [48, 24, 22, 0.6], [208, 24, 22, 0.6]],
  glow: [255, 250, 220],
};

// ---------------------------------------------------------------- 4. Mine
const MINE_PAINT: PitPaint = {
  stain: 'blood0', bone: 'bone', boneShade: 'grey3', metal: 'grey2', metalHi: 'grey3', shade: 'soil0',
  cap(c) {
    const px = new Px(16).fill('grey2');
    const stones = [[[4, 4], [11, 10]], [[10, 4], [4, 10]], [[6, 7], [12, 3]], [[3, 11], [11, 6]]][c.v] as [number, number][];
    for (const [x, y] of stones) px.ellipse(x, y, 2.5, 2, 'grey3').ellipse(x + 0.5, y + 0.8, 2, 1.2, 'grey1').set(x - 1, y - 1, 'bone');
    px.rect((c.v * 5) % 10 + 3, 13, 3, 1, 'soil1');
    rimEdges(px, c, 'grey3', 'soil0');
    return px;
  },
  face(c, upper) {
    const px = new Px(16).fill('soil1');
    const rocks = [[[3, 4], [10, 9], [5, 13]], [[8, 3], [3, 10], [12, 13]], [[12, 5], [6, 8], [2, 13]], [[5, 6], [12, 10], [8, 14]]][c.v] as [number, number][];
    for (const [x, y] of rocks) px.ellipse(x, y, 3, 2.2, 'soil2').set(x - 1, y - 1, 'sand').rect(x - 2, y + 2, 4, 1, 'soil0');
    if ((c.tx & 1) === 0) px.rect(0, 0, 3, 16, 'soil2').rect(0, 0, 1, 16, 'sand').rect(2, 0, 1, 16, 'soil0');
    if (upper) px.rect(0, 0, 16, 3, 'soil2').rect(0, 0, 16, 1, 'sand').rect(0, 3, 16, 1, 'soil0');
    return px;
  },
  gate(c, upper) {
    const px = new Px(16).fill('ink');
    for (let y = upper ? 2 : 1; y < 16; y += 5) px.rect(0, y, 16, 3, 'soil2').rect(0, y, 16, 1, 'soil3').set(c.e === 'G' ? 2 : 13, y + 1, 'grey3');
    px.line(c.e === 'G' ? 0 : 15, upper ? 2 : 0, c.e === 'G' ? 15 : 0, 15, 'soil3');
    return px;
  },
  floor(c) {
    const px = new Px(16).fill('soil1');
    const peb = [[[3, 3], [11, 7], [6, 12]], [[9, 2], [2, 9], [13, 13]], [[5, 6], [12, 11], [2, 14]], [[12, 3], [7, 9], [3, 5]]][c.v] as [number, number][];
    for (const [x, y] of peb) px.rect(x, y, 2, 1, 'grey2').set(x, y + 1, 'soil0');
    px.rect((c.v * 4) % 11 + 2, 8, 4, 1, 'soil2');
    return px;
  },
};

const MINE: StageLook = {
  slug: 'mine', name: 'Mine shaft',
  note: 'An old mine shaft under the camp: rough rock walls held up by timber, a plank barricade nailed over the beast\'s tunnel, a dirt floor, and lanterns on hooks for the only light.',
  night: true,
  tile: (c) => pitTile(MINE_PAINT, c),
  props: (phase) => pitProps(lantern(phase)),
  lights: [[48, 28, 36, 0.9], [208, 28, 36, 0.9], [128, 120, 30, 0.4]],
  glow: [255, 180, 80],
};

export const PIT_B: StageLook[] = [ARENA, MINE];
