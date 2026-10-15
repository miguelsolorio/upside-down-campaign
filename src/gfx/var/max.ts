// Four Maxes for the owner to pick from (docs/level-5.md): red hair, a skateboard, headphones, 1984. All on the kid body, in
// the game's CharSpec and PortraitSpec formats, five fill colors a sprite plus the ink outline. Role letters: s skin, e eye,
// h hair, a top, p pants, f shoes, x headphones and deck, y grip tape, g wheels. The board is a trim layer at rest and is
// drawn swung by the 'board' gear in compose.ts.
import { KID } from '../data/kid.ts';
import type { HeroOpt } from './hero_types.ts';

// ---------------------------------------------------------------- 1. Walkman
const WALKMAN: HeroOpt = {
  who: 'max', slug: 'walkman', name: 'Walkman', other: 'happy',
  note: 'Long red hair under big cyan headphones, a teal hoodie, jeans. The board stands in her right hand.',
  rig: {
    body: KID, gear: 'board',
    spec: {
      id: 'max', body: 'kid', torso: 'plain', weapon: 'none',
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
        down: [
          { y: 9, rows: ['....aaaaaaaa....'] },
          { y: 10, rows: ['......x..x......', '......x..x......'] },
          { y: 8, rows: ['.............xx.', '.............xx.', '.............xx.', '.............xx.', '.............xx.', '.............gg.'] },
        ],
        up: [
          { y: 9, rows: ['....aaaaaaaa....'] },
          { y: 8, rows: ['.xx.............', '.xx.............', '.xx.............', '.xx.............', '.xx.............', '.gg.............'] },
        ],
        side: [
          { y: 9, rows: ['....aaaaaaaa....'] },
          { y: 8, rows: ['.........xx.....', '.........xx.....', '.........xx.....', '.........xx.....', '.........xx.....', '.........gg.....'] },
        ],
      },
    },
  },
  portrait: {
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
    trim: [{ y: 17, rows: [
      '.....x............x.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 2. Windbreaker
const WINDBREAKER: HeroOpt = {
  who: 'max', slug: 'windbreaker', name: 'Windbreaker', other: 'determined',
  note: 'A high side ponytail and a rose windbreaker, the headphones round her neck, the board slung on her back.',
  rig: {
    body: KID, gear: 'board',
    spec: {
      id: 'max', body: 'kid', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'orange', a: 'rose', x: 'cyan', y: 'ink', p: 'dusk', q: 'dusk', f: 'ink', g: 'dusk' },
      hair: {
        down: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhhh...',
          '...hhhhhhhhhxhh.',
          '...hhh.hhhhhhhh.',
          '...hh......hhhh.',
          '...h........hhh.',
          '............hh..',
          '............h...',
        ] }],
        up: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '...hhhhhhhhhh...',
          '...hhhhxxhhhh...',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
          '.......hh.......',
          '.......hh.......',
          '.......hh.......',
        ] }],
        side: [{ y: 1, rows: [
          '.....hhhhh......',
          '...hhhhhhhh.....',
          '..hhhhhhhhhh....',
          '.hhhhhhhhh......',
          '.hh.hhhx........',
          '.hh..hh.........',
          '.hh.............',
          '.h..............',
        ] }],
      },
      trim: {
        down: [
          { y: 9, rows: ['....aaaaaaaa....', '.....xx..xx.....', '.....xx..xx.....'] },
          { y: 6, rows: ['..xx............', '..xxx...........', '...xx...........'] },
        ],
        up: [
          { y: 9, rows: ['....aaaaaaaa....', '....aaxxaaaa....', '.....axxaaa.....'] },
          { y: 9, rows: ['....xx..........', '.....xx.........', '......xx........', '.......xx.......', '........gg......'] },
        ],
        side: [
          { y: 9, rows: ['....aaaaaaaa....'] },
          { y: 8, rows: ['....xx..........', '.....xx.........', '......xx........', '.......xx.......'] },
        ],
      },
    },
  },
  portrait: {
    bg: 'teal0', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'orange', i: 'amber', j: 'red', g: 'cyan', G: 'ink', a: 'rose', b: 'pink', c: 'rose' },
    back: [{ y: 2, rows: [
      '..................hhhh..',
      '.................hhhhhh.',
      '.................hhhhhh.',
      '................hhhhhhh.',
      '................hhhhhh..',
      '................hhhhh...',
      '.................hhh....',
      '.................hhh....',
      '..................hh....',
      '..................hh....',
    ] }],
    front: [
      { y: 2, rows: [
        '.......hhhhhhhhhh.......',
        '.....hhhhhihhhhhhhh.....',
        '....hhhhhiiihhhhhhhh....',
        '....hhhhhhhhhhhhggh.....',
        '....hhjhhhhhhhhhhjhh....',
        '....hhh.hhhhhhh.hhhh....',
        '....hh............hh....',
      ] },
    ],
    trim: [{ y: 17, rows: [
      '.......gg......gg.......',
      '......gGgg....ggGg......',
      '......gG........Gg......',
      '.....gG..........Gg.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 3. Hood up
const HOOD: HeroOpt = {
  who: 'max', slug: 'hood-up', name: 'Hood up', other: 'determined',
  note: 'A big purple hoodie with the hood up, a red fringe, small bone headphones over it. The board is under her arm.',
  rig: {
    body: KID, gear: 'board',
    spec: {
      id: 'max', body: 'kid', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'orange', a: 'purple', x: 'bone', y: 'ink', p: 'slate', q: 'slate', f: 'ink', g: 'slate' },
      hair: {
        down: [{ y: 1, rows: [
          '......aaaa......',
          '....aaaaaaaa....',
          '...aaaaaaaaaa...',
          '..xaaahhhhaaax..',
          '..xxaah..haaxx..',
          '..xxa......axx..',
          '...aa......aa...',
          '...aaa....aaa...',
        ] }],
        up: [{ y: 1, rows: [
          '......aaaa......',
          '....aaaaaaaa....',
          '...aaaaaaaaaa...',
          '..xaaaaaaaaaax..',
          '..xxaaaaaaaaxx..',
          '..xxaaaaaaaaxx..',
          '...aaaaaaaaaa...',
          '...aaaaaaaaaa...',
          '....aaaaaaaa....',
        ] }],
        side: [{ y: 1, rows: [
          '.....aaaa.......',
          '...aaaaaaaa.....',
          '..aaaaaaaaaa....',
          '.aaaaaxxaahhh...',
          '.aaaaaxxxa......',
          '.aaaaaxxxa......',
          '.aaaaaaaa.......',
          '..aaaaaa........',
        ] }],
      },
      trim: {
        down: [
          { y: 9, rows: ['...aaaaaaaaaa...', '.....a.aa.a.....'] },
          { y: 11, rows: ['.yxxxx..........', '.gg.............'] },
        ],
        up: [{ y: 9, rows: ['...aaaaaaaaaa...'] }, { y: 11, rows: ['.......xxxxyg...', '.......g........'] }],
        side: [{ y: 9, rows: ['....aaaaaaaa....'] }, { y: 11, rows: ['..........xxxxy.', '..........g..g..'] }],
      },
    },
  },
  portrait: {
    bg: 'dusk', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'orange', i: 'amber', j: 'red', g: 'bone', G: 'grey2', a: 'purple', b: 'magenta', c: 'purple', H: 'purple0' },
    back: [{ y: 1, rows: [
      '........HHHHHHHH........',
      '......HHaaaaaaaaHH......',
      '.....HaaaaaaaaaaaaH.....',
      '....HaaaaaaaaaaaaaaH....',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '...HaaaaaaaaaaaaaaaaH...',
      '....HaaaaaaaaaaaaaaH....',
      '....HHaaaaaaaaaaaaHH....',
    ] }],
    front: [
      { y: 4, rows: [
        '......hhhhhhhhhhhh......',
        '.....hhhhhihhhhhhhh.....',
        '.....hhhh.hh.hhhhhh.....',
        '.....hh..........hh.....',
      ] },
      { y: 8, rows: [
        '..gg................gg..',
        '.gGg................gGg.',
        '.gGg................gGg.',
        '.gGg................gGg.',
        '..gg................gg..',
      ] },
    ],
    trim: [],
  },
};

// ---------------------------------------------------------------- 4. Denim
const DENIM: HeroOpt = {
  who: 'max', slug: 'denim', name: 'Denim', other: 'happy',
  note: 'Short wild red hair and a red headband, a denim jacket over a red tee. Headphones at her neck, the board on its tail beside her.',
  rig: {
    body: KID, gear: 'board',
    spec: {
      id: 'max', body: 'kid', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'orange', a: 'blue', b: 'red', x: 'red', y: 'ink', p: 'dusk', q: 'dusk', f: 'ink', g: 'dusk' },
      hair: {
        down: [{ y: 1, rows: [
          '....h.hhh.h.....',
          '...hhhhhhhhhh...',
          '..hhhhhhhhhhhh..',
          '..hhbbbbbbbbhh..',
          '..hh........hh..',
          '...h........h...',
        ] }],
        up: [{ y: 1, rows: [
          '....h.hhh.h.....',
          '...hhhhhhhhhh...',
          '..hhhhhhhhhhhh..',
          '..hhbbbbbbbbhh..',
          '..hhhhhhhhhhhh..',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
        ] }],
        side: [{ y: 1, rows: [
          '....h.hhh.......',
          '...hhhhhhhh.....',
          '..hhhhhhhhhhh...',
          '..hhhbbbbbbbb...',
          '..hhhhhhh.......',
          '...hhhhh........',
          '....hhh.........',
        ] }],
      },
      trim: {
        down: [
          { y: 9, rows: ['....aaaaaaaa....', '.......bb.......', '.......bb.......'] },
          { y: 8, rows: ['.xx.............', '.xx.............', '.xx.............', '.xx.............', '.xx.............', '.gg.............'] },
        ],
        up: [
          { y: 9, rows: ['....aaaaaaaa....'] },
          { y: 8, rows: ['.............xx.', '.............xx.', '.............xx.', '.............xx.', '.............xx.', '.............gg.'] },
        ],
        side: [
          { y: 9, rows: ['....aaaaaaaa....', '......bbb.......'] },
          { y: 8, rows: ['..xx............', '..xx............', '..xx............', '..xx............', '..xx............', '..gg............'] },
        ],
      },
    },
  },
  portrait: {
    bg: 'shadow', shirt: 'jacket',
    pal: { s: 'skin0', d: 'skin1', h: 'orange', i: 'amber', j: 'red', g: 'red', a: 'blue', b: 'red', c: 'blue' },
    back: [],
    front: [{ y: 2, rows: [
      '.....h.hhhhh.hh.........',
      '....hhhhhihhhhhhh.......',
      '...hhhhhiiihhhhhhhh.....',
      '..hhhhhhhhhhhhhhhhhh....',
      '..hhggggggggggggggghh...',
      '..hhhhhhhhhhhhhhhhhhh...',
      '...hh.hhhh.hhhhh.hhh....',
      '....h..............h....',
    ] }],
    trim: [],
  },
};

export const MAX_OPTS: HeroOpt[] = [WALKMAN, WINDBREAKER, HOOD, DENIM];
