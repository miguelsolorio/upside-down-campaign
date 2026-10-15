// Four Hoppers (docs/level-6.md: an npc in 2.3, his own hero later): the police chief, a hat, a mustache, the big body from
// hopper_body.ts with two pixel arms. Five fill colors a sprite plus the ink outline. Role letters: s skin, e eye, h hat
// and mustache, a shirt or coat, b badge and trim, c second hat color, p pants, f shoes.
import type { HeroOpt } from './hero_types.ts';
import { BIG } from './hopper_body.ts';

const NO_GEAR = { gear: 'none', thick: true } as const;

// ---------------------------------------------------------------- 1. Uniform
const UNIFORM: HeroOpt = {
  who: 'hopper', slug: 'uniform', name: 'Uniform', other: 'determined',
  note: 'The chief in his tan shirt and a flat brim campaign hat, a gold badge and belt buckle, brown trousers.',
  rig: {
    body: BIG, ...NO_GEAR,
    spec: {
      id: 'hopper', body: 'adult', torso: 'plain', weapon: 'none',
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
    },
  },
  portrait: {
    bg: 'shadow', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'sand', b: 'amber', c: 'sand' },
    back: [],
    front: [
      { y: 1, rows: [
        '.........hhhhhh.........',
        '........hhhhhhhh........',
        '.......hbbbbbbbbh.......',
        '......hhhhhhhhhhhh......',
        '..hhhhhhhhhhhhhhhhhhhh..',
        '...hhhhhhhhhhhhhhhhhh...',
      ] },
      { y: 13, rows: [
        '........hhhhhhhh........',
        '........hh....hh........',
      ] },
    ],
    trim: [{ y: 17, rows: [
      '.......hdhSSSSdhdh......',
      '.....hhhhhdSSdhhhhh.....',
      '....hh.hh.dd.hh.bb......',
      '.........hh......bb.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 2. Aloha
const ALOHA: HeroOpt = {
  who: 'hopper', slug: 'aloha', name: 'Aloha', other: 'determined',
  note: 'The off duty chief: a teal aloha shirt with pink flowers, open at the neck, a navy ball cap, jeans.',
  rig: {
    body: BIG, ...NO_GEAR,
    spec: {
      id: 'hopper', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'ink', c: 'dusk', a: 'teal1', b: 'pink', p: 'blue', q: 'blue', f: 'ink' },
      hair: {
        down: [{ y: 1, rows: [
          '.....cccccc.....',
          '....cccccccc....',
          '..cccccccccccc..',
          '................',
          '................',
          '.....hhhhhh.....',
        ] }],
        up: [{ y: 1, rows: [
          '.....cccccc.....',
          '....cccccccc....',
          '...cccccccccc...',
          '....h......h....',
          '....h......h....',
        ] }],
        side: [{ y: 1, rows: [
          '.....cccccc.....',
          '...cccccccccc...',
          '...ccccccccccccc',
          '...h............',
          '...h.......hhh..',
        ] }],
      },
      trim: {
        down: [
          { y: 8, rows: ['....b.ssss.b....', '...b..b.ss.b.b..', '....b...b..b....', '...b..b...b.....'] },
        ],
        up: [{ y: 8, rows: ['....b...b..b....', '...b..b...b.b...', '....b...b..b....', '...b..b...b.....'] }],
        side: [{ y: 8, rows: ['.......ss.......', '......b.s.b.....', '.......b..b.....', '......b..b......'] }],
      },
    },
  },
  portrait: {
    bg: 'teal0', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'teal1', b: 'pink', c: 'dusk', g: 'blue' },
    back: [],
    front: [
      { y: 1, rows: [
        '.......cccccccccc.......',
        '.....cccccccccccccc.....',
        '....cccccccccccccccc....',
        '....cccccccccccccccc....',
        '..cccccccccccccccccccc..',
        '...cccccccccccccccccc...',
      ] },
      { y: 13, rows: [
        '........hhhhhhhh........',
        '........hh....hh........',
      ] },
    ],
    trim: [{ y: 17, rows: [
      '.......bb.dSSSSd.bb.....',
      '.....b...dSSSSd...b.....',
      '...b...b.dSSSd.b....b...',
      '......b...dSd..b..b.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 3. Coat
const COAT: HeroOpt = {
  who: 'hopper', slug: 'coat', name: 'Coat', other: 'determined',
  note: 'November in a tan car coat with a fleece collar, a flat cap, dark jeans. The bulkiest of the four.',
  rig: {
    body: BIG, ...NO_GEAR,
    spec: {
      id: 'hopper', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'soil3', b: 'bone', p: 'dusk', q: 'dusk', f: 'ink' },
      hair: {
        down: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '...hhhhhhhhhh...',
          '..hhhhhhhhhhhh..',
          '................',
          '................',
          '.....hhhhhh.....',
        ] }],
        up: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '...hhhhhhhhhh...',
          '..hhhhhhhhhhhh..',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 1, rows: [
          '....hhhhhh......',
          '...hhhhhhhhh....',
          '...hhhhhhhhhhh..',
          '...hhh..........',
          '...hh......hhh..',
          '...hh...........',
        ] }],
      },
      trim: {
        down: [
          { y: 8, rows: ['..bbbbbbbbbbbb..', '...bb......bb...', '...bb..aa..bb...', '...bb..aa..bb...'] },
          { y: 12, rows: ['...aaaaaaaaaa...'] },
        ],
        up: [{ y: 8, rows: ['..bbbbbbbbbbbb..'] }, { y: 12, rows: ['...aaaaaaaaaa...'] }],
        side: [{ y: 8, rows: ['....bbbbbbbb....'] }, { y: 12, rows: ['.....aaaaaaa....'] }],
      },
    },
  },
  portrait: {
    bg: 'dusk', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'soil3', b: 'bone', c: 'soil3' },
    back: [],
    front: [
      { y: 1, rows: [
        '.......hhhhhhhhhh.......',
        '.....hhhhhhhhhhhhhh.....',
        '....hhhhhhhhhhhhhhhh....',
        '...hhhhhhhhhhhhhhhhhh...',
        '...hhhhhhhhhhhhhhhhhh...',
        '....hhhhhhhhhhhhhhhh....',
      ] },
      { y: 13, rows: [
        '........hhhhhhhh........',
        '........hh....hh........',
      ] },
    ],
    trim: [{ y: 17, rows: [
      '.....bbbbbdSSSSdbbbbb...',
      '...bbbbbbbbdSSdbbbbbbb..',
      '..bbbbbbbbbbddbbbbbbbbb.',
    ] }],
  },
};

