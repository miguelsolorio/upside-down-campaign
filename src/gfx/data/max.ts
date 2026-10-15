// Max, the new girl at the Palace (docs/level-4.md): long red hair, a teal sweatshirt, and a skateboard she carries. On the
// kid body. Rows are 16 wide. The board is the trim layer: upright at her side from the front and back, behind her hip from
// the side. Roles: x deck, y grip tape, g wheels.
import type { CharSpec } from './types.ts';

export const MAX: CharSpec = {
  id: 'max', body: 'kid', torso: 'plain', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'orange', i: 'amber', a: 'teal1', b: 'cyan', p: 'dusk', q: 'night', f: 'white', x: 'cyan', y: 'ink', g: 'bone' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhihhhh....',
      '...hhhhhhhhhh...',
      '...hhh.hhhhhh...',
      '...hh......hh...',
      '...hh......hh...',
      '...hh......hh...',
    ] }],
    up: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhihhhhh...',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 1, rows: [
      '.....hhhhh......',
      '...hhhhihhh.....',
      '..hhhhhhhhhh....',
      '..hhhhhhhh......',
      '..hhhhhhh.......',
      '..hhhhh.........',
      '...hhh..........',
    ] }],
  },
  trim: {
    down: [{ y: 9, rows: ['............xx..', '............xy..', '............xy..', '............xy..', '............gg..'] }],
    up: [{ y: 9, rows: ['..xx............', '..yx............', '..yx............', '..yx............', '..gg............'] }],
    side: [{ y: 10, rows: ['..yxxxxxxxxy....', '...g......g.....'] }],
  },
};
