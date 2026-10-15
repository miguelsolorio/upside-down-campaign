// Steve Harrington, the owner's pick: Letterman. A navy varsity jacket with bone sleeves and a collar, slate trousers, a nail bat,
// and the hair, which is his signature: a tall feathered mound that is wider than his shoulders. On the adult body, five fill
// colors (skin, brown, navy, bone, slate) and the ink outline. Rows are 16 wide. Roles: h hair, a jacket, b sleeves and collar,
// p trousers, g and G the bat's handle and barrel, n its nails (the composer swings it: actor_gear.ts).
import type { CharSpec } from './types.ts';

export const STEVE: CharSpec = {
  id: 'steve', body: 'adult', torso: 'plain', weapon: 'nailbat', sleeve: 'b',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'dusk', b: 'bone', p: 'slate', q: 'slate', f: 'ink', g: 'soil1', G: 'bone', n: 'slate' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '..hhhhhhhhhhhh..',
      '.hhhhhhhhhhhhhh.',
      '.hhhhh....hhhhh.',
      '.hhhh......hhhh.',
      '..hhh......hhh..',
      '...hh......hh...',
    ] }],
    up: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '..hhhhhhhhhhhh..',
      '.hhhhhhhhhhhhhh.',
      '.hhhhhhhhhhhhhh.',
      '.hhhhhhhhhhhhhh.',
      '.hhhhhhhhhhhhhh.',
      '..hhhhhhhhhhhh..',
      '...hhhhhhhhhh...',
      '....hhhhhhhh....',
    ] }],
    side: [{ y: 1, rows: [
      '....hhhhhhhh....',
      '..hhhhhhhhhhhh..',
      '.hhhhhhhhhhhhhh.',
      '.hhhhhhhhh......',
      '.hhhhhhhh.......',
      '..hhhhhh........',
      '...hhhh.........',
    ] }],
  },
  trim: {
    down: [{ y: 8, rows: ['.....bbbbbb.....', '......bb........', '......bb........'] }, { y: 11, rows: ['.....bbbbbb.....'] }],
    up: [{ y: 8, rows: ['.....bbbbbb.....'] }, { y: 11, rows: ['.....bbbbbb.....'] }],
    side: [{ y: 8, rows: ['......bbbb......'] }, { y: 11, rows: ['......bbbb......'] }],
  },
};
