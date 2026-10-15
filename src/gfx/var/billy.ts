// Five Flayed Billys (docs/level-9.md): Billy Hargrove in 1985, the mullet he was proud of, the lifeguard's tan gone grey, dark veins
// over pale skin and dead white eyes, on the teen body a size up (billy_body.ts, a 24 px cell). All five are the same boy in different
// clothes, and each reads by one shape: bare skin and trunks, a shirt hanging open, a tank top, a denim vest, a torn beach shirt.
// A design is a palette, a mullet and what he wears; the veins, the eyes and the poses are the body's. Role letters: s skin, d shade,
// v veins, w eyes, e ink, h hair (i light), a b c cloth, m sleeve, p trousers, f shoes.
import type { ColorName } from '../palette.ts';
import type { PortraitSpec } from '../data/portraits.ts';
import type { Part } from '../data/types.ts';
import { C, P, S } from './billy_body.ts';
import type { BillyRig } from './billy_body.ts';
import { BILLY_PORTRAITS } from './billy_portrait.ts';

export interface BillyOpt {
  slug: string;
  /** The short name to pick it by. */
  name: string;
  /** One line: the idea. */
  note: string;
  rig: BillyRig;
  /** The free man's portrait, in the game's format. */
  portrait: PortraitSpec;
  /** What the skin warms to when the veins fade and he is himself again. */
  tan: ColorName;
}

type Cut = 'slick' | 'feather' | 'bangs' | 'swept' | 'wild';
/** The front of the mullet, by cut. Every cut keeps the brows and the eyes clear, and every one is long behind (hairUp, hairSide). */
const FRONT: Record<Cut, string[]> = {
  slick: [S([9, 'hhhhhh']), S([7, 'hhhhhhhhhh']), S([6, 'hhhhihhhhhhh']), S([6, 'hhhhh'], [13, 'hhhhh']), S([6, 'hh'], [16, 'hh']), S([6, 'h'], [17, 'h']), S([6, 'h'], [17, 'h'])],
  feather: [S([9, 'hhhhhh']), S([7, 'hhihhhhhhh']), S([6, 'hhhhhihhhhhh']), S([5, 'hhhhhh'], [13, 'hhhhhh']), S([5, 'hhh'], [16, 'hhh']), S([4, 'hhhh'], [16, 'hhhh']), S([4, 'hhh'], [17, 'hhh']), S([5, 'hh'], [17, 'hh']), S([6, 'h'], [17, 'h'])],
  bangs: [S([8, 'h.hh.h.h']), S([7, 'hhhhhihhhh']), S([6, 'hhhhhhhhhhhh']), S([5, 'hhhhhhhhhhhhhh']), S([5, 'hhhhhhhhhhhhhh']), S([6, 'hh.hhh.hh.hh']), S([5, 'hh'], [17, 'hh']), S([5, 'hh'], [17, 'hh']), S([6, 'h'], [17, 'h'])],
  swept: [S([8, 'hhhhhhhh']), S([6, 'hhhhhhhhhhhh']), S([5, 'hhhhhh'], [13, 'hhhhhh']), S([5, 'hhhh'], [15, 'hhhh']), S([5, 'hhh'], [16, 'hhh']), S([5, 'hh'], [17, 'hh']), S([5, 'hh'], [17, 'hh']), S([9, 'd'], [14, 'd'], [6, 'h'], [17, 'h']), S([10, 'd'], [13, 'd'])],
  wild: [S([7, 'h.h.hh.h.h']), S([6, 'hhhhhhhihhhh']), S([5, 'hhhhhhhhhhhhhh']), S([4, 'hhhhhhhhhhhhhhhh']), S([4, 'hhhh'], [10, 'h'], [13, 'h'], [16, 'hhhh']), S([4, 'hhh'], [17, 'hhh']), S([3, 'hhhh'], [17, 'hhhh']), S([3, 'hhh'], [18, 'hhh']), S([4, 'hh'], [18, 'hh']), S([4, 'h'], [19, 'h'])],
};
const hairDown = (cut: Cut): Part[] => [P(cut === 'bangs' || cut === 'wild' ? 0 : 1, ...FRONT[cut])];
/** From behind, a mullet is a short mound that flares into a wedge down the neck, its tips feathered. */
const hairUp = (cut: Cut): Part[] => [P(1, S([9, 'hhhhhh']), S([8, 'hhihhhhh']), S([7, 'hhhhhhihhh']), S([6, 'hhhhhihhhhhh']), S([6, 'hhhhhhhhhhhh']), S([6, 'hhihhhhhhihh']), S([6, 'hhhhhhhhhhhh']), S([6, 'hhhhhhhihhhh']), S([5, 'hhhhhhhhhhhhhh']), S([5, 'hhhhihhhhhhhhh']), S([5, 'hhhhhhhhhhhhhh']), cut === 'slick' ? S([7, 'hhhhhhhhhh']) : S([6, 'hh.hh.hh.hh.']))];
const hairSide = (cut: Cut): Part[] => [P(1, S([9, 'hhhhhh']), S([7, 'hhhhhihhhhh']), S([6, 'hhhhhhhhhhh']), S([6, 'hhhhhhhhhh'], [15, cut === 'swept' ? '' : 'hh']), S([5, 'hhhh']), S([4, 'hhhhh']), S([4, 'hhhh']), S([4, 'hhh']), S([5, 'hhh']), S([5, 'hh']), S([6, 'hh']), S([7, 'h']))];
const hair = (cut: Cut): BillyRig['hair'] => ({ down: hairDown(cut), up: hairUp(cut), side: hairSide(cut) });

