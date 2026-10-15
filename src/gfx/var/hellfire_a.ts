// Hellfire Club looks 1 and 2 (stage 4.2, see hellfire.ts). "After school" is the room by day: fluorescent light, beige painted
// block, a green board, bright checker linoleum, blue plastic chairs and a black cloth on the table. "Red lamp" is the same
// room after hours with the lights off and one red gelled lamp clamped to the table: everything else is a few steps from black.
// Both are colors only, handed to hellfireLook() in hellfire_props.ts, over the painters of hellfire_paint.ts. The night look is
// painted in daytime values for the night pass to darken, and in dark warm browns and black so the red pool lifts them to red.
import { Px } from '../px.ts';
import type { Prop, StageLook, TC } from './look_kit.ts';
import { hellfireLook } from './hellfire_props.ts';
import { lightFloor } from './hellfire_paint.ts';
import type { Kit } from './hellfire_paint.ts';

const DAY: Kit = {
  top: 'grey2', topHi: 'grey3', wall: 'skin0', wallHi: 'cream', wallLo: 'sand',
  base: 'grey1', baseHi: 'grey2', baseLo: 'ink',
  fa: 'bone', fb: 'grey3', fHi: 'white', fLo: 'grey2', shade: 'grey2',
  wood: 'soil3', woodHi: 'sand', woodLo: 'soil1',
  board: 'pine1', boardHi: 'pine2', chalk: 'white', chalk2: 'bone',
  frame: 'grey3', frameHi: 'white', slot: 'sky',
  desk: 'sand', deskHi: 'cream', deskLo: 'soil3', leg: 'grey2', seat: 'blue', seatLo: 'dusk',
  books: ['red', 'blue', 'pine2', 'amber', 'purple', 'teal1', 'bone'],
  poster: { bg: 'night', a: 'bone', b: 'red', c: 'amber' },
};
const CLOUD: [number, number][] = [[2, 7], [3, 7], [3, 8], [4, 8], [8, 7], [9, 7]];
/** Day glass: blinds half down on top, sky and a cloud below, a row of treetops. */
function daySky(px: Px, c: TC, g0: number, g1: number): void {
  const w = g1 - g0 + 1;
  px.rect(g0, 3, w, 7, 'sky');
  for (const [x, y] of CLOUD) px.set(g0 + x, y, 'white');
  for (let x = g0; x <= g1; x++) px.set(x, 9, (x + (c.tx & 1)) % 3 ? 'pine3' : 'pine2');
  px.rect(g0, 3, w, 1, 'bone').rect(g0, 4, w, 1, 'grey3').rect(g0, 5, w, 1, 'bone');
}

const RED: Kit = {
  top: 'black', topHi: 'soil0', wall: 'soil1', wallHi: 'soil2', wallLo: 'soil0',
  base: 'black', baseHi: 'soil0', baseLo: 'black',
  fa: 'soil1', fb: 'soil0', fHi: 'soil2', fLo: 'black', shade: 'black',
  wood: 'soil1', woodHi: 'soil2', woodLo: 'black',
  board: 'black', boardHi: 'soil0', chalk: 'grey3', chalk2: 'grey2',
  frame: 'soil1', frameHi: 'soil2', slot: 'night',
  desk: 'soil2', deskHi: 'soil3', deskLo: 'soil1', leg: 'grey1', seat: 'soil1', seatLo: 'soil0',
  books: ['soil2', 'soil3', 'grey2', 'soil1', 'dusk'],
  poster: { bg: 'black', a: 'soil2', b: 'blood1', c: 'soil3' },
};

/** A gooseneck lamp clamped to the table: a red gelled shade, the bulb behind it flickering between pink and cream. 14 by 18. */
function lamp(phase: number): Px {
  const px = new Px(14, 18);
  px.art(['...hhhhhh.....', '..hrrrrrrh....', '.hrrrrrrrrh...', '.rrrrrrrrrr...'], { h: 'hot', r: 'red' }, 0, 1);
  px.rect(2, 5, 8, 1, phase & 1 ? 'cream' : 'pink').rect(4, 6, 4, 1, 'pink').line(6, 7, 4, 12, 'grey2').line(4, 12, 4, 14, 'grey2');
  px.rect(1, 15, 8, 2, 'grey1').rect(2, 14, 6, 1, 'grey2');
  return px.outline('ink');
}

export const HELLFIRE_A: StageLook[] = [
  hellfireLook({
    slug: 'after-school', name: 'After school', night: false, glow: [0, 0, 0], lights: [],
    note: 'The room by day: fluorescent light, beige block walls, a green chalkboard, the checker floor, and a black cloth on the table.',
    tiles: {
      k: DAY,
      glass: (px, c, g0, g1) => daySky(px, c, g0, g1),
      fx: (px, c) => { if (c.ch === '.' && c.n === 'w') lightFloor(px, ['bone', 'grey3', 'grey2'], ['white', 'bone', 'grey3'], 0, 2, 15, 15); },
    },
    table: { cloth: 'night', clothHi: 'shadow', clothLo: 'black', trim: 'red', paper: 'cream', paperLo: 'sand', line: 'soil1', room: 'sand', minis: ['red', 'blue', 'pine3', 'amber'], boss: 'pine2', die: 'white', dieHi: 'bone', can: 'red', sheet: 'white' },
    banner: { field: 'ink', face: 'red', teeth: 'bone', eye: 'yellow', trim: 'blood1', rod: 'amber' },
    screen: { panel: 'blood1', hi: 'red', lo: 'blood0', art: 'amber', art2: 'cream' },
    chair: { back: 'blue', backHi: 'sky', seat: 'blue', seatHi: 'sky', seatLo: 'dusk', leg: 'grey2' },
    clock: { rim: 'grey1', face: 'white', hand: 'ink', tick: 'red' },
    cart: { body: 'grey2', hi: 'grey3', lo: 'grey1', glass: 'teal0', leg: 'grey1' },
  }),
  hellfireLook({
    slug: 'red-lamp', name: 'Red lamp', night: true, glow: [700, 50, 40],
    note: 'After hours with the lights off: one red gelled lamp on the table, and the room around it a few steps from black.',
    tiles: { k: RED, glass: (px, _c, g0, g1) => { px.rect(g0, 3, g1 - g0 + 1, 7, 'night').rect(g0, 7, g1 - g0 + 1, 3, 'dusk').set(g0 + 2, 5, 'mist'); } },
    table: { cloth: 'black', clothHi: 'blood0', clothLo: 'ink', trim: 'blood1', paper: 'soil2', paperLo: 'soil1', line: 'soil0', room: 'soil1', minis: ['blood1', 'dusk', 'soil3', 'grey2'], boss: 'pine1', die: 'grey3', dieHi: 'bone', can: 'blood1', sheet: 'grey3' },
    banner: { field: 'ink', face: 'blood1', teeth: 'grey2', eye: 'red', trim: 'blood0', rod: 'soil2' },
    screen: { panel: 'soil1', hi: 'soil2', lo: 'soil0', art: 'blood1', art2: 'soil3' },
    chair: { back: 'soil1', backHi: 'soil2', seat: 'soil1', seatHi: 'soil2', seatLo: 'soil0', leg: 'grey1' },
    clock: { rim: 'grey1', face: 'grey3', hand: 'ink', tick: 'blood1' },
    cart: { body: 'grey1', hi: 'grey2', lo: 'black', glass: 'black', leg: 'grey1' },
    extra: (phase): Prop[] => [{ px: lamp(phase), x: 142, y: 58, actor: true }],
    lights: [[142, 78, 92, 1], [128, 24, 40, 0.25]],
  }),
];