// ---------------------------------------------------------------- 4. Flannel
const FLANNEL: HeroOpt = {
  who: 'hopper', slug: 'flannel', name: 'Flannel', other: 'determined',
  note: 'A brown cowboy hat with the brim curled up, a red flannel, blue jeans. The chief on his day off in the woods.',
  rig: {
    body: BIG, ...NO_GEAR,
    spec: {
      id: 'hopper', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', a: 'red', b: 'soil1', p: 'blue', q: 'blue', f: 'ink' },
      hair: {
        down: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhbbbbbbbbhh..',
          '..hhhhhhhhhhhh..',
          '................',
          '................',
          '.....bbbbbb.....',
        ] }],
        up: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhbbbbbbbbhh..',
          '..hhhhhhhhhhhh..',
          '....bbbbbbbb....',
          '....bbbbbbbb....',
          '.....bbbbbb.....',
        ] }],
        side: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhbbbbbbbhhh..',
          '.hhhhhhhhhhhhhh.',
          '...bbb..........',
          '...bb......bbb..',
          '...bb...........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['...b..b..b..b...', '...bbbbbbbbbb...', '...b..b..b..b...', '...b..b..b..b...'] }],
        up: [{ y: 8, rows: ['...b..b..b..b...', '...bbbbbbbbbb...', '...b..b..b..b...', '...b..b..b..b...'] }],
        side: [{ y: 8, rows: ['......b.b.......', '.....bbbbbbb....', '......b.b.b.....', '.....b..b.b.....'] }],
      },
    },
  },
  portrait: {
    bg: 'pine1', shirt: 'plaid',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'red', b: 'soil1', c: 'blood1' },
    back: [],
    front: [
      { y: 0, rows: [
        '........hhhhhhhh........',
        '.......hhhhhhhhhh.......',
        '.....hhjjjjjjjjjjhh.....',
        '....hhhhhhhhhhhhhhhh....',
        '.hhh..hhhhhhhhhhhh..hhh.',
        '..hhhhhhhhhhhhhhhhhhhh..',
        '....hhhhhhhhhhhhhhhh....',
      ] },
      { y: 13, rows: [
        '........jjjjjjjj........',
        '........jj....jj........',
      ] },
    ],
    trim: [],
  },
};

export const HOPPER_OPTS: HeroOpt[] = [UNIFORM, ALOHA, COAT, FLANNEL];
