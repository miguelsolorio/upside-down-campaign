// Max, the new girl at the Palace (docs/level-4.md) and a hero from 2.2 on: the owner's pick, Walkman. Long red hair under big cyan
// headphones, a teal hoodie, jeans, and a skateboard. On the kid body, five fill colors (skin, orange, teal, cyan, blue) and the
// ink outline. Rows are 16 wide. Roles: x headphones and deck, y ink (the headphone pads and the grip tape), g wheels. At rest the
// board stands at her side (the carry layer); the composer swings it in her attack and rides it in the Skate dash (actor_gear.ts).
import type { CharSpec } from './types.ts';

export const MAX: CharSpec = {
  id: 'max', body: 'kid', torso: 'plain', weapon: 'board',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'orange', a: 'teal1', x: 'cyan', y: 'ink', p: 'blue', q: 'blue', f: 'ink', g: 'blue' },
  hair: {
    down: [{ y: 1, rows: [
      '....xxxxxxxx....',
      '...xhhhhhhhhx...',
      '...xhhhhhhhhx...',
      '..xxyhhh.hhyxx..',
      '..xxy......yxx..',
      '..xxy......yxx..',
      '...hh......hh...',
      '...hh......hh...',
      '...hh......hh...',
      '...hh......hh...',
    ] }],
    up: [{ y: 1, rows: [
      '....xxxxxxxx....',
      '...xhhhhhhhhx...',
      '...xhhhhhhhhx...',
      '..xxyhhhhhhyxx..',
      '..xxyhhhhhhyxx..',
      '..xxyhhhhhhyxx..',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 1, rows: [
      '......hxhh......',
      '....hhhxhhhh....',
      '...hhhhxhhhhh...',
      '..hhhhxxxhhh....',
      '..hhhhxyx.......',
      '..hhhhxyx.......',
      '..hhhhxxx.......',
      '..hhhhhh........',
      '..hhhhhh........',
      '..hhhhh.........',
    ] }],
  },
  trim: {
    down: [{ y: 9, rows: ['....aaaaaaaa....'] }, { y: 10, rows: ['......x..x......', '......x..x......'] }],
    up: [{ y: 9, rows: ['....aaaaaaaa....'] }],
    side: [{ y: 9, rows: ['....aaaaaaaa....'] }],
  },
  carry: {
    down: [{ y: 8, rows: ['.............xx.', '.............xx.', '.............xx.', '.............xx.', '.............xx.', '.............gg.'] }],
    up: [{ y: 8, rows: ['.xx.............', '.xx.............', '.xx.............', '.xx.............', '.xx.............', '.gg.............'] }],
    side: [{ y: 8, rows: ['.........xx.....', '.........xx.....', '.........xx.....', '.........xx.....', '.........xx.....', '.........gg.....'] }],
  },
};
