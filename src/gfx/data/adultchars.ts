// Joyce, on the adult body. Rows are 16 wide.
import type { CharSpec } from './types.ts';

export const JOYCE: CharSpec = {
  id: 'joyce', body: 'adult', torso: 'cardigan', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', i: 'soil1', a: 'purple', b: 'cream', p: 'slate', q: 'slate', f: 'soil1' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '...hhhhhhhhhh...',
      '..hhhihhhhhhhh..',
      '..hhh......hhh..',
      '..hhh......hhh..',
      '..hhh......hhh..',
      '...hh......hh...',
      '...hh......hh...',
    ] }],
    up: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '...hhhhhhhhhh...',
      '..hhhhihhhhhhh..',
      '..hhhhhhhhhhhh..',
      '..hhhhhhhhhhhh..',
      '..hhhhhhhhhhhh..',
      '..hhhhhhhhhhhh..',
      '...hhhhhhhhhh...',
    ] }],
    side: [{ y: 1, rows: [
      '.....hhhhh......',
      '...hhhhhhhhh....',
      '..hhhhihhhhhh...',
      '..hhhhhh........',
      '..hhhhhh........',
      '..hhhhh.........',
      '..hhhh..........',
      '...hhh..........',
    ] }],
  },
};

export const ADULTS: CharSpec[] = [JOYCE];
