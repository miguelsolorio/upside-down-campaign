// Portrait art, 24x24. Every row is 24 columns wide. Shared head, shoulders and expression layers; each
// character adds hair, hats and trim. Roles: s skin, d skin shade, h hair, i hair light, j hair dark,
// a b c shirt colors, g G H J gear, w white, e eye or mouth line, m mouth inside, r blush, z sweat.
// 'A' in the shoulders is filled with the shirt pattern at build time, 'C' in a layer is filled with camo.
import type { ColorName } from '../palette.ts';
import type { CharId, Expr } from '../../core/types.ts';
import type { Part } from './types.ts';
import { HOPPER_PORTRAIT, MAX_PORTRAIT, STEVE_PORTRAIT } from './portraits_l56.ts';
import { ERICA_PORTRAIT, NANCY_PORTRAIT, ROBIN_PORTRAIT } from './portraits_l78.ts';
import { BILLY_PORTRAIT } from './portraits_l9.ts';

export type Shirt = 'stripes' | 'plaid' | 'plain' | 'jacket' | 'cardigan';

export interface PortraitSpec {
  bg: ColorName;
  pal: Record<string, ColorName>;
  shirt: Shirt;
  back: Part[];
  front: Part[];
  trim: Part[];
  /** Replaces the mouth in the happy expression. */
  grin?: Part[];
}

export const HEAD: Part = { y: 4, rows: [
  '......SSSSSSSSSSSS......',
  '.....SSSSSSSSSSSSSS.....',
  '.....SSSSSSSSSSSSSS.....',
  '.....SSSSSSSSSSSSSS.....',
  '.....SSSSSSSSSSSSSS.....',
  '....dSSSSSSSSSSSSSSd....',
  '....dSSSSSSSSSSSSSSd....',
  '....dSSSSSSSSSSSSSSd....',
  '.....SSSSSSSSSSSSSS.....',
  '.....SSSSSSSSSSSSSS.....',
  '......SSSSSSSSSSSS......',
  '.......SSSSSSSSSS.......',
  '........SSSSSSSS........',
] };

export const NOSE: Part = { y: 12, rows: ['...........dd...........'] };

export const SHOULDERS: Part = { y: 17, rows: [
  '.........dSSSSd.........',
  '.....AAAAdSSSSdAAAA.....',
  '...AAAAAAAdSSdAAAAAAA...',
  '..AAAAAAAAAddAAAAAAAAA..',
  '..AAAAAAAAAAAAAAAAAAAA..',
  '..AAAAAAAAAAAAAAAAAAAA..',
  '..AAAAAAAAAAAAAAAAAAAA..',
] };

const eyes = (y: number, rows: string[]): Part => ({ y, rows });

/** Face layers per expression, drawn last so hair never hides them. */
export const EXPR: Record<Expr, Part[]> = {
  neutral: [
    { y: 8, rows: ['.......hhhh..hhhh.......'] },
    eyes(9, ['........we....we........', '........ee....ee........', '........ee....ee........']),
    { y: 14, rows: ['..........eeee..........'] },
  ],
  happy: [
    { y: 7, rows: ['.......hhhh..hhhh.......'] },
    eyes(9, ['........ee....ee........', '.......e..e..e..e.......']),
    { y: 12, rows: ['.......rr......rr.......'] },
    { y: 13, rows: ['.........e....e.........', '..........eeee..........'] },
  ],
  worried: [
    { y: 7, rows: ['.........hh..hh.........', '.......hh......hh.......'] },
    eyes(9, ['........we....we........', '........ee....ee........', '........ee....ee........']),
    { y: 7, rows: ['....................z...', '...................zzz..'] },
    { y: 14, rows: ['..........eeee..........', '.........e....e.........'] },
  ],
  determined: [
    { y: 8, rows: ['.......hhhh..hhhh.......', '..........h....h........'] },
    eyes(10, ['........ee....ee........', '........ee....ee........']),
    { y: 14, rows: ['.........eeeeee.........'] },
  ],
  hurt: [
    { y: 7, rows: ['.........hh..hh.........', '.......hh......hh.......'] },
    eyes(9, ['........e....e..........', '.........e..e...........', '........e....e..........']),
    { y: 13, rows: ['.........eeeeee.........', '.........emmmme.........', '.........emmmme.........', '..........eeee..........'] },
  ],
  shocked: [
    { y: 6, rows: ['.......hhhh..hhhh.......'] },
    eyes(8, ['.......wwww..wwww.......', '.......weew..weew.......', '.......weew..weew.......', '.......wwww..wwww.......']),
    { y: 13, rows: ['..........eeee..........', '.........emmmme.........', '..........eeee..........'] },
  ],
};

