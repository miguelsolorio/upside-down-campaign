// Per-character art for the kid body: palette, hair, hats and trim. Rows are 16 wide (see kid.ts for role letters).
import type { CharSpec } from './types.ts';

const none = { down: [], up: [], side: [] };

export const MIKE: CharSpec = {
  id: 'mike', body: 'kid', torso: 'stripes', weapon: 'bat',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', i: 'ink', a: 'red', b: 'dusk', p: 'dusk', q: 'dusk', f: 'bone', x: 'bone', y: 'bone', g: 'soil3', G: 'soil3' },
  hair: {
    down: [{ y: 1, rows: [
      '......hhhh......',
      '....hhihhhhh....',
      '...hhhihhhhhh...',
      '...hhh.hhhhhh...',
      '....h......h....',
      '....h......h....',
    ] }],
    up: [{ y: 1, rows: [
      '......hhhh......',
      '....hhhhhhhh....',
      '...hhhhihhhhh...',
      '...hhhhhhhhhh...',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
    ] }],
    side: [{ y: 1, rows: [
      '.....hhhh.......',
      '...hhhhhhhh.....',
      '..hhhhihhhhh....',
      '..hhhhhhhhhhh...',
      '...hhhhh........',
      '...hhhh.........',
      '....hhh.........',
    ] }],
  },
  trim: {
    down: [{ y: 10, rows: ['...........y....', '...........x....', '...........x....'] }],
    up: [{ y: 10, rows: ['....y...........', '....x...........', '....x...........'] }],
    side: [{ y: 10, rows: ['.....y..........', '.....x..........', '.....x..........'] }],
  },
};

export const DUSTIN: CharSpec = {
  id: 'dustin', body: 'kid', torso: 'plain', weapon: 'candy',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil3', i: 'soil3', g: 'leaf', G: 'yellow', H: 'yellow', a: 'blue', b: 'blue', p: 'soil3', q: 'soil3', f: 'bone', x: 'yellow', y: 'soil3' },
  hair: {
    down: [{ y: 1, rows: [
      '.....ggHHgg.....',
      '....gggHHggg....',
      '...hgggHHgggh...',
      '...GGGGGGGGGG...',
      '...hh......hh...',
      '...h........h...',
    ] }],
    up: [{ y: 1, rows: [
      '.....gggggg.....',
      '....gggggggg....',
      '...hggggggggh...',
      '...hggGGGGggh...',
      '...hhhhhhhhhh...',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 1, rows: [
      '.....gggHHg.....',
      '....ggggggHH....',
      '...hggggggHH....',
      '..hhGGGGGGGGGGG.',
      '..hhh...........',
      '..hhh...........',
      '...hh...........',
    ] }],
  },
};

export const LUCAS: CharSpec = {
  id: 'lucas', body: 'kid', torso: 'plain', weapon: 'sling',
  pal: { s: 'skin2', d: 'skin2', e: 'ink', h: 'ink', i: 'ink', g: 'pine2', G: 'soil2', H: 'pine0', a: 'sand', b: 'sand', p: 'soil2', q: 'soil2', f: 'bone', x: 'soil2', y: 'bone' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...ggGGgHHGgg...',
      '...HGggGGgHHg...',
      '................',
      '................',
    ] }],
    up: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...gGHggGHgg....',
      '...HggGHggHG....',
      '....hhhGGhhh....',
      '....hhhHGhhh....',
      '....hhhhhhhh....',
    ] }],
    side: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '..GgGHggGHgg....',
      '.HGgHggGHggH....',
      '..HGhhh.........',
      '...hhhh.........',
      '....hhh.........',
    ] }],
  },
};

export const ELEVEN: CharSpec = {
  id: 'eleven', body: 'kid', torso: 'dress', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', i: 'soil2', a: 'pink', b: 'rose', w: 'white', p: 'skin0', q: 'skin0', f: 'white', r: 'hot' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '...hhh.hhhhh....',
      '....h......h....',
      '....h......h....',
    ] }],
    up: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhihhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hhhhh........',
      '...hhhh.........',
      '....hh..........',
    ] }],
  },
  trim: {
    down: [{ y: 9, rows: [
      '.....awwwwa.....',
      '.......ww.......',
      '....aaaaaaaa....',
      '....bbbbbbbb....',
    ] }],
    up: [{ y: 9, rows: [
      '................',
      '................',
      '....aaaaaaaa....',
      '....bbbbbbbb....',
    ] }],
    side: [{ y: 9, rows: [
      '.......ww.......',
      '................',
      '.....aaaaaa.....',
      '.....bbbbbb.....',
    ] }],
  },
};

export const WILL: CharSpec = {
  id: 'will', body: 'kid', torso: 'plaid', weapon: 'none',
  pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil3', i: 'soil3', a: 'soil2', b: 'amber', c: 'amber', p: 'blue', q: 'blue', f: 'bone', x: 'bone', y: 'bone' },
  hair: {
    down: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhihhh....',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
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
      '.....hhhhhh.....',
    ] }],
    side: [{ y: 1, rows: [
      '.....hhhhhh.....',
      '....hhhhihhh....',
      '..hhhhhhhhhh....',
      '..hhhhhhhhhhhh..',
      '..hhhhhh........',
      '..hhhhh.........',
      '...hhh..........',
    ] }],
  },
  trim: {
    down: [{ y: 10, rows: ['...xx...........', '...xy...........', '...xx...........'] }],
    up: [{ y: 10, rows: ['...xx...........', '...xy...........', '...xx...........'] }],
    side: [{ y: 10, rows: ['.......xx.......', '.......xy.......', '.......xx.......'] }],
  },
};

export const KIDS: CharSpec[] = [MIKE, DUSTIN, LUCAS, ELEVEN, WILL];
export { none as NO_LAYERS };
