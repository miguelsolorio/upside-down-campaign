// Four Robins (docs/level-7.md): the Scoops Ahoy sailor uniform, short blond hair, an ice cream scoop. A teen, so the adult body,
// in the game's CharSpec and PortraitSpec formats, five fill colors a sprite plus the ink outline. What she holds is a stamp on
// her near hand, and the arm carries it out and up (compose3.ts). Role letters, per design: s skin, e eye, h hair, a top, b or r
// or y trim, p pants, f shoes, and the scoop's own letters.
import { ADULT } from '../data/adult.ts';
import type { Pt } from './compose3.ts';
import type { Rig3, Stamp } from './compose3.ts';
import type { Hero3Opt } from './heroes3_types.ts';

/** The near hand raised out to the side, holding the scoop up beside her head. Front and back, then in profile. */
const RAISED: NonNullable<Rig3['near']> = {
  down: { rest: [13, 8], swingA: [13, 9], swingB: [13, 7] },
  up: { rest: [13, 8], swingA: [13, 9], swingB: [13, 7] },
  side: { rest: [13, 9], swingA: [13, 10], swingB: [13, 8] },
};
const at = (s: Omit<Stamp, 'ox' | 'oy'>, ox: number, oy: number): Stamp => ({ ...s, ox, oy });
const same = (st: Stamp[]): NonNullable<Rig3['held']> => ({ down: st, up: st, side: st });
export type { Pt };

// ---------------------------------------------------------------- 1. Sailor
// White dixie cup cap, a navy square collar over a white middy, a pink tie. The scoop is a pink ball on a wafer cone.
const SAILOR: Hero3Opt = {
  who: 'robin', slug: 'sailor', name: 'Sailor', other: 'happy',
  note: 'The uniform as Scoops Ahoy sells it: a white dixie cup cap, a navy square collar, a pink tie, navy slacks. A pink scoop on a wafer cone.',
  rig: {
    body: ADULT, near: RAISED,
    spec: {
      id: 'robin', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'yellow', a: 'white', b: 'dusk', t: 'pink', p: 'dusk', q: 'dusk', f: 'ink' },
      hair: {
        down: [{ y: 0, rows: [
          '......aaaa......',
          '....aaaaaaaa....',
          '...aaaaaaaaaa...',
          '...bbbbbbbbbb...',
          '...hh......hh...',
          '....h......h....',
        ] }],
        up: [{ y: 0, rows: [
          '......aaaa......',
          '....aaaaaaaa....',
          '...aaaaaaaaaa...',
          '...bbbbbbbbbb...',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
        ] }],
        side: [{ y: 0, rows: [
          '.....aaaa.......',
          '...aaaaaaaa.....',
          '..aaaaaaaaaa....',
          '..bbbbbbbbbbbb..',
          '...hhhh.........',
          '...hhh..........',
          '....hh..........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.....bbssbb.....', '.....abttba.....', '.......tt.......'] }],
        up: [{ y: 8, rows: ['.....bbbbbb.....', '.....bbbbbb.....', '......bbbb......'] }],
        side: [{ y: 8, rows: ['......bbbb......', '.......bbt......', '........t.......'] }],
      },
    },
    held: same([at({ rows: ['.t.', 'ttt', 'ttt', 'hhh', '.h.'] }, -1, -5)]),
  },
  portrait: {
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
  },
};

// ---------------------------------------------------------------- 2. Breton
// No cap: a spiky blond crop, a navy and white striped shirt, a red neckerchief. The scoop is a steel scooper with a vanilla ball.
const BRETON: Hero3Opt = {
  who: 'robin', slug: 'breton', name: 'Breton', other: 'determined',
  note: 'The striped sailor shirt with a red neckerchief and a spiky blond crop, no cap. She carries the steel scooper, a round of vanilla in the bowl.',
  rig: {
    body: ADULT, near: RAISED,
    spec: {
      id: 'robin', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'yellow', a: 'white', b: 'dusk', r: 'red', p: 'dusk', q: 'dusk', f: 'ink', g: 'dusk', n: 'white' },
      hair: {
        down: [{ y: 0, rows: [
          '....h..hh..h....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhh......',
        ] }],
        up: [{ y: 0, rows: [
          '....h..hh..h....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 0, rows: [
          '.....h.hh.h.....',
          '....hhhhhhhh....',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhh.........',
          '...hhh..........',
          '....h...........',
        ] }],
      },
      trim: {
        down: [{ y: 9, rows: ['.....bbbbbb.....', '................', '.....bbbbbb.....'] }, { y: 8, rows: ['.....rrrrrr.....', '.......rr.......'] }],
        up: [{ y: 9, rows: ['.....bbbbbb.....', '................', '.....bbbbbb.....'] }, { y: 8, rows: ['.....rrrrrr.....'] }],
        side: [{ y: 9, rows: ['......bbbb......', '................', '......bbbb......'] }, { y: 8, rows: ['.....rrrrr......'] }],
      },
    },
    held: same([at({ rows: ['.nn.', 'nnnn', 'nnnn', '.gg.', '..g.', '..g.'] }, -1, -6)]),
  },
  portrait: {
    bg: 'purple0', shirt: 'stripes',
    pal: { s: 'skin0', d: 'skin1', h: 'yellow', i: 'cream', j: 'amber', a: 'white', b: 'dusk', c: 'white', r: 'red' },
    back: [],
    front: [{ y: 0, rows: [
      '........h..hh..h........',
      '.......hhhhhhhhhh.......',
      '......hhhhhhhhhhhh......',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhh..........',
      '.....hh..hh.............',
    ] }],
    trim: [{ y: 17, rows: [
      '.......rrrdSSSSdrrr.....',
      '.......rrrrrrrrrr.......',
      '........rrrrrrrr........',
      '.........rrrrrr.........',
    ] }],
  },
};

