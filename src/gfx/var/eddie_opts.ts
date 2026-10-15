// Five Eddies (chapter 4, docs/chapter-4.md): the long dark curls are the constant, the clothes and the Flying V change. On the
// adult body, so he stands with Steve. Five fill colors a sprite plus the ink outline. Roles: s skin, e eye, h hair, a the tee,
// b the outer layer (vest, jacket, cloak) or the raglan sleeves, c a patch, logo or clasp, p jeans, f boots, g the guitar's
// body, G its neck. Portraits share the curls (front and back layers) and add the clothes as trim. See eddie_kit.ts.
import type { Part } from '../data/types.ts';
import type { EddieOpt } from './eddie_kit.ts';

// ---------------------------------------------------------------- the curls, shared
const HAIR = {
  down: [{ y: 0, rows: [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '..hhh......hhh..',
    '..hhh......hhh..',
    '..hhh......hhh..',
    '.hhhh......hhhh.',
    '..hhh......hhh..',
    '..hhh......hhh..',
    '...h........h...',
  ] }],
  up: [{ y: 0, rows: [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '.hhhhhhhhhhhhhh.',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '...hh.hhhh.hh...',
  ] }],
  side: [{ y: 0, rows: [
    '....hhhhhh......',
    '...hhhhhhhhh....',
    '..hhhhhhhhhhh...',
    '..hhhhhhhhhh....',
    '..hhhhh.........',
    '.hhhhh..........',
    '..hhhh..........',
    '.hhhhh..........',
    '..hhhh..........',
    '..hhh...........',
    '...h............',
  ] }],
};

/** Curl highlights and shadows on every hair pixel of a portrait layer, from a 4 by 4 stamp that shifts every four rows. */
const CURL = ['hhih', 'hihj', 'hjhh', 'hhhh'];
function curly(y: number, rows: string[]): Part {
  return { y, rows: rows.map((r, j) => [...r].map((ch, x) => (ch === 'h' ? (CURL[(y + j) & 3] as string)[(x + ((y + j) >> 2) * 2) & 3] as string : ch)).join('')) };
}

