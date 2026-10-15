// Four Steves (docs/level-5.md): big 1984 hair, a polo or a jacket, the nail bat. On the adult body, so he stands a head
// taller than the kids. Five fill colors a sprite plus the ink outline. Role letters: s skin, e eye, h hair, a top, b collar
// or trim, p pants, f shoes, g and G the bat, n the nails.
import { ADULT } from '../data/adult.ts';
import type { HeroOpt } from './hero_types.ts';

// ---------------------------------------------------------------- 1. Polo
const POLO: HeroOpt = {
  who: 'steve', slug: 'polo', name: 'Polo', other: 'determined',
  note: 'A big mound of feathered hair over a small face, a rose polo with the collar popped, khakis. The bat is plain wood with nails.',
  rig: {
    body: ADULT, gear: 'nailbat',
    spec: {
      id: 'steve', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', a: 'rose', b: 'bone', p: 'sand', q: 'sand', f: 'ink', g: 'sand', G: 'sand', n: 'bone' },
      hair: {
        down: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '..hhhhhhhhhhhh..',
          '..hh........hh..',
        ] }],
        up: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '..hhhhhhhhhhhh..',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
        ] }],
        side: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '...hhhhhhhhhh...',
          '..hhhhhhhhhhhh..',
          '..hhhhh.........',
          '...hhh..........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.....bb..bb.....', '.......b........', '.......b........'] }],
        up: [{ y: 8, rows: ['.....bbbbbb.....'] }],
        side: [{ y: 8, rows: ['......bbbb......'] }],
      },
    },
  },
  portrait: {
    bg: 'blood1', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'rose', b: 'bone', c: 'rose' },
    back: [],
    front: [{ y: 1, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhhhhhhhhhh.....',
      '....hhhhhhihhhhhhhhh....',
      '...hhhhhhiiihhhhhhhhh...',
      '...hhhhhhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhhhhhhh...',
      '..hhhhhh.hhhhhhh.hhhhh..',
      '..hhhh............hhhh..',
      '..hhhh............hhhh..',
      '.hhhh..............hhhh.',
      '.hhh................hhh.',
      '.hh..................hh.',
    ] }],
    trim: [{ y: 17, rows: [
      '.......bbb....bbb.......',
      '......bbbb....bbbb......',
      '.....bb.bb....bb.bb.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 2. Letterman
const LETTERMAN: HeroOpt = {
  who: 'steve', slug: 'letterman', name: 'Letterman', other: 'determined',
  note: 'A tall flat top, a navy varsity jacket with bone sleeves and a letter patch. The bat is the only thing not school issue.',
  rig: {
    body: ADULT, gear: 'nailbat', sleeve: 'b',
    spec: {
      id: 'steve', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'dusk', b: 'bone', p: 'slate', q: 'slate', f: 'ink', g: 'soil1', G: 'soil1', n: 'bone' },
      hair: {
        down: [{ y: 1, rows: [
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hh......hh...',
          '....h......h....',
        ] }],
        up: [{ y: 1, rows: [
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhh...',
          '....hhhhhhhh....',
          '.....hhhhhh.....',
        ] }],
        side: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '...hhhhhhhhhh...',
          '...hhhhhhhhhhh..',
          '...hhhh.........',
          '...hhhh.........',
          '....hhh.........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['.....bbbbbb.....', '......bb........', '......bb........'] }, { y: 11, rows: ['.....bbbbbb.....'] }],
        up: [{ y: 8, rows: ['.....bbbbbb.....'] }, { y: 11, rows: ['.....bbbbbb.....'] }],
        side: [{ y: 8, rows: ['......bbbb......'] }, { y: 11, rows: ['......bbbb......'] }],
      },
    },
  },
  portrait: {
    bg: 'dusk', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'dusk', b: 'bone', c: 'dusk' },
    back: [],
    front: [{ y: 0, rows: [
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhihhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhh.....',
      '.....hhh.hhhhhhh.hhh....',
      '....hhh............hhh..',
      '....hh..............hh..',
    ] }],
    trim: [{ y: 17, rows: [
      '.......bbbd....dbbb.....',
      '......bbbb......bbbb....',
      '.....bb..............bb.',
    ] }],
  },
};

// ---------------------------------------------------------------- 3. Leather
const LEATHER: HeroOpt = {
  who: 'steve', slug: 'leather', name: 'Leather', other: 'determined',
  note: 'Slicked and swept hair with long sideburns, a brown leather jacket zipped over a white tee, blue jeans.',
  rig: {
    body: ADULT, gear: 'nailbat',
    spec: {
      id: 'steve', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil1', a: 'soil2', b: 'bone', y: 'ink', p: 'blue', q: 'blue', f: 'ink', g: 'soil2', G: 'soil2', n: 'bone' },
      hair: {
        down: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhhhh..',
          '...hhhhhhhhhhhh.',
          '...hhh......hhh.',
          '...hh........hh.',
          '...hh.......hh..',
        ] }],
        up: [{ y: 1, rows: [
          '.....hhhhhh.....',
          '....hhhhhhhhh...',
          '...hhhhhhhhhhh..',
          '...hhhhhhhhhhh..',
          '...hhhhhhhhhhh..',
          '...hhhhhhhhhhh..',
          '....hhhhhhhhh...',
          '.....hhhhhhh....',
        ] }],
        side: [{ y: 1, rows: [
          '.....hhhhh......',
          '....hhhhhhhhh...',
          '...hhhhhhhhhhh..',
          '..hhhhhh.hhh....',
          '..hhhhhh........',
          '..hhhhhhh.......',
          '...hhhhhh.......',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['....aa.bb.aa....', '......by........', '.......y........', '.......y........'] }],
        up: [{ y: 8, rows: ['....aaaaaaaa....'] }],
        side: [{ y: 8, rows: ['......aaaa......', '.......b........'] }],
      },
    },
  },
  portrait: {
    bg: 'night', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil1', i: 'soil2', j: 'soil0', a: 'soil2', b: 'bone', c: 'soil2' },
    back: [{ y: 8, rows: [
      '...hh..............hh...',
      '...hhh............hhh...',
      '...hhhh..........hhhh...',
      '....hhh..........hhh....',
    ] }],
    front: [{ y: 2, rows: [
      '.......hhhhhhhhhh.......',
      '.....hhhhhhhhhhhhhhh....',
      '....hhhhhihhhhhhhhhhh...',
      '....hhhhiiihhhhhhhhhh...',
      '....hhhhhhhhhhhhhhhhh...',
      '....hhhh.hhhhhhhhh.hh...',
      '....hhh............hhh..',
      '....hhh............hhh..',
      '....hh..............hh..',
      '....hh..............hh..',
    ] }],
    trim: [{ y: 17, rows: [
      '.........dbbbbd.........',
      '.....aaa..bbbb..aaa.....',
      '....aaaa..bbb..aaaa.....',
      '...aaaaa..bb..aaaaa.....',
    ] }],
  },
};

