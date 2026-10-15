// Portraits for Robin, Nancy and Erica (levels 7 and 8), the owner's picks: Sailor, Overalls and Boss. The same 24 by 24 format and the
// same head, shoulders and five expressions as data/portraits.ts; each adds hair, hats and trim. Types only come from portraits.ts, so
// this file can sit under it. Roles: s skin, d skin shade, h hair, i hair light, j hair dark, a b c shirt colors, t the tie, w white,
// x the buckles.
import type { PortraitSpec } from './portraits.ts';

/** Sailor: a white dixie cup cap over blond bangs, a navy square collar over a white middy, a pink tie. */
export const ROBIN_PORTRAIT: PortraitSpec = {
  bg: 'teal1', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'yellow', i: 'cream', j: 'amber', a: 'white', b: 'dusk', c: 'white', t: 'pink' },
  back: [],
  front: [{ y: 1, rows: [
    '..........aaaa..........',
    '........aaaaaaaa........',
    '.......aaaaaaaaaa.......',
    '.....aaaaaaaaaaaaaa.....',
    '.....aaaaaaaaaaaaaa.....',
    '....bbbbbbbbbbbbbbbb....',
    '.....hhh..........hhh...',
    '.....hhh..........hhh...',
    '.....hh............hh...',
  ] }],
  trim: [{ y: 17, rows: [
    '.......bbb....bbb.......',
    '......bbbb....bbbb......',
    '.....bbbbb.tt.bbbbb.....',
    '....bbbbb..tt..bbbbb....',
    '...bbbb....tt....bbbb...',
  ] }],
};

/** Overalls: a high ponytail with a rose tie, a rose shirt under denim overalls with steel buckles. */
export const NANCY_PORTRAIT: PortraitSpec = {
  bg: 'purple0', shirt: 'plain',
  pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'rose', b: 'blue', c: 'rose', x: 'grey3' },
  back: [{ y: 2, rows: [
    '..........hhhh..........',
    '.........hhaahh.........',
    '..........hhhh..........',
  ] }],
  front: [{ y: 3, rows: [
    '.......hhhhhhhhhh.......',
    '.....hhhhhhhhhhhhhh.....',
    '....hhhhhhhhhhhhhhhh....',
    '....hhhhhhhhhhhhhhhh....',
    '....hhh..hhhhhhh.hhh....',
    '....hh..............hh..',
  ] }],
  trim: [{ y: 17, rows: [
    '.....b....dSSSSd..b.....',
    '.....bb...dSSSSd.bb.....',
    '.....bbbbbdSSdbbbbb.....',
    '.....bbbxbbddbbxbbb.....',
    '.....bbbbbbbbbbbbbb.....',
  ] }],
};

/** Boss: a high bun with a gold clip on charcoal hair, a pink power suit with shoulder pads over a white shirt. */
export const ERICA_PORTRAIT: PortraitSpec = {
  bg: 'teal0', shirt: 'plain',
  pal: { s: 'skin2', d: 'skin3', h: 'grey1', i: 'grey2', j: 'grey1', a: 'pink', b: 'amber', c: 'pink', w: 'bone' },
  back: [],
  front: [{ y: 0, rows: [
    '..........hhhhhh........',
    '.........hhhhhhhh.......',
    '.........hhbbbbhh.......',
    '.......hhhhhhhhhhhh.....',
    '.....hhhhhhhhhhhhhhhh...',
    '.....hhhhhhhhhhhhhhhh...',
    '....hhhhhhhhhhhhhhhhhh..',
    '.....hhhh........hhh....',
  ] }],
  trim: [{ y: 17, rows: [
    '...aaaaa.dwwwwd.aaaaa...',
    '..aaaaaaadwwwwdaaaaaaaa.',
    '..aaaaaaaadwwdaaaaaaaaa.',
    '..aaaaaaaabddbaaaaaaaaa.',
  ] }],
};
