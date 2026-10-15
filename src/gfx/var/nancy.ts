// Four Nancys (docs/level-7.md): a teen in 1985 with brown hair, denim and a gun, on the adult body. Two carry the shotgun and two
// the pistol. Five fill colors a sprite plus the ink outline. The gun is a stamp on her near hand, and the arm carries it up and
// out (compose3.ts). Role letters, per design: s skin, e eye, h hair, a top, b jacket or trim, p pants, f shoes, g and n the gun.
import { ADULT } from '../data/adult.ts';
import type { Rig3, Stamp } from './compose3.ts';
import type { Hero3Opt } from './heroes3_types.ts';

const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });

/** The shotgun at port arms: upright beside her in front and back, level at the chest in profile. */
const SHOTGUN_NEAR: NonNullable<Rig3['near']> = {
  down: { rest: [12, 9], swingA: [12, 10], swingB: [12, 8] },
  up: { rest: [12, 9], swingA: [12, 10], swingB: [12, 8] },
  side: { rest: [11, 9], swingA: [11, 10], swingB: [11, 8] },
};
const SHOTGUN: NonNullable<Rig3['held']> = {
  down: [at(['gg', 'gg', 'gg', 'gg', 'gg', 'nn', '.n', 'nn', 'nn'], 0, -6)],
  up: [at(['gg', 'gg', 'gg', 'gg', 'gg', 'nn', '.n', 'nn', 'nn'], 0, -6)],
  side: [at(['....gggggg', 'nnnng.ggg', 'nnn'], -5, -1)],
};
/** The pistol raised: pointing up beside her in front and back, out at arm's length in profile. */
const PISTOL_NEAR: NonNullable<Rig3['near']> = {
  down: { rest: [12, 8], swingA: [12, 9], swingB: [12, 7] },
  up: { rest: [12, 8], swingA: [12, 9], swingB: [12, 7] },
  side: { rest: [12, 9], swingA: [12, 10], swingB: [12, 8] },
};
const PISTOL: NonNullable<Rig3['held']> = {
  down: [at(['gg', 'gg', 'gg', 'g.', 'g.'], 0, -5)],
  up: [at(['gg', 'gg', 'gg', 'g.', 'g.'], 0, -5)],
  side: [at(['gggg', 'g...'], 0, -1)],
};

// ---------------------------------------------------------------- 1. Bob
// The chin length brown bob, a denim jacket open over a white tee, jeans. The shotgun stands at port arms, steel barrel and wood stock.
const BOB: Hero3Opt = {
  who: 'nancy', slug: 'bob', name: 'Bob', other: 'determined',
  note: 'A chin length brown bob, a denim jacket open over a white tee, dark jeans. The shotgun at port arms, steel barrel, wood stock.',
  rig: {
    body: ADULT, near: SHOTGUN_NEAR, held: SHOTGUN,
    spec: {
      id: 'nancy', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', a: 'blue', b: 'bone', p: 'dusk', q: 'dusk', f: 'ink', g: 'bone', n: 'soil2' },
      hair: {
        down: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '...hhhhhhhhhh...',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
        ] }],
        up: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
        ] }],
        side: [{ y: 1, rows: [
          '.....hhhhh......',
          '...hhhhhhhhh....',
          '..hhhhhhhhhhh...',
          '..hhhhhhhh......',
          '..hhhhhhhh......',
          '..hhhhhhh.......',
          '...hhhhh........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.......bb.......', '.......bb.......', '.......bb.......', '.......bb.......'] }],
        up: [{ y: 9, rows: ['.....bbbbbb.....'] }],
        side: [{ y: 8, rows: ['.........b......', '.........b......', '.........b......', '.........b......'] }],
      },
    },
  },
  portrait: {
    bg: 'teal0', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'blue', b: 'bone', c: 'blue' },
    back: [],
    front: [{ y: 2, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhihhhhhhhh.....',
      '....hhhhhiihhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhhhh......hhhhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
      '....hhh..........hhh....',
      '.....hh..........hh.....',
    ] }],
    trim: [{ y: 17, rows: [
      '.........dSSSSd.........',
      '......bb.dSSSSd.bb......',
      '.......bbbdSSdbbb.......',
      '........bbbddbbb........',
    ] }],
  },
};

