// Hopper in Kamchatka (stage 4.1): five prisoner looks on the big body, each a CharSpec and a PortraitSpec in the game's own
// formats so the pick drops into data/hopper.ts and data/portraits_l56.ts as it is. Every one has the shaved head: a bare skin
// dome with a stubble shade (skin1, role d) along the crown, the temples and the nape. He keeps his bare fists, so no weapon.
// Five fill colors a design at most, counted over all its frames, plus the ink outline. Role letters: s skin, d stubble and
// ear, e eye, h mustache or beard or cap, a coat or jacket or shirt, b patch or trim, c a second trim, p trousers, f boots.
import type { Expr } from '../../core/types.ts';
import type { PortraitSpec } from '../data/portraits.ts';
import { SHOULDERS } from '../data/portraits.ts';
import type { CharSpec, HairLayers, Part } from '../data/types.ts';

/** What a design is on the sheet: the paper-doll spec on the big body, the portrait spec, and the words it is picked by. */
export interface HopperOpt {
  /** For the snap attribute: hopper4-telogreika. */
  slug: string;
  name: string;
  /** One line: the idea. */
  note: string;
  spec: CharSpec;
  portrait: PortraitSpec;
  /** The second expression on the card, after neutral. */
  other: Expr;
}

const none = { weapon: 'none', torso: 'plain' } as const;

// ---------------------------------------------------------------- shared: the shaved head
/** The stubble on a shaved scalp, per view, y 2 to 7. Everything else on the head is bare skin. */
const SCALP: HairLayers = {
  down: [{ y: 2, rows: ['.....dddddd.....', '....dd....dd....', '....d......d....'] }],
  up: [{ y: 2, rows: ['.....dddddd.....', '....dd....dd....', '....d......d....', '....d......d....', '....dddddddd....', '.....dddddd.....'] }],
  side: [{ y: 2, rows: ['.....dddddd.....', '....dddd........', '....dd..........', '....d...........', '....dd..........', '.....dd.........'] }],
};
/** Ink, or a beard color, along the lip. */
const MUSTACHE: HairLayers = {
  down: [{ y: 6, rows: ['.....hhhhhh.....'] }],
  up: [],
  side: [{ y: 6, rows: ['..........hh....'] }],
};
/** The scalp stubble on a portrait, y 4 to 6: the crown row and the two temples. */
const SCALP_P: Part = { y: 4, rows: [
  '......dddddddddddd......',
  '.....dd..d....d..dd.....',
  '.....d............d.....',
] };
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
const mesh = (ch: string) => (x: number, y: number): string => ((x + y) % 5 === 0 || (x - y + 50) % 5 === 0 ? ch : '.');

