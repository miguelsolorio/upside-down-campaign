// Hopper in the Telogreika, the owner's pick for Kamchatka (docs/level-10.md, gfx/var/hopper4_opts.ts): the camp's quilted black-grey
// jacket with a pale number patch on the chest and trousers to match, a buzzed scalp (a bare dome with a stubble shade) and his
// mustache, on the big body with arms two pixels thick. From chapter 4 gfx draws him in it everywhere, sprite and portrait
// (looks.ts); before, the Uniform (data/hopper.ts). Five fill colors (skin, stubble, two greys, bone) and the ink outline. Rows are 16
// wide, the portrait's 24. Roles: s skin, d stubble and the ears, e the eyes, h the mustache, a the jacket and trousers, b the patch,
// c the quilting, p trousers, f boots.
import type { PortraitSpec } from './portraits.ts';
import { SHOULDERS } from './portraits.ts';
import type { CharSpec, HairLayers, Part } from './types.ts';

/** The stubble on the shaved scalp, per view. Everything else on the head is bare skin. */
const SCALP: HairLayers = {
  down: [{ y: 2, rows: ['.....dddddd.....', '....dd....dd....', '....d......d....'] }],
  up: [{ y: 2, rows: ['.....dddddd.....', '....dd....dd....', '....d......d....', '....d......d....', '....dddddddd....', '.....dddddd.....'] }],
  side: [{ y: 2, rows: ['.....dddddd.....', '....dddd........', '....dd..........', '....d...........', '....dd..........', '.....dd.........'] }],
};
/** The mustache, in ink along the lip. */
const MUSTACHE: HairLayers = {
  down: [{ y: 6, rows: ['.....hhhhhh.....'] }],
  up: [],
  side: [{ y: 6, rows: ['..........hh....'] }],
};
/** The same on the portrait: the crown row and the two temples, and the mustache. */
const SCALP_P: Part = { y: 4, rows: ['......dddddddddddd......', '.....dd..d....d..dd.....', '.....d............d.....'] };
const MUSTACHE_P: Part = { y: 13, rows: ['........hhhhhhhh........', '........hh....hh........'] };

/** Diamond quilting: a dot of role ch wherever the two diagonals cross, from column x0 to x1 over the four torso rows. */
function quilt(x0: number, x1: number, ch: string): Part {
  const rows: string[] = [];
  for (let y = 8; y < 12; y++) {
    let r = '';
    for (let x = 0; x < 16; x++) r += x >= x0 && x <= x1 && ((x + y) % 4 === 0 || (x - y + 16) % 4 === 0) ? ch : '.';
    rows.push(r);
  }
  return { y: 8, rows };
}

/** A portrait part drawn from a rule: at(x, y) names the letter for each cell of the shoulders, and the rest is left empty. */
function over(y0: number, y1: number, at: (x: number, y: number) => string): Part {
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let r = '';
    const sh = SHOULDERS.rows[y - SHOULDERS.y] as string;
    for (let x = 0; x < 24; x++) r += sh[x] === 'A' ? at(x, y) : '.';
    rows.push(r);
  }
  return { y: y0, rows };
}

export const HOPPER4: CharSpec = {
  id: 'hopper', body: 'big', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin1', e: 'ink', h: 'ink', a: 'grey1', b: 'bone', c: 'grey2', p: 'grey1', q: 'grey1', f: 'ink' },
  hair: {
    down: [...SCALP.down, ...MUSTACHE.down],
    up: SCALP.up,
    side: [...SCALP.side, ...MUSTACHE.side],
  },
  trim: {
    down: [quilt(3, 12, 'c'), { y: 9, rows: ['.........bbb....', '.........bbb....'] }],
    up: [quilt(3, 12, 'c'), { y: 9, rows: ['......bbbb......', '......bbbb......'] }],
    side: [quilt(5, 10, 'c')],
  },
};

export const HOPPER4_PORTRAIT: PortraitSpec = {
  bg: 'dusk', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', a: 'grey1', b: 'bone', c: 'grey2' },
  back: [],
  front: [SCALP_P, MUSTACHE_P],
  trim: [
    over(18, 23, (x, y) => ((x + y) % 5 === 0 || (x - y + 50) % 5 === 0 ? 'c' : '.')),
    { y: 20, rows: ['...............bbbbb....', '...............beebb....', '...............bbbbb....'] },
  ],
};
