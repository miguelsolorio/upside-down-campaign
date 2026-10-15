// Portraits for Max, Steve and Hopper (levels 5 and 6), the owner's picks: Walkman, Letterman and Uniform. The same 24 by 24 format
// and the same head, shoulders and five expressions as data/portraits.ts; each adds hair, hats and trim. Types only come from
// portraits.ts, so this file can sit under it. Roles: s skin, d skin shade, h hair, i hair light, j hair dark, a b c shirt colors,
// g G gear (Max's headphones and their pads, Hopper's hat band).
import type { PortraitSpec } from './portraits.ts';

/** Walkman: long red hair under big cyan headphones, a teal hoodie. Her purple ground is the arcade's. */
export const MAX_PORTRAIT: PortraitSpec = {
  bg: 'purple', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'orange', i: 'amber', j: 'red', g: 'cyan', G: 'ink', a: 'teal1', b: 'cyan', c: 'teal1' },
  back: [{ y: 11, rows: [
    '.hhhh..............hhhh.',
    '.hhhh..............hhhh.',
    '.hhhhh............hhhhh.',
    '..hhhh............hhhh..',
    '..hhhhh..........hhhhh..',
    '..hhhhh..........hhhhh..',
    '..hhhh............hhhh..',
    '...hh..............hh...',
  ] }],
  front: [
    { y: 1, rows: [
      '........xxxxxxxx........',
      '......xxhhhhhhhhxx......',
      '.....xhhhhhhhhhhhhx.....',
      '....xhhhhhihhhhhhhhx....',
      '....xhhhhiiihhhhhhhx....',
      '...xhhhhhhhhhhhhhhhhx...',
      '...xhhh.hhhhhhhh.hhhx...',
    ] },
    { y: 8, rows: [
      '..ggg..............ggg..',
      '..gGg..............gGg..',
      '..gGg..............gGg..',
      '..gGg..............gGg..',
      '..gGg..............gGg..',
      '..ggg..............ggg..',
    ] },
  ],
  trim: [{ y: 17, rows: ['.....x............x.....'] }],
  grin: [{ y: 13, rows: [
    '........eeeeeeee........',
    '........ewweewwe........',
    '.........eeeeee.........',
  ] }],
};

/**
 * Letterman: a navy varsity jacket, bone sleeves and collar, and the hair, which is his signature: a feathered mound that fills
 * the frame from side to side, wider than his shoulders, with the sides swept down over his ears. The forehead stays clear for
 * the brows.
 */
export const STEVE_PORTRAIT: PortraitSpec = {
  bg: 'teal1', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'dusk', b: 'bone', c: 'dusk' },
  back: [],
  front: [{ y: 1, rows: [
    '........hhhhhhhh........',
    '.....hhhhhhhhhhhhhh.....',
    '...hhhhhhhihhhhhhhhhh...',
    '..hhhhhhhiiihhhhhhhhhh..',
    '..hhhhhhhhhhhhhhhhhhhh..',
    '..hhhhh..........hhhhh..',
    '..hhhh............hhhh..',
    '..hhhh............hhhh..',
    '...hhh............hhh...',
    '...hhh............hhh...',
    '....hh............hh....',
    '....h..............h....',
  ] }],
  trim: [{ y: 17, rows: [
    '.......bbbd....dbbb.....',
    '......bbbb......bbbb....',
    '.....bb..............bb.',
  ] }],
};

/** Uniform: the chief in a flat brim campaign hat with a gold band, a tan shirt, a badge and a mustache. */
export const HOPPER_PORTRAIT: PortraitSpec = {
  bg: 'shadow', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'sand', b: 'amber', c: 'sand' },
  back: [],
  front: [
    { y: 1, rows: [
      '.........hhhhhh.........',
      '........hhhhhhhh........',
      '.......hbbbbbbbbh.......',
      '......hhhhhhhhhhhh......',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '...hhhhhhhhhhhhhhhhhh...',
    ] },
    { y: 13, rows: [
      '........hhhhhhhh........',
      '........hh....hh........',
    ] },
  ],
  trim: [{ y: 17, rows: [
    '.......hdhSSSSdhdh......',
    '.....hhhhhdSSdhhhhh.....',
    '....hh.hh.dd.hh.bb......',
    '.........hh......bb.....',
  ] }],
};