const FRONT: Part = curly(0, [
  '........hhhhhhhh........',
  '......hhhhhhhhhhhh......',
  '....hhhhhhhhhhhhhhhh....',
  '...hhhhhhhhhhhhhhhhhh...',
  '..hhhhhhhhhhhhhhhhhhhh..',
  '..hhhhhhhhhhhhhhhhhhhh..',
  '.hhhhhhh.hhhhhh.hhhhhhh.',
  '.hhhhh...h....h...hhhhh.',
  '.hhhh..............hhhh.',
  'hhhhh..............hhhhh',
  '.hhhh..............hhhh.',
]);
const BACK: Part = curly(11, [
  'hhhhh..............hhhhh',
  '.hhhhh............hhhhh.',
  'hhhhhh............hhhhhh',
  '.hhhhhh..........hhhhhh.',
  'hhhhhhh..........hhhhhhh',
  '.hhhhhh..........hhhhhh.',
  'hhhhhh............hhhhhh',
  '.hhhhh............hhhhh.',
  '..hhhh............hhhh..',
  '..hhh..............hhh..',
  '...h................h...',
]);
/** A wide grin with the tongue out. */
const GRIN: Part[] = [{ y: 13, rows: [
  '........eeeeeeee........',
  '........ewwwwwwe........',
  '.........emmrre.........',
  '...........eee..........',
] }];
const PORTRAIT_PAL = { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0' } as const;
const SPRITE_PAL = { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', f: 'ink' } as const;

// ---------------------------------------------------------------- 1. Hellfire Club
const HELLFIRE: EddieOpt = {
  slug: 'hellfire', name: 'Hellfire Club', other: 'happy', sleeve: 'b',
  note: 'The club\'s raglan tee: white body, black sleeves, the red demon on the chest. Black jeans and a red Flying V. Nothing over it, so the shirt does the talking.',
  spec: {
    id: 'eddie', body: 'adult', torso: 'plain', weapon: 'none', hair: HAIR,
    pal: { ...SPRITE_PAL, a: 'bone', b: 'grey1', c: 'red', p: 'grey1', q: 'grey1', g: 'red', G: 'grey1' },
    trim: {
      down: [{ y: 8, rows: ['.......bb.......', '.......cc.......', '......cccc......'] }],
      up: [{ y: 8, rows: ['......bbbb......'] }],
      side: [{ y: 8, rows: ['.........b......', '........cc......'] }],
    },
  },
  portrait: {
    bg: 'blood1', shirt: 'plain', pal: { ...PORTRAIT_PAL, a: 'bone', b: 'grey1', c: 'red' }, back: [BACK], front: [FRONT], grin: GRIN,
    trim: [{ y: 18, rows: [
      '.....bbb........bbb.....',
      '...bbbbb........bbbbb...',
      '..bbbbbb...cc...bbbbbb..',
      '..bbbbb...cccc...bbbbb..',
      '..bbbb...cc..cc...bbbb..',
      '..bbb.....cccc.....bbb..',
    ] }],
  },
};

// ---------------------------------------------------------------- 2. Battle vest
const BATTLE: EddieOpt = {
  slug: 'battle', name: 'Battle vest', other: 'happy', sleeve: 's',
  note: 'A black tee under a sleeveless denim vest covered in band patches, bare arms, a big patch across the back. Grey jeans and a white Flying V.',
  spec: {
    id: 'eddie', body: 'adult', torso: 'plain', weapon: 'none', hair: HAIR,
    pal: { ...SPRITE_PAL, a: 'grey1', b: 'slate', c: 'bone', p: 'slate', q: 'slate', g: 'bone', G: 'grey1' },
    trim: {
      down: [{ y: 8, rows: ['.....bb..bb.....', '.....cb..bc.....', '.....bb..bb.....', '.....bb..bb.....'] }],
      up: [{ y: 8, rows: ['.....bbbbbb.....', '.....bccccb.....', '.....bccccb.....', '.....bbbbbb.....'] }],
      side: [{ y: 8, rows: ['......bbb.......', '......bcb.......', '......bbb.......', '......bbb.......'] }],
    },
  },
  portrait: {
    bg: 'shadow', shirt: 'plain', pal: { ...PORTRAIT_PAL, a: 'grey1', b: 'slate', c: 'bone' }, back: [BACK], front: [FRONT], grin: GRIN,
    trim: [{ y: 18, rows: [
      '.....bbbb......bbbb.....',
      '...bbbbbb......bbbbbb...',
      '..bbbbbbb......bbbbbbb..',
      '..bbbcccb......bcccbbb..',
      '..bbbcccb......bcccbbb..',
      '..bbbbbbb......bbbbbbb..',
    ] }],
  },
};

// ---------------------------------------------------------------- 3. Leather
const LEATHER: EddieOpt = {
  slug: 'leather', name: 'Leather', other: 'happy', sleeve: 'b',
  note: 'A black leather jacket hanging open over a red tee, black jeans and a white Flying V. The darkest of the five, so the red tee and the guitar pop.',
  spec: {
    id: 'eddie', body: 'adult', torso: 'plain', weapon: 'none', hair: HAIR,
    pal: { ...SPRITE_PAL, a: 'red', b: 'grey1', p: 'grey1', q: 'grey1', g: 'bone', G: 'grey1' },
    trim: {
      down: [{ y: 8, rows: ['....bbb..bbb....', '.....bb..bb.....', '.....bb..bb.....', '.....bb..bb.....'] }],
      up: [{ y: 8, rows: ['....bbbbbbbb....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....'] }],
      side: [{ y: 8, rows: ['.....bbbb.......', '......bbb.......', '......bbb.......', '......bbb.......'] }],
    },
  },
  portrait: {
    bg: 'purple0', shirt: 'plain', pal: { ...PORTRAIT_PAL, a: 'red', b: 'grey1', c: 'slate' }, back: [BACK], front: [FRONT], grin: GRIN,
    trim: [{ y: 17, rows: [
      '......cbb......bbc......',
      '....bbcbbb....bbbcbb....',
      '..bbbbbcbb....bbcbbbbb..',
      '..bbbbbbcb....bcbbbbbb..',
      '..bbbbbbbb....bbbbbbbb..',
      '..bbbbbbbb....bbbbbbbb..',
      '..bbbbbbbb....bbbbbbbb..',
    ] }],
  },
};

// ---------------------------------------------------------------- 4. Dungeon Master
const DM: EddieOpt = {
  slug: 'dm', name: 'Dungeon Master', other: 'happy', sleeve: 'b',
  note: 'Eddie running the table: a purple DM\'s cloak over the white Hellfire tee, black jeans, a white Flying V. The one fantasy look, since he is the Warlock.',
  spec: {
    id: 'eddie', body: 'adult', torso: 'plain', weapon: 'none', hair: HAIR,
    pal: { ...SPRITE_PAL, a: 'bone', b: 'purple', p: 'grey1', q: 'grey1', g: 'bone', G: 'grey1' },
    trim: {
      down: [{ y: 8, rows: ['....bbb..bbb....', '....b......b....', '....b......b....', '....b......b....', '...bb......bb...', '...bb......bb...'] }],
      up: [{ y: 8, rows: ['....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '...bbbbbbbbbb...', '...bbbbbbbbbb...'] }],
      side: [{ y: 8, rows: ['.....bb.........', '....bbb.........', '....bbb.........', '....bbb.........', '...bbb..........', '...bbb..........'] }],
    },
  },
  portrait: {
    bg: 'teal0', shirt: 'plain', pal: { ...PORTRAIT_PAL, a: 'bone', b: 'purple', c: 'amber' }, back: [BACK], front: [FRONT], grin: GRIN,
    trim: [{ y: 17, rows: [
      '.......bb......bb.......',
      '.....bbbbb....bbbbb.....',
      '...bbbbbbbcccc.bbbbbb...',
      '..bbbbbbb..cc...bbbbbb..',
      '..bbbbbb..........bbbb..',
      '..bbbbbb..........bbbb..',
      '..bbbbb............bbb..',
    ] }],
  },
};

// ---------------------------------------------------------------- 5. Denim
const DENIM: EddieOpt = {
  slug: 'denim', name: 'Denim', other: 'happy', sleeve: 'b',
  note: 'Denim on denim: a blue jacket with the sleeves on over the white tee, blue jeans, and a red Flying V with a wood neck. The friendliest silhouette, closest to the kids\' colors.',
  spec: {
    id: 'eddie', body: 'adult', torso: 'plain', weapon: 'none', hair: HAIR,
    pal: { ...SPRITE_PAL, a: 'bone', b: 'blue', p: 'blue', q: 'blue', g: 'red', G: 'soil1' },
    trim: {
      down: [{ y: 8, rows: ['....bbb..bbb....', '.....bb..bb.....', '.....bb..bb.....', '.....bbbbbb.....'] }],
      up: [{ y: 8, rows: ['....bbbbbbbb....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....'] }],
      side: [{ y: 8, rows: ['.....bbbb.......', '......bbb.......', '......bbb.......', '......bbbb......'] }],
    },
  },
  portrait: {
    bg: 'dusk', shirt: 'plain', pal: { ...PORTRAIT_PAL, a: 'bone', b: 'blue', c: 'sky' }, back: [BACK], front: [FRONT], grin: GRIN,
    trim: [{ y: 17, rows: [
      '......cbb......bbc......',
      '....bbcbbb....bbbcbb....',
      '..bbbbbcbb....bbcbbbbb..',
      '..bbbbbbbb....bbbbbbbb..',
      '..bbccbbbb....bbbbccbb..',
      '..bbbbbbbb....bbbbbbbb..',
      '..bbbbbbbb....bbbbbbbb..',
    ] }],
  },
};

export const EDDIE_OPTS: EddieOpt[] = [HELLFIRE, BATTLE, LEATHER, DM, DENIM];