// ---------------------------------------------------------------- 1. Telogreika
const TELOGREIKA: CharSpec = {
  id: 'hopper', body: 'big', ...none,
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

const TELOGREIKA_PORTRAIT: PortraitSpec = {
  bg: 'dusk', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', a: 'grey1', b: 'bone', c: 'grey2' },
  back: [],
  front: [SCALP_P, MUSTACHE_P],
  trim: [
    over(18, 23, mesh('c')),
    { y: 20, rows: ['...............bbbbb....', '...............beebb....', '...............bbbbb....'] },
  ],
};

// ---------------------------------------------------------------- 2. Work gang
const WORK_GANG: CharSpec = {
  id: 'hopper', body: 'big', ...none, sleeve: 's',
  pal: { s: 'skin0', d: 'skin1', e: 'ink', h: 'soil1', a: 'grey3', b: 'soil1', p: 'shadow', q: 'shadow', f: 'soil1' },
  hair: {
    down: [...SCALP.down, { y: 5, rows: ['....d......d....', '....dhhhhhhd....', '.....dddddd.....'] }],
    up: SCALP.up,
    side: [...SCALP.side, { y: 5, rows: ['........dd......', '......dddhh.....', '.....dddddd.....'] }],
  },
  trim: {
    down: [{ y: 8, rows: ['...s.bssssb.s...', '...s.b.ss.b.s...', '...s.b..d.bds...', '...ppbppppbpp...'] }],
    up: [{ y: 8, rows: ['...s.b....b.s...', '...s..b..b..s...', '...s...bb...s...', '...pppppppppp...'] }],
    side: [{ y: 8, rows: ['................', '.........b......', '.........b......', '.....ppppppp....'] }],
  },
};

const WORK_GANG_PORTRAIT: PortraitSpec = {
  bg: 'slate', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', a: 'grey3', b: 'soil1' },
  back: [],
  front: [SCALP_P, { y: 11, rows: [
    '.....d............d.....',
    '.....dd..........dd.....',
    '.....dd.hhhhhhhh.dd.....',
    '......ddd......ddd......',
    '.......dddddddddd.......',
    '........dddddddd........',
  ] }],
  trim: [over(18, 23, (x, y) => {
    if (x <= 5 || x >= 18) return 'S';
    if (x === 6 || x === 17) return 'd';
    if (x === 8 || x === 9 || x === 14 || x === 15) return 'b';
    return (x === 11 && y === 22) || (x === 13 && y === 21) ? 'd' : '.';
  })],
};

// ---------------------------------------------------------------- 3. Ushanka
const USHANKA: CharSpec = {
  id: 'hopper', body: 'big', ...none,
  pal: { s: 'skin0', d: 'skin1', e: 'ink', h: 'grey1', a: 'grey2', b: 'bone', c: 'ink', p: 'grey1', q: 'grey1', f: 'ink', i: 'ink' },
  hair: {
    down: [{ y: 1, rows: ['....aahhhhaa....', '...ahhhbbhhha...', '...aiaaiaaiaa...', '....d......d....', '....d......d....', '.....iiiiii.....'] }],
    up: [{ y: 1, rows: ['....aahhhhaa....', '...ahhhhhhhha...', '...aiaaiaaiaa...', '....aaiaaaia....', '....d......d....', '....d......d....', '.....dddddd.....'] }],
    side: [{ y: 1, rows: ['....aahhhaa.....', '...ahhhhhhhha...', '...aiaaiaaaaaa..', '...aad..........', '....d...........', '....dd....ii....'] }],
  },
  trim: {
    down: [quilt(3, 12, 'c'), { y: 9, rows: ['.........bbb....', '.........bbb....'] }],
    up: [quilt(3, 12, 'c'), { y: 9, rows: ['......bbbb......', '......bbbb......'] }],
    side: [quilt(5, 10, 'c')],
  },
};

const USHANKA_PORTRAIT: PortraitSpec = {
  bg: 'dusk', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', g: 'grey1', h: 'soil1', i: 'grey2', a: 'grey2', b: 'bone', c: 'ink' },
  back: [],
  front: [{ y: 1, rows: [
    '.......iiiggggiii.......',
    '.....iiiggggggggiii.....',
    '....iggggggggggggggi....',
    '....gggggggbbggggggg....',
    '....gggggggbbggggggg....',
    '....iiiiiiiiiiiiiiii....',
    '....iiciiiiciiiiciii....',
    '.....dd..........dd.....',
    '.....d............d.....',
  ] }, MUSTACHE_P],
  trim: [
    over(18, 23, mesh('c')),
    { y: 20, rows: ['...............bbbbb....', '...............beebb....', '...............bbbbb....'] },
  ],
};

// ---------------------------------------------------------------- 4. Bearded
const BEARDED: CharSpec = {
  id: 'hopper', body: 'big', ...none,
  pal: { s: 'skin0', d: 'skin1', e: 'ink', h: 'soil1', a: 'grey1', b: 'sand', c: 'ink', p: 'soil1', q: 'soil1', f: 'ink' },
  hair: {
    down: [...SCALP.down, { y: 5, rows: ['....hh....hh....', '....hhhhhhhh....', '....hhhhhhhh....', '.....hhhhhh.....', '.......hh.......'] }],
    up: SCALP.up,
    side: [...SCALP.side, { y: 5, rows: ['........hh......', '.....hhhhhhh....', '.....hhhhhhh....', '......hhhh......', '.......h........'] }],
  },
  trim: {
    down: [
      { y: 9, rows: ['....bb.....c....', '....bb....c.....'] },
      { y: 11, rows: ['...bbbbbbbbbb...'] },
      { y: 12, rows: ['....a.a..a.a....'] },
    ],
    up: [
      { y: 9, rows: ['......bbb.......', '......bcb....c..', '.............c..'] },
      { y: 11, rows: ['...bbbbbbbbbb...'] },
      { y: 12, rows: ['....a.a..a.a....'] },
    ],
    side: [
      { y: 9, rows: ['.....bb..c......', '.....bb.........'] },
      { y: 11, rows: ['.....bbbbbbb....'] },
      { y: 12, rows: ['.....a.a.a......'] },
    ],
  },
};

const BEARDED_PORTRAIT: PortraitSpec = {
  bg: 'night', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', a: 'grey1', b: 'sand', c: 'ink' },
  back: [],
  front: [SCALP_P, { y: 10, rows: [
    '.....h............h.....',
    '.....hh..........hh.....',
    '.....hhhh......hhhh.....',
    '.....hhhhhhhhhhhhhh.....',
    '......hhh......hhh......',
    '.......hhhhhhhhhh.......',
    '........hhhhhhhh........',
    '........hhhhhhhh........',
    '.........hhhhhh.........',
  ] }],
  trim: [
    { y: 19, rows: ['....bbbb................', '....bcbb...........c....', '....bbbb.............c..'] },
  ],
};

// ---------------------------------------------------------------- 5. Greatcoat
const GREATCOAT: CharSpec = {
  id: 'hopper', body: 'big', ...none,
  pal: { s: 'skin0', d: 'skin1', e: 'ink', h: 'ink', a: 'grey2', b: 'amber', c: 'grey1', p: 'grey2', q: 'grey2', f: 'ink' },
  hair: {
    down: [...SCALP.down, ...MUSTACHE.down],
    up: SCALP.up,
    side: [...SCALP.side, ...MUSTACHE.side],
  },
  trim: {
    down: [{ y: 8, rows: ['...bb.cccc.bb...', '.....b.cc.b.....', '.....b....b.....', '.....b....b.....'] }, { y: 12, rows: ['..aaaaaccaaaaa..'] }],
    up: [{ y: 8, rows: ['...bb......bb...', '................', '....cccccccc....', '................'] }, { y: 12, rows: ['..aaaaaccaaaaa..'] }],
    side: [{ y: 8, rows: ['.......bb.......', '.........b......', '................', '.........b......'] }, { y: 12, rows: ['....aaaaaaaa....'] }],
  },
};

const GREATCOAT_PORTRAIT: PortraitSpec = {
  bg: 'night', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', a: 'grey2', b: 'amber', c: 'grey1' },
  back: [],
  front: [SCALP_P, MUSTACHE_P],
  trim: [
    { y: 18, rows: [
      '.......bb......bb.......',
      '...bbb.bbc....cbb.bbb...',
      '..........c..c..........',
      '...........cc...........',
    ] },
    over(21, 23, (x, y) => ((x === 9 || x === 14) && (y === 21 || y === 23) ? 'b' : '.')),
  ],
};

export const HOPPER4_OPTS: HopperOpt[] = [
  { slug: 'telogreika', name: 'Telogreika', note: 'The quilted black-grey jacket with a pale number patch, trousers to match, a buzzed scalp and his mustache.', spec: TELOGREIKA, portrait: TELOGREIKA_PORTRAIT, other: 'determined' },
  { slug: 'work-gang', name: 'Work gang', note: 'The railroad detail: a dirty off-white undershirt and suspenders that leave his thick arms bare, a stubble beard.', spec: WORK_GANG, portrait: WORK_GANG_PORTRAIT, other: 'determined' },
  { slug: 'ushanka', name: 'Ushanka', note: 'A mid-grey quilted jacket and a small dark fur cap with the flaps tied up, the shaved sides showing under it.', spec: USHANKA, portrait: USHANKA_PORTRAIT, other: 'determined' },
  { slug: 'bearded', name: 'Bearded', note: 'Months in: a full scruffy beard on the shaved head, a ragged jacket with tan patches and a rope belt.', spec: BEARDED, portrait: BEARDED_PORTRAIT, other: 'determined' },
  { slug: 'greatcoat', name: 'Greatcoat', note: 'The escape: a guard\'s long grey greatcoat with brass buttons and shoulder boards over the prison clothes.', spec: GREATCOAT, portrait: GREATCOAT_PORTRAIT, other: 'determined' },
];
