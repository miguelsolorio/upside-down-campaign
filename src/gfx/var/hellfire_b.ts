// Hellfire Club looks 3 and 4 (stage 4.2, see hellfire.ts). "Black light" is the room with a purple black light on a stand and
// tubes overhead: everything dark and violet, and the banner, the posters, the chalk, the map and the minis glowing magenta,
// cyan and yellow. "Storm" is the room in a thunderstorm: cold blue through the windows with lightning, rain on the glass, and
// candles on the table for the only warm light. Colors only, handed to hellfireLook() in hellfire_props.ts, over the painters of
// hellfire_paint.ts. Painted in daytime values for the night pass to darken; the night pass leaves magenta, yellow, purple and the
// warm lights alone, which is how the neon and the candles keep their glow.
import type { ColorName as N } from '../palette.ts';
import { Px } from '../px.ts';
import type { Prop, StageLook } from './look_kit.ts';
import { candleSpots, candles, hellfireLook } from './hellfire_props.ts';
import { lightFloor } from './hellfire_paint.ts';
import type { Kit } from './hellfire_paint.ts';

const UV: Kit = {
  top: 'ink', topHi: 'purple0', wall: 'night', wallHi: 'shadow', wallLo: 'ink',
  base: 'ink', baseHi: 'purple0', baseLo: 'black',
  fa: 'night', fb: 'ink', fHi: 'shadow', fLo: 'black', shade: 'black',
  wood: 'shadow', woodHi: 'dusk', woodLo: 'ink',
  board: 'ink', boardHi: 'night', chalk: 'cyan', chalk2: 'magenta',
  frame: 'shadow', frameHi: 'dusk', slot: 'purple0',
  desk: 'dusk', deskHi: 'slate', deskLo: 'shadow', leg: 'grey1', seat: 'purple0', seatLo: 'night',
  books: ['magenta', 'cyan', 'yellow', 'pink', 'purple', 'hot'],
  poster: { bg: 'ink', a: 'magenta', b: 'cyan', c: 'yellow' },
};

/** A black light on a stand (12 by 34): a tube in a housing that pulses between purple and magenta. */
function blacklight(phase: number): Px {
  const px = new Px(12, 34);
  px.rect(3, 1, 6, 2, 'grey1').rect(3, 3, 6, 20, phase & 1 ? 'magenta' : 'purple').rect(5, 3, 2, 20, 'white').rect(3, 23, 6, 2, 'grey1');
  px.rect(5, 25, 2, 6, 'grey2').rect(1, 31, 10, 2, 'grey1').rect(2, 30, 8, 1, 'grey2');
  return px.outline('ink');
}

const STORM: Kit = {
  top: 'ink', topHi: 'dusk', wall: 'slate', wallHi: 'mist', wallLo: 'dusk',
  base: 'ink', baseHi: 'dusk', baseLo: 'ink',
  fa: 'grey2', fb: 'grey1', fHi: 'grey3', fLo: 'ink', shade: 'ink',
  wood: 'soil2', woodHi: 'soil3', woodLo: 'soil1',
  board: 'pine0', boardHi: 'pine1', chalk: 'bone', chalk2: 'mist',
  frame: 'dusk', frameHi: 'mist', slot: 'night',
  desk: 'soil3', deskHi: 'sand', deskLo: 'soil2', leg: 'grey2', seat: 'dusk', seatLo: 'shadow',
  books: ['soil2', 'blue', 'pine2', 'soil3', 'purple0', 'teal1', 'bone'],
  poster: { bg: 'night', a: 'bone', b: 'blood1', c: 'amber' },
};
/** On the flash (phase 0) every tile goes a step brighter. */
const FLASH_FROM: N[] = ['ink', 'grey1', 'grey2', 'dusk', 'slate', 'mist'], FLASH_TO: N[] = ['grey1', 'grey2', 'grey3', 'slate', 'mist', 'bone'];
/** Storm glass: rain on a dark sky that slides down with the phase; on phase 0 the sky goes white with a bolt in it. */
function stormGlass(px: Px, c: { w: string }, g0: number, g1: number, phase: number): void {
  const w = g1 - g0 + 1;
  if (phase === 0) {
    px.rect(g0, 3, w, 7, 'white').rect(g0, 7, w, 3, 'sky');
    const x = c.w === 'w' ? g0 + 3 : g0 + 6;
    px.line(x, 3, x - 2, 5, 'cream').line(x - 2, 5, x, 6, 'cream').line(x, 6, x - 3, 9, 'cream');
    return;
  }
  px.rect(g0, 3, w, 7, 'teal0').rect(g0, 3, w, 3, 'night');
  for (let x = g0; x <= g1; x += 3) { const y = 3 + ((phase * 2 + x) % 6); px.set(x, y, 'sky').set(x - 1, y + 1, 'mist'); }
}