// ---------------------------------------------------------------- 3. Soda
// The soda jerk: a tall paper hat with a red band, a red bow tie, a candy striped apron over a white tee. The scoop is a red one in a cup.
const SODA: Hero3Opt = {
  who: 'robin', slug: 'soda', name: 'Soda', other: 'happy',
  note: 'The fountain look: a tall paper hat with a red band, a bow tie, a candy striped apron. A red scoop in a paper cup.',
  rig: {
    body: ADULT, near: RAISED,
    spec: {
      id: 'robin', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'yellow', a: 'white', r: 'red', p: 'dusk', q: 'dusk', f: 'ink' },
      hair: {
        down: [{ y: 0, rows: [
          '.......aa.......',
          '......aaaa......',
          '.....aaaaaa.....',
          '....rrrrrrrr....',
          '....h......h....',
        ] }],
        up: [{ y: 0, rows: [
          '.......aa.......',
          '......aaaa......',
          '.....aaaaaa.....',
          '....rrrrrrrr....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 0, rows: [
          '....a......a....',
          '...aaaaaaaaaa...',
          '...aaaaaaaaaaa..',
          '...rrrrrrrrrrr..',
          '...hhhh.........',
          '...hhh..........',
          '....hh..........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['......rrrr......', '......rara......', '......rara......', '......rara......'] }],
        up: [{ y: 9, rows: ['......r..r......', '......rrrr......'] }],
        side: [{ y: 8, rows: ['........r.......', '.......rar......', '.......rar......', '.......rar......'] }],
      },
    },
    held: same([at({ rows: ['.rr.', 'rrrr', 'aaaa', 'arra', '.aa.'] }, -1, -5)]),
  },
  portrait: {
    bg: 'dusk', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'yellow', i: 'cream', j: 'amber', a: 'white', r: 'red', c: 'white' },
    back: [],
    front: [{ y: 0, rows: [
      '..........aaaa..........',
      '.........aaaaaa.........',
      '........aaaaaaaa........',
      '.......aaaaaaaaaa.......',
      '......aaaaaaaaaaaa......',
      '.....rrrrrrrrrrrrrr.....',
      '.....hhh..........hhh...',
      '.....hhh..........hhh...',
      '.....hh............hh...',
    ] }],
    trim: [{ y: 17, rows: [
      '..........rrrrrr........',
      '.....AAAArrrrrrrAAAA....',
      '.....rarara....rarara...',
      '....rarararararararara..',
    ] }],
  },
};

// ---------------------------------------------------------------- 4. Admiral
// The officer's version: a white peaked cap, a navy double breasted jacket with gold buttons and epaulettes, white slacks. A pink scoop on a gold stem.
const ADMIRAL: Hero3Opt = {
  who: 'robin', slug: 'admiral', name: 'Admiral', other: 'determined',
  note: 'Scoops Ahoy with rank: a white peaked cap, a navy double breasted jacket, gold buttons and epaulettes, white slacks. A pink scoop on a gold stem.',
  rig: {
    body: ADULT, near: RAISED,
    spec: {
      id: 'robin', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'amber', a: 'dusk', w: 'white', y: 'amber', p: 'white', q: 'white', f: 'ink', x: 'pink' },
      hair: {
        down: [{ y: 0, rows: [
          '....wwwwwwww....',
          '...wwwwwwwwww...',
          '...wwwwwwwwww...',
          '...aaaayyaaaa...',
          '...hh......hh...',
        ] }],
        up: [{ y: 0, rows: [
          '....wwwwwwww....',
          '...wwwwwwwwww...',
          '...wwwwwwwwww...',
          '...aaaaaaaaaa...',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
        ] }],
        side: [{ y: 0, rows: [
          '....wwwwwww.....',
          '...wwwwwwwww....',
          '..wwwwwwwwwww...',
          '..aaaaaaaaaaaaa.',
          '...hhhh.........',
          '...hhh..........',
          '....hh..........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['....yaawwaay....', '.....ayaaya.....', '.....ayaaya.....', '.....ayaaya.....'] }],
        up: [{ y: 8, rows: ['....yaaaaaay....'] }],
        side: [{ y: 8, rows: ['......aaaa......', '.......ayw......', '.......ay.......'] }],
      },
    },
    held: same([at({ rows: ['.x.', 'xxx', '.y.', '.y.', '.y.'] }, -1, -5)]),
  },
  portrait: {
    bg: 'teal0', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'amber', i: 'yellow', j: 'amber', a: 'dusk', b: 'dusk', c: 'dusk', w: 'white', y: 'amber' },
    back: [],
    front: [{ y: 1, rows: [
      '.......wwwwwwwwwwww.....',
      '.....wwwwwwwwwwwwwwww...',
      '....wwwwwwwwyywwwwwww...',
      '....wwwwwwwyyyywwwwww...',
      '....aaaaaaaaaaaaaaaaa...',
      '.....hhh..........hhh...',
      '.....hhh..........hhh...',
      '.....hh............hh...',
    ] }],
    trim: [{ y: 17, rows: [
      '...yy......ww......yy...',
      '...yy...AAAwwAAA...yy...',
      '.......AAywwwwyAA.......',
      '........Ay.ww.yA........',
    ] }],
  },
};

export const ROBIN_OPTS: Hero3Opt[] = [SAILOR, BRETON, SODA, ADMIRAL];