// ---------------------------------------------------------------- 2. Overalls
// A high ponytail with a rose tie, a rose shirt, denim overalls, steel buckles and sneakers. The pistol is steel.
const OVERALLS: Hero3Opt = {
  who: 'nancy', slug: 'overalls', name: 'Overalls', other: 'worried',
  note: 'A high ponytail with a rose tie, a rose long sleeve shirt under denim overalls, grey sneakers. A steel pistol raised.',
  rig: {
    body: ADULT, near: PISTOL_NEAR, held: PISTOL,
    spec: {
      id: 'nancy', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'rose', b: 'blue', p: 'blue', q: 'blue', f: 'grey3', g: 'grey3', x: 'grey3' },
      hair: {
        down: [{ y: 0, rows: [
          '......hhhh......',
          '.....hhaahh.....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hh....hh....',
        ] }],
        up: [{ y: 0, rows: [
          '......hhhh......',
          '.....hhaahh.....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
          '......hhhh......',
        ] }],
        side: [{ y: 0, rows: [
          '..hh............',
          '.hhaa.hhhh......',
          '.hhh.hhhhhhh....',
          '..hhhhhhhhhhh...',
          '...hhhhhh.......',
          '...hhh..........',
          '....hh..........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.....b....b.....', '.....bxbbxb.....', '......bbbb......', '......bbbb......'] }],
        up: [{ y: 8, rows: ['.....b....b.....', '.....bbbbbb.....', '......bbbb......', '......bbbb......'] }],
        side: [{ y: 8, rows: ['......b.........', '......bbb.......', '.......bb.......', '.......bb.......'] }],
      },
    },
  },
  portrait: {
    bg: 'purple0', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'rose', b: 'blue', c: 'rose', x: 'grey3' },
    back: [{ y: 2, rows: [
      '..........hhhh..........',
      '.........hhaahh.........',
      '..........hhhh..........',
    ] }],
    front: [{ y: 3, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhhhhhhhhhh.....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhh..hhhhhhh.hhh....',
      '....hh..............hh..',
    ] }],
    trim: [{ y: 17, rows: [
      '.....b....dSSSSd..b.....',
      '.....bb...dSSSSd.bb.....',
      '.....bbbbbdSSdbbbbb.....',
      '.....bbbxbbddbbxbbb.....',
      '.....bbbbbbbbbbbbbb.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 3. Vest
// Long straight hair under a red headband, a sleeveless denim vest over a red tank, bare arms, blue jeans. A blued steel pistol raised.
const VEST: Hero3Opt = {
  who: 'nancy', slug: 'vest', name: 'Vest', other: 'determined',
  note: 'Long straight hair under a red headband, a sleeveless denim vest over a red tank, bare arms, blue jeans. A blued steel pistol raised.',
  rig: {
    body: ADULT, near: PISTOL_NEAR, held: PISTOL, sleeve: 's',
    spec: {
      id: 'nancy', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', a: 'red', b: 'sky', p: 'blue', q: 'blue', f: 'ink', g: 'blue' },
      hair: {
        down: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '....aaaaaaaa....',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
          '...hh......hh...',
        ] }],
        up: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhh....',
          '....aaaaaaaa....',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 1, rows: [
          '.....hhhhh......',
          '...hhhhhhhh.....',
          '..hhhhhhhaaa....',
          '..hhhhhhhh......',
          '..hhhhhhh.......',
          '..hhhhhh........',
          '..hhhhh.........',
          '..hhhh..........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.....bb..bb.....', '.....bb..bb.....', '.....bb..bb.....', '.....bb..bb.....'] }],
        up: [{ y: 8, rows: ['.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bbbbbb.....'] }],
        side: [{ y: 8, rows: ['......bbb.......', '......bbb.......', '......bbb.......', '......bbb.......'] }],
      },
    },
  },
  portrait: {
    bg: 'dusk', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'red', b: 'sky', c: 'red' },
    back: [{ y: 6, rows: [
      '...hhhh..............hhh',
      '...hhhhh............hhhh',
    ] }],
    front: [{ y: 2, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhihhhhhhhh.....',
      '....hhhhhiihhhhhhhhh....',
      '....aaaaaaaaaaaaaaaa....',
      '....hhhhhhhhhhhhhhhh....',
      '....hhh............hhh..',
      '....hhh............hhh..',
      '....hhh............hhh..',
      '...hhh..............hhh.',
    ] }],
    trim: [{ y: 17, rows: [
      '.....bbb.dSSSSd.bbb.....',
      '....bbbb.dSSSSd.bbbb....',
      '...bbbbb.dSSSd..bbbbb...',
      '..bbbbbb..dSd...bbbbbb..',
    ] }],
  },
};

// ---------------------------------------------------------------- 4. Perm
// Big permed hair, a pale acid wash jacket with the sleeves pushed up, a white tee, blue jeans. The shotgun at port arms.
const PERM: Hero3Opt = {
  who: 'nancy', slug: 'perm', name: 'Perm', other: 'worried',
  note: 'Big permed hair, a pale acid wash jacket with the sleeves pushed up, a white tee, blue jeans. The shotgun at port arms.',
  rig: {
    body: ADULT, near: SHOTGUN_NEAR, held: SHOTGUN, sleeve: 's',
    spec: {
      id: 'nancy', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', a: 'sky', b: 'bone', p: 'blue', q: 'blue', f: 'ink', g: 'bone', n: 'soil2' },
      hair: {
        down: [{ y: 0, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '.hhhhhhhhhhhhhh.',
          '.hhhhhhhhhhhhhh.',
          '.hhh........hhh.',
          '.hhh........hhh.',
          '..hh........hh..',
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
          '.hhhhhhhhhhhh...',
          '.hhhhhhhh.......',
          '.hhhhhhh........',
          '..hhhhh.........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.....b....b.....', '.....bb..bb.....', '.......bb.......', '.......bb.......'] }],
        up: [{ y: 9, rows: ['.....bbbbbb.....'] }],
        side: [{ y: 8, rows: ['.........b......', '.........b......', '.........b......', '.........b......'] }],
      },
    },
  },
  portrait: {
    bg: 'purple', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'sky', b: 'bone', c: 'sky' },
    back: [],
    front: [{ y: 0, rows: [
      '.......hhhhhhhhhh.......',
      '....hhhhhhhhhhhhhhhh....',
      '...hhhhhihhhhhhhhhhhh...',
      '..hhhhhiiihhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhhh..hhhhhh..hhhhh..',
      '..hhhh............hhhh..',
      '..hhhh............hhhh..',
      '...hhh............hhh...',
      '....hh............hh....',
    ] }],
    trim: [{ y: 17, rows: [
      '.......bbb....bbb.......',
      '......bbbb....bbbb......',
      '.....bbbbb....bbbbb.....',
    ] }],
  },
};

export const NANCY_OPTS: Hero3Opt[] = [BOB, OVERALLS, VEST, PERM];