export const HELLFIRE_B: StageLook[] = [
  hellfireLook({
    slug: 'black-light', name: 'Black light', night: true, glow: [260, 40, 700],
    note: 'Lights off, a purple black light on a stand: the room goes violet and the banner, posters, chalk, map and minis glow neon.',
    tiles: {
      k: UV,
      glass: (px, _c, g0, g1) => { px.rect(g0, 3, g1 - g0 + 1, 7, 'night'); for (let y = 3; y < 10; y += 2) px.rect(g0, y, g1 - g0 + 1, 1, 'ink'); px.rect(g0, 9, g1 - g0 + 1, 1, 'purple0'); },
    },
    table: { cloth: 'purple0', clothHi: 'purple', clothLo: 'night', trim: 'magenta', paper: 'slate', paperLo: 'dusk', line: 'magenta', room: 'dusk', minis: ['magenta', 'cyan', 'yellow', 'hot'], boss: 'cyan', die: 'white', dieHi: 'cyan', can: 'yellow', sheet: 'white' },
    banner: { field: 'ink', face: 'magenta', teeth: 'white', eye: 'cyan', trim: 'purple', rod: 'purple' },
    screen: { panel: 'night', hi: 'purple', lo: 'ink', art: 'magenta', art2: 'cyan' },
    chair: { back: 'dusk', backHi: 'slate', seat: 'night', seatHi: 'dusk', seatLo: 'ink', leg: 'grey1' },
    clock: { rim: 'night', face: 'white', hand: 'ink', tick: 'magenta' },
    cart: { body: 'night', hi: 'dusk', lo: 'ink', glass: 'ink', leg: 'grey1' },
    extra: (phase): Prop[] => [{ px: blacklight(phase), x: 236, y: 76, actor: true }],
    lights: [[48, 40, 100, 0.7], [208, 40, 100, 0.7], [242, 92, 72, 0.9], [128, 100, 110, 0.6]],
  }),
  hellfireLook({
    slug: 'storm', name: 'Storm', night: true, glow: [560, 300, 80],
    note: 'A thunderstorm: cold blue through the windows with lightning and rain on the glass, and candles on the table for the only warm light.',
    tiles: {
      k: STORM, glass: stormGlass,
      fx: (px, c, phase) => {
        if (!phase) lightFloor(px, FLASH_FROM, FLASH_TO, 0, 0, 15, 15);
        if (c.ch === '.' && c.n === 'w') lightFloor(px, phase ? ['grey2', 'grey1', 'ink'] : ['grey3', 'grey2', 'grey1'], phase ? ['grey3', 'grey2', 'grey1'] : ['mist', 'grey3', 'grey2'], 0, 2, 15, 15);
      },
    },
    table: { cloth: 'black', clothHi: 'blood0', clothLo: 'ink', trim: 'blood1', paper: 'soil3', paperLo: 'soil2', line: 'soil0', room: 'soil2', minis: ['red', 'blue', 'amber', 'pink'], boss: 'pine2', die: 'bone', dieHi: 'white', can: 'red', sheet: 'bone' },
    banner: { field: 'ink', face: 'blood1', teeth: 'grey3', eye: 'orange', trim: 'blood0', rod: 'soil2' },
    screen: { panel: 'soil1', hi: 'soil2', lo: 'soil0', art: 'blood1', art2: 'soil3' },
    chair: { back: 'soil2', backHi: 'soil3', seat: 'soil2', seatHi: 'soil3', seatLo: 'soil1', leg: 'grey2' },
    clock: { rim: 'grey1', face: 'bone', hand: 'ink', tick: 'red' },
    cart: { body: 'grey2', hi: 'grey3', lo: 'grey1', glass: 'night', leg: 'grey1' },
    extra: (phase): Prop[] => candles('cream', 'orange', 'yellow', phase),
    lights: [...candleSpots().map(([x, y]) => [x, y, 30, 0.85] as const), [128, 84, 52, 0.3]],
  }),
];