// ---------------------------------------------------------------- 4. Sweater
const SWEATER: HeroOpt = {
  who: 'steve', slug: 'sweater', name: 'Sweater', other: 'determined',
  note: 'A round perm under a red headband, a cream sweater with a red stripe, jeans. The softest of the four.',
  rig: {
    body: ADULT, gear: 'nailbat',
    spec: {
      id: 'steve', body: 'adult', torso: 'plain', weapon: 'none',
      pal: { s: 'skin0', d: 'skin0', e: 'ink', h: 'soil2', a: 'cream', b: 'red', p: 'blue', q: 'blue', f: 'ink', g: 'soil2', G: 'soil2', n: 'cream' },
      hair: {
        down: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '.hhhhbbbbbbhhhh.',
          '.hhh........hhh.',
          '.hhh........hhh.',
          '..hh........hh..',
        ] }],
        up: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '.hhhhbbbbbbhhhh.',
          '.hhhhhhhhhhhhhh.',
          '.hhhhhhhhhhhhhh.',
          '..hhhhhhhhhhhh..',
          '...hhhhhhhhhh...',
        ] }],
        side: [{ y: 1, rows: [
          '....hhhhhhhh....',
          '..hhhhhhhhhhhh..',
          '.hhhhhbbbbbbbb..',
          '.hhhhhhhh.......',
          '.hhhhhhhh.......',
          '..hhhhhh........',
        ] }],
      },
      trim: {
        down: [{ y: 8, rows: ['......b..b......', '.......bb.......'] }, { y: 10, rows: ['.....bbbbbb.....'] }],
        up: [{ y: 8, rows: ['.....bbbbbb.....'] }],
        side: [{ y: 8, rows: ['........b.......'] }, { y: 10, rows: ['......bbbb......'] }],
      },
    },
  },
  portrait: {
    bg: 'teal1', shirt: 'plain',
    pal: { s: 'skin0', d: 'skin1', h: 'soil2', i: 'soil3', j: 'soil1', a: 'cream', b: 'red', c: 'cream' },
    back: [],
    front: [{ y: 1, rows: [
      '.......hhhhhhhhhh.......',
      '....hhhhhhhhhhhhhhhh....',
      '...hhhhhhihhhhhhhhhhh...',
      '..hhhhhhiiihhhhhhhhhhh..',
      '..hhhbbbbbbbbbbbbbbhhh..',
      '..hhhhhhhhhhhhhhhhhhhh..',
      '..hhhh.hhhhhhhhh.hhhhh..',
      '..hhhh............hhhh..',
      '..hhh..............hhh..',
      '..hhh..............hhh..',
      '...hh..............hh...',
    ] }],
    trim: [{ y: 20, rows: [
      '..bbbbbbbbbbbbbbbbbbbb..',
    ] }],
  },
};

export const STEVE_OPTS: HeroOpt[] = [POLO, LETTERMAN, LEATHER, SWEATER];