// ---------------------------------------------------------------- 1. Lifeguard
const LIFEGUARD: BillyOpt = {
  slug: 'lifeguard', name: 'Lifeguard', tan: 'skin1',
  note: 'Bare chest gone the grey of ash, red lifeguard trunks with a white drawstring, the whistle still on its cord, bare feet. A sun bleached mullet, wet and swept back. The summer job, ruined.',
  portrait: BILLY_PORTRAITS.lifeguard,
  rig: {
    pal: { s: 'bone', d: 'grey3', v: 'purple0', w: 'white', e: 'ink', h: 'yellow', i: 'cream', a: 'red', b: 'white', c: 'red', p: 'red', q: 'blood1', f: 'bone' },
    bare: 3,
    hair: hair('slick'),
    trim: {
      down: [P(11, S([8, 'c'], [15, 'c']), S([9, 'c'], [14, 'c']), S([10, 'c'], [13, 'c']), S([11, 'cc']), S([11, 'bb'])), P(17, C('bbbbbbbbbb'))],
      up: [P(11, S([10, 'cccc'])), P(17, C('bbbbbbbbbb'))],
      side: [P(11, S([10, 'c']), S([11, 'c']), S([12, 'c']), S([13, 'cc'])), P(17, S([9, 'bbbbbbb']))],
    },
  },
};

// ---------------------------------------------------------------- 2. Open Shirt
const OPEN: BillyOpt = {
  slug: 'opencollar', name: 'Open Shirt', tan: 'skin1',
  note: 'A pale blue short sleeved shirt hanging open and untucked over a bare chest, the collar flared wide, tight jeans, dark sneakers. The one he wore to the arcade, with nothing buttoned.',
  portrait: BILLY_PORTRAITS.opencollar,
  rig: {
    pal: { s: 'bone', d: 'grey3', v: 'blood1', w: 'white', e: 'ink', h: 'sand', i: 'amber', a: 'sky', b: 'white', m: 'sky', p: 'dusk', q: 'night', f: 'ink' },
    sleeve: { role: 'm', len: 4 },
    hair: hair('feather'),
    trim: {
      down: [P(11, S([6, 'aabb'], [14, 'bbaa']), S([6, 'aaaa'], [14, 'aaaa']), S([7, 'aaa'], [14, 'aaa']), S([7, 'aaa'], [14, 'aaa']), S([7, 'aaa'], [14, 'aaa']), S([7, 'aaa'], [14, 'aaa']), S([7, 'aaa'], [14, 'aaa']), S([6, 'aaaa'], [14, 'aaaa']), S([5, 'aaa'], [16, 'aaa']))],
      up: [P(11, C('bbaaaaaabb'), C('aaaaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaaaa'), S([6, 'aaaa.aaaa.aaaa']))],
      side: [P(11, S([8, 'bbaaaaaa']), S([8, 'aaaaaaaaa']), S([8, 'aaaaaaaaa']), S([8, 'aaaa']), S([8, 'aaaa']), S([8, 'aaaa']), S([7, 'aaaaa']), S([6, 'aaaaaa']), S([6, 'aaaa']))],
    },
  },
};