// ---------------------------------------------------------------- characters
const BASE_PORTRAITS = {
  mike: {
    bg: 'teal0', shirt: 'stripes',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'red', b: 'dusk', c: 'red' },
    back: [],
    front: [{ y: 2, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhihhhhhhhh.....',
      '....hhhhhiihhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhjhhhhhhhhhhjhh....',
      '....hh.hhh.hhh.hhhhh....',
      '....h..............h....',
      '....h..............h....',
    ] }],
    trim: [{ y: 18, rows: [
      '.......wwdSSSSdww.......',
      '........wwdSSdww........',
    ] }],
  },
  dustin: {
    bg: 'purple0', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil3', i: 'sand', j: 'soil2', g: 'leaf', G: 'pine3', H: 'yellow', J: 'pine1', a: 'blue', b: 'sky', c: 'blue' },
    back: [{ y: 7, rows: [
      '...hhh............hhh...',
      '...hhhh..........hhhh...',
      '..hhhhh..........hhhhh..',
      '..hhihh..........hhihh..',
      '...hhhh..........hhhh...',
      '....hhh..........hhh....',
      '.....hh..........hh.....',
    ] }],
    front: [{ y: 2, rows: [
      '.......gggggggggg.......',
      '.....gggHHHHHHHHggg.....',
      '....gggHHHHHHHHHHggg....',
      '....gggHHHHHHHHHHggg....',
      '...GGGGGGGGGGGGGGGGGG...',
      '...JJJJJJJJJJJJJJJJJJ...',
    ] }],
    trim: [],
    grin: [{ y: 13, rows: [
      '........eeeeeeee........',
      '........ewweewwe........',
      '.........eeeeee.........',
    ] }],
  },
  lucas: {
    bg: 'slate', shirt: 'jacket',
    pal: { s: 'skin2', d: 'skin3', h: 'soil0', i: 'soil1', j: 'ink', g: 'pine2', G: 'soil2', H: 'pine0', a: 'sand', b: 'soil3', c: 'sand' },
    back: [],
    front: [
      { y: 3, rows: [
        '........hhhhhhhh........',
        '......hhhhhhhhhhhh......',
      ] },
      { y: 5, rows: [
        '.....CCCCCCCCCCCCCC.....',
        '....CCCCCCCCCCCCCCCC....',
        '.....CCCCCCCCCCCCCC.CC..',
        '....................CCC.',
        '.....................CC.',
      ] },
    ],
    trim: [],
  },
  eleven: {
    bg: 'blood1', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'pink', b: 'rose', c: 'pink' },
    back: [],
    front: [{ y: 3, rows: [
      '........hhhhhhhh........',
      '......hhhhhhhhhhhh......',
      '.....hhhhhhhhhhhhhh.....',
      '....hhhhihhhhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhhh.hhhhh.hhhhh....',
      '....hh............hh....',
      '....hh............hh....',
      '....hh............hh....',
    ] }],
    trim: [{ y: 18, rows: [
      '.....wwwwdSSSSdwwww.....',
      '...wwwwwwwdSSdwwwwwww...',
      '..wwwwwwwwwddwwwwwwwww..',
    ] }],
  },
  will: {
    bg: 'dusk', shirt: 'plaid',
    pal: { s: 'skin0', d: 'skin1', h: 'soil3', i: 'sand', j: 'soil2', a: 'soil2', b: 'amber', c: 'soil1' },
    back: [],
    front: [{ y: 2, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhhhhhhhhhh.....',
      '....hhhhhhhhihhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
    ] }],
    trim: [],
  },
  joyce: {
    bg: 'shadow', shirt: 'cardigan',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'purple', b: 'cream', c: 'purple' },
    back: [{ y: 1, rows: [
      '.......hhhhhhhhhh.......',
      '....hhhhhhihhhhhhhhh....',
      '...hhhihhhhhhhhihhhhh...',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhihhhhhhhhhhhhhihhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhihhhhhhhhhhhihhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '...hhhhhhhhhhhhhhhhhh...',
      '...hhhhh..........hhhh..',
      '....hhhh..........hhh...',
    ] }],
    front: [{ y: 3, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhjhhhhhhhh.....',
      '....hhihhhhhhhhhhhhh....',
      '....hhhhhhhhhhihhhhh....',
      '....hhhh.hhhhhh.hhhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
    ] }],
    trim: [],
  },
} satisfies Record<Exclude<CharId, 'max' | 'steve' | 'hopper' | 'robin' | 'nancy' | 'erica' | 'billy' | 'eddie'>, PortraitSpec>;

// Max, Steve and Hopper are in portraits_l56.ts. Robin, Nancy and Erica are in portraits_l78.ts. Billy is in portraits_l9.ts.
export const PORTRAITS: Record<CharId, PortraitSpec> = {
  ...BASE_PORTRAITS, max: MAX_PORTRAIT, steve: STEVE_PORTRAIT, hopper: HOPPER_PORTRAIT,
  robin: ROBIN_PORTRAIT, nancy: NANCY_PORTRAIT, erica: ERICA_PORTRAIT, billy: BILLY_PORTRAIT,
  // Eddie borrows Steve's until Art draws his Hellfire Club portrait (docs/level-11.md).
  eddie: STEVE_PORTRAIT,
};
