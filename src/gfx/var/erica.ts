// Four Ericas (docs/level-7.md): Lucas's little sister, small, bossy, her own bright look. On the kid body, in the game's CharSpec
// and PortraitSpec formats, five fill colors a sprite plus the ink outline. Her hair is charcoal, not ink, so it still shows as a shape on a dark floor.
// Role letters, per design: s skin, e eye, h hair, a top, b or w or x trim, p pants, f shoes.
import { KID } from '../data/kid.ts';
import type { Hero3Opt } from './heroes3_types.ts';

// ---------------------------------------------------------------- 1. Puffs
// Two big round hair puffs tied with cyan ribbons, a yellow tee with a pink star, hot pink leggings, cyan sneakers.
const PUFFS: Hero3Opt = {
  who: 'erica', slug: 'puffs', name: 'Puffs', other: 'happy',
  note: 'Two big round hair puffs tied with cyan ribbons, a yellow tee with a pink star, hot pink leggings, cyan sneakers.',
  rig: {
    body: KID,
    spec: {
      id: 'erica', body: 'kid', torso: 'plain', weapon: 'none',
      pal: { s: 'skin2', d: 'skin2', e: 'ink', h: 'grey1', a: 'yellow', b: 'pink', p: 'pink', q: 'pink', f: 'cyan', x: 'cyan' },
      hair: {
        down: [{ y: 0, rows: [
          '.hhhh......hhhh.',
          '.hhhhh....hhhhh.',
          '.hxhhhhhhhhhhxh.',
          '..hhhhhhhhhhhh..',
          '...hh......hh...',
        ] }],
        up: [{ y: 0, rows: [
          '.hhhh......hhhh.',
          '.hhhhh....hhhhh.',
          '.hxhhhhhhhhhhxh.',
          '..hhhhhhhhhhhh..',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 0, rows: [
          '..hhhh.hhhh.....',
          '.hhhhhhhhhhh....',
          '.hhhxhhhxhhh....',
          '..hhhhhhhhhhh...',
          '..hhhhhhh.......',
          '..hhhhhh........',
          '...hhhh.........',
        ] }],
      },
      trim: {
        down: [{ y: 9, rows: ['.......b........', '......bbb.......', '.......b........'] }],
        up: [],
        side: [{ y: 9, rows: ['.......b........', '......bbb.......', '.......b........'] }],
      },
    },
  },
  portrait: {
    bg: 'teal1', shirt: 'plain',
    pal: { s: 'skin2', d: 'skin3', h: 'grey1', i: 'grey2', j: 'grey1', a: 'yellow', b: 'pink', c: 'yellow', x: 'cyan' },
    back: [],
    front: [{ y: 0, rows: [
      '..hhhhhh........hhhhhh..',
      '.hhhhhhhh......hhhhhhhh.',
      '.hxhhhhhhhhhhhhhhhhhhxh.',
      '.hhhhhhhhhhhhhhhhhhhhhh.',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '...hhhhhhhhhhhhhhhhhh...',
      '....hhhhhhhhhhhhhhhh....',
      '.....hhh........hhh.....',
    ] }],
    trim: [{ y: 17, rows: [
      '.........dSSSSd.........',
      '.........dSSSSd.........',
      '.........bbbbbb.........',
      '........bbbbbbbb........',
      '.........bbbbbb.........',
    ] }],
  },
};

// ---------------------------------------------------------------- 2. Boss
// A high bun, a pink power suit with shoulder pads and gold buttons, a clipboard she means to use.
const BOSS: Hero3Opt = {
  who: 'erica', slug: 'boss', name: 'Boss', other: 'determined',
  note: 'A high bun with a gold clip, a pink power suit with shoulder pads and gold buttons, a white shirt, a clipboard she means to use.',
  rig: {
    body: KID,
    near: { down: { rest: [12, 10], swingA: [12, 11], swingB: [12, 9] }, up: { rest: [12, 10], swingA: [12, 11], swingB: [12, 9] }, side: { rest: [12, 10], swingA: [12, 11], swingB: [12, 9] } },
    held: {
      down: [{ ox: 0, oy: -5, rows: ['.bb.', 'wwww', 'wwww', 'wwww', 'wwww'] }],
      up: [{ ox: 0, oy: -5, rows: ['.bb.', 'wwww', 'wwww', 'wwww', 'wwww'] }],
      side: [{ ox: 0, oy: -5, rows: ['.bb.', 'wwww', 'wwww', 'wwww', 'wwww'] }],
    },
    spec: {
      id: 'erica', body: 'kid', torso: 'plain', weapon: 'none',
      pal: { s: 'skin2', d: 'skin2', e: 'ink', h: 'grey1', a: 'pink', b: 'amber', w: 'bone', p: 'pink', q: 'pink', f: 'bone' },
      hair: {
        down: [{ y: 0, rows: [
          '......hhhh......',
          '.....hhhhhh.....',
          '.....hbbbbh.....',
          '....hhhhhhhh....',
          '....hh....hh....',
        ] }],
        up: [{ y: 0, rows: [
          '......hhhh......',
          '.....hhhhhh.....',
          '.....hbbbbh.....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 0, rows: [
          '....hhhh........',
          '...hhhhhh.......',
          '...hbbbbh.......',
          '...hhhhhhhh.....',
          '..hhhhhhhhhh....',
          '..hhhhhhh.......',
          '...hhhhh........',
        ] }],
      },
      trim: {
        down: [{ y: 9, rows: ['...aaaaaaaaaa...', '.......ww.......', '.......bb.......'] }],
        up: [{ y: 9, rows: ['...aaaaaaaaaa...'] }],
        side: [{ y: 9, rows: ['.....aaaaaa.....', '.........w......', '.........b......'] }],
      },
    },
  },
  portrait: {
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
  },
};

// ---------------------------------------------------------------- 3. Shades
// A huge round afro and round cyan shades, an orange tracksuit jacket zipped to the chin, yellow track pants, cyan sneakers.
const SHADES: Hero3Opt = {
  who: 'erica', slug: 'shades', name: 'Shades', other: 'happy',
  note: 'A huge round afro, round cyan shades, an orange tracksuit jacket zipped to the chin, yellow track pants, cyan sneakers.',
  rig: {
    body: KID,
    spec: {
      id: 'erica', body: 'kid', torso: 'plain', weapon: 'none',
      pal: { s: 'skin2', d: 'skin2', e: 'ink', h: 'grey1', a: 'orange', b: 'yellow', p: 'yellow', q: 'yellow', f: 'cyan', x: 'cyan' },
      hair: {
        down: [{ y: 0, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '.hhhhhhhhhhhhhh.',
          '.hhhhhhhhhhhhhh.',
          '.hhhh......hhhh.',
          '.hhhh.eeee.hhhh.',
          '..hhh.exxe.hhh..',
          '...hh.....hhh...',
        ] }],
        up: [{ y: 0, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '.hhhhhhhhhhhhhh.',
          '.hhhhhhhhhhhhhh.',
          '.hhhhhhhhhhhhhh.',
          '.hhhhhhhhhhhhhh.',
          '..hhhhhhhhhhhh..',
          '...hhhhhhhhhh...',
        ] }],
        side: [{ y: 0, rows: [
          '....hhhhhhh.....',
          '..hhhhhhhhhhh...',
          '.hhhhhhhhhhhhh..',
          '.hhhhhhhhhhhhh..',
          '.hhhhhhhh.......',
          '.hhhhhhhheexx...',
          '..hhhhhh........',
        ] }],
      },
      trim: {
        down: [{ y: 9, rows: ['.....bbbbbb.....', '.......b........', '.......b........'] }],
        up: [{ y: 9, rows: ['.....bbbbbb.....'] }],
        side: [{ y: 9, rows: ['......bbbb......', '.........b......', '.........b......'] }],
      },
    },
  },
  portrait: {
    bg: 'purple', shirt: 'plain',
    pal: { s: 'skin2', d: 'skin3', h: 'grey1', i: 'grey2', j: 'grey1', a: 'orange', b: 'yellow', c: 'orange', x: 'cyan' },
    back: [],
    front: [
      { y: 0, rows: [
        '.......hhhhhhhhhh.......',
        '....hhhhhhhhhhhhhhhh....',
        '...hhhhhhhhhhhhhhhhhh...',
        '..hhhhhhhhhhhhhhhhhhhh..',
        '..hhhhhhhhhhhhhhhhhhhh..',
        '..hhhhhhhhhhhhhhhhhhhh..',
        '..hhhhhhhhhhhhhhhhhhhh..',
        '..hhhhh..........hhhhh..',
        '..hhhh............hhhh..',
        '..hhhh............hhhh..',
      ] },
      { y: 9, rows: [
        '.......eeeeeeeeee.......',
        '.......exxxeexxxe.......',
        '........eee..eee........',
      ] },
    ],
    trim: [{ y: 17, rows: [
      '.....bbbbdSSSSdbbbb.....',
      '....bbbbbbdSSdbbbbbb....',
      '...aaaaaaabbbbaaaaaaa...',
    ] }],
  },
};