// ---------------------------------------------------------------- 3. Tank Top
const TANK: BillyOpt = {
  slug: 'tank', name: 'Tank Top', tan: 'skin1',
  note: 'A white tank top gone grey and spotted dark, shoulders and arms bare, stonewashed jeans, white sneakers. Broad shouldered and plain, the way he looks at the quarry. The veins climb out of the neckline.',
  portrait: BILLY_PORTRAITS.tank,
  rig: {
    pal: { s: 'grey3', d: 'grey2', v: 'purple0', w: 'white', e: 'ink', h: 'amber', i: 'yellow', a: 'white', b: 'blood1', p: 'blue', q: 'dusk', f: 'white' },
    hair: hair('bangs'),
    trim: {
      down: [P(11, S([8, 'aa'], [14, 'aa']), S([7, 'aaa'], [14, 'aaa']), C('aaaaaaaaaa'), C('aaabaaaaaa'), C('aaaaaabaaa'), C('aabaaaaaaa'), S([7, 'aa.aaaa.aa']))],
      up: [P(11, S([8, 'aaaa'], [12, 'aaaa']), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaabaaaaa'), C('aaaaaaaaaa'), C('abaaaaaaaa'), S([7, 'aa.aaaa.aa']))],
      side: [P(11, S([9, 'aaaaaa']), S([8, 'aaaaaaaaa']), S([8, 'aaabaaaaa']), S([8, 'aaaaaaaa']), S([8, 'aabaaaaa']), S([9, 'aaaaaaa']), S([9, 'aa.aaaa']))],
    },
  },
};

// ---------------------------------------------------------------- 4. Denim Vest
const DENIM: BillyOpt = {
  slug: 'denim', name: 'Denim Vest', tan: 'skin1',
  note: 'A sleeveless denim jacket open on a bare chest, a gold cross on a chain, a studded belt, dark jeans, boots. Dirty blond hair slicked back to the collar. Looks like trouble before the veins do.',
  portrait: BILLY_PORTRAITS.denim,
  rig: {
    pal: { s: 'bone', d: 'mist', v: 'purple0', w: 'white', e: 'ink', h: 'sand', i: 'soil3', a: 'slate', b: 'mist', c: 'amber', p: 'grey1', q: 'night', f: 'soil1' },
    hair: hair('swept'),
    trim: {
      down: [P(11, S([6, 'abab'], [14, 'baba']), S([6, 'aaaa'], [14, 'aaaa']), S([7, 'aaa'], [14, 'aaa']), S([7, 'aaa'], [14, 'aaa']), S([7, 'aab'], [14, 'baa']), S([7, 'aaa'], [14, 'aaa']), C('eeeeccceee')), P(12, S([11, 'c'], [12, 'c']), S([11, 'c']), S([10, 'ccc']), S([11, 'c']))],
      up: [P(11, C('ababaaabab'), C('aaaaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('aaaaaaaaaa'), C('eeeeeeeeee'))],
      side: [P(11, S([8, 'ababaaaa']), S([8, 'aaaaaaaaa']), S([8, 'aaaa'], [14, 'a']), S([8, 'aaaa']), S([8, 'aaab']), S([9, 'aaaa']), S([9, 'eeeeccee'])), P(12, S([15, 'c']), S([16, 'c']), S([16, 'c']))],
    },
  },
};

// ---------------------------------------------------------------- 5. Beach Shirt
const BEACH: BillyOpt = {
  slug: 'hawaiian', name: 'Beach Shirt', tan: 'skin1',
  note: 'A loud orange beach shirt printed with yellow and pink, torn at the sleeves and open to the waist, cutoff denim shorts, sandals. Bleached hair going to straw. The beach is the memory Eleven finds.',
  portrait: BILLY_PORTRAITS.hawaiian,
  rig: {
    pal: { s: 'grey3', d: 'grey2', v: 'blood1', w: 'white', e: 'ink', h: 'cream', i: 'yellow', a: 'orange', b: 'yellow', c: 'pink', m: 'orange', p: 'blue', q: 'dusk', f: 'soil2' },
    bare: 2, sleeve: { role: 'm', len: 3 },
    hair: hair('wild'),
    trim: {
      down: [P(11, S([6, 'aabb'], [14, 'bbaa']), S([6, 'abaa'], [14, 'aaca']), S([7, 'aca'], [14, 'aba']), S([7, 'aaa'], [14, 'aaa']), S([7, 'bab'], [14, 'aca']), S([7, 'aaa'], [14, 'aaa']), S([6, 'a.aa'], [14, 'aa.a']), S([5, 'a'], [8, 'a'], [15, 'a'], [18, 'a']))],
      up: [P(11, C('bbaaaaaabb'), C('abaacaabaaca'), C('aaaaaaaaaa'), C('acaabaaaca'), C('aaaaaaaaaa'), C('aabaaacaaa'), C('aaaaaaaaaa'), S([6, 'aa.aa.aa.aa.aa']))],
      side: [P(11, S([8, 'bbaaaaaa']), S([8, 'abaaacaaa']), S([8, 'aaaa']), S([8, 'acaa']), S([8, 'aaba']), S([8, 'aaaa']), S([7, 'a.aa.a']))],
    },
  },
};

export const BILLY_OPTS: BillyOpt[] = [LIFEGUARD, OPEN, TANK, DENIM, BEACH];
