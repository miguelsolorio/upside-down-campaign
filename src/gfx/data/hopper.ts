// Chief Hopper, the owner's pick: Uniform. The police chief in his tan shirt and a flat brim campaign hat, a gold badge and belt
// buckle, brown trousers, on the big body (data/big.ts) with arms two pixels thick. An npc in 2.3 and a hero later, so idle and
// walk matter most. Five fill colors (skin, brown, tan, gold, trousers) and the ink outline. Rows are 16 wide. Roles: h the hat
// and its brim, b the hat band, the badge and the buckle, a the shirt, p trousers.
import type { CharSpec } from './types.ts';

export const HOPPER: CharSpec = {
  id: 'hopper', body: 'big', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'sand', b: 'amber', p: 'soil2', q: 'soil2', f: 'ink' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hbbbbbbh....',
      '.hhhhhhhhhhhhhh.',
      '................',
      '................',
      '.....hhhhhh.....',
    ] }],
    up: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hbbbbbbh....',
      '.hhhhhhhhhhhhhh.',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 1, rows: [
      '....hhhhhh......',
      '....hbbbbhh.....',
      '..hhhhhhhhhhhhh.',
      '...hhh..........',
      '...hh......hhh..',
      '...hh...........',
    ] }],
  },
  trim: {
    down: [{ y: 9, rows: ['.........bb.....', '.........bb.....'] }, { y: 11, rows: ['...hhhhhhhhhh...'] }, { y: 11, rows: ['.......bb.......'] }],
    up: [{ y: 11, rows: ['...hhhhhhhhhh...'] }],
    side: [{ y: 11, rows: ['.....hhhhhhh....'] }, { y: 11, rows: ['..........b.....'] }],
  },
};