// ---------------------------------------------------------------- 4. Braids
// Long braids with cream beads under a cream headband, a magenta dress with a cream collar, bare legs, cyan high tops.
const BRAIDS: Hero3Opt = {
  who: 'erica', slug: 'braids', name: 'Braids', other: 'determined',
  note: 'Long braids tipped with cream beads, a cream headband, a magenta dress with a cream collar, bare legs, cyan high tops.',
  rig: {
    body: KID,
    spec: {
      id: 'erica', body: 'kid', torso: 'dress', weapon: 'none',
      pal: { s: 'skin2', d: 'skin2', e: 'ink', h: 'grey1', a: 'magenta', b: 'cream', p: 'skin2', q: 'skin2', f: 'cyan', x: 'cream' },
      hair: {
        down: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '....bbbbbbbb....',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
          '...xx......xx...',
          '...hh......hh...',
          '...hh......hh...',
          '...xx......xx...',
          '...hh......hh...',
          '...xx......xx...',
        ] }],
        up: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '....bbbbbbbb....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '...hhxx..xxhh...',
          '...hh......hh...',
          '...hh......hh...',
          '...xx......xx...',
          '...hh......hh...',
          '...xx......xx...',
        ] }],
        side: [{ y: 1, rows: [
          '.....hhhhh......',
          '...hhhhhhhh.....',
          '...bbbbbbbbb....',
          '..hhhhhhh.......',
          '..hhhhhhh.......',
          '..hhhhh.........',
          '..xxx...........',
          '..hhh...........',
          '..hhh...........',
          '..xxx...........',
          '..hhh...........',
          '..xxx...........',
        ] }],
      },
      trim: {
        down: [{ y: 9, rows: ['......bbbb......', '................', '....aaaaaaaa....'] }],
        up: [{ y: 11, rows: ['....aaaaaaaa....'] }],
        side: [{ y: 9, rows: ['.......bb.......', '................', '.....aaaaaa.....'] }],
      },
    },
  },
  portrait: {
    bg: 'blue', shirt: 'plain',
    pal: { s: 'skin2', d: 'skin3', h: 'grey1', i: 'grey2', j: 'grey1', a: 'magenta', b: 'cream', c: 'magenta', x: 'cream' },
    back: [{ y: 9, rows: [
      '...hh..............hh...',
      '...hhh............hhh...',
      '...hhh............hhh...',
      '...hhh............hhh...',
      '...hhh............hhh...',
      '...xxx............xxx...',
    ] }],
    front: [{ y: 2, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhhhhhhhhhh.....',
      '....hhhhhhhhhhhhhhhh....',
      '....bbbbbbbbbbbbbbbb....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhh..........hhh....',
    ] }],
    trim: [{ y: 17, rows: [
      '.........dSSSSd.........',
      '.....bbbbbbbbbbbbbb.....',
      '...bbbbbbbbbbbbbbbbbb...',
    ] }],
  },
};

export const ERICA_OPTS: Hero3Opt[] = [PUFFS, BOSS, SHADES, BRAIDS];
