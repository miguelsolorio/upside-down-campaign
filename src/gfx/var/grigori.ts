// Five Grigoris (docs/level-8.md): the Soviet enforcer, a big, cold, blond man, on the big body (data/big.ts) with arms two pixels
// thick. Five fill colors a sprite plus the ink outline. Grigori never speaks, so there are no portraits. Every design is the
// same man in different clothes, and each reads by one shape: a long coat, bare arms, a suit's shoulders, a fur ring, an apron.
// Role letters, per design: s skin, e ink detail, h hair, a main cloth, b or r or t trim, p trousers, f boots.
import { BIG } from '../data/big.ts';
import type { CharSpec } from '../data/types.ts';
import type { Rig3 } from './compose3.ts';
import { GRIGORI_ARMS, GRIGORI_FISTS } from './grigori_poses.ts';

export interface GrigoriOpt {
  slug: string;
  /** The short name to pick it by. */
  name: string;
  /** One line: the idea. */
  note: string;
  rig: Rig3;
}

const SKIN = { s: 'skin0', d: 'skin0', e: 'ink', f: 'ink' } as const;
/** The same flat brows on every design, so he is one cold man in five coats. Drawn last, over the hairline. */
const BROW = { down: { y: 3, rows: ['.....ee..ee.....'] }, side: { y: 3, rows: ['.........eee....'] } };
const rig = (spec: CharSpec, sleeve?: string): Rig3 => ({ spec, body: BIG, thick: true, arms: GRIGORI_ARMS, heldBy: GRIGORI_FISTS, ...(sleeve ? { sleeve } : {}) });

// ---------------------------------------------------------------- 1. Greatcoat
const GREATCOAT: GrigoriOpt = {
  slug: 'greatcoat', name: 'Greatcoat',
  note: 'A blond flat top, a long grey greatcoat belted in black with red collar tabs. The coat falls to the boots and flares at the hem, so he reads as one tall column.',
  rig: rig({
    id: 'grigori', body: 'big', torso: 'plain', weapon: 'none',
    pal: { ...SKIN, h: 'yellow', a: 'grey2', b: 'red', p: 'grey1', q: 'grey1' },
    hair: {
      down: [{ y: 1, rows: ['....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....'] }, BROW.down],
      up: [{ y: 1, rows: ['....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....'] }],
      side: [{ y: 1, rows: ['....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhh......', '....hhhhh.......', '....hh..........'] }, BROW.side],
    },
    trim: {
      down: [{ y: 8, rows: ['....bb....bb....', '.......ee.......', '...eeeebbeeee...', '..aaaaaeeaaaaa..', '..aaaaaeeaaaaa..', '.aaaaaaeeaaaaaa.'] }],
      up: [{ y: 10, rows: ['...eeeeeeeeee...', '..aaaaaeeaaaaa..', '..aaaaaeeaaaaa..', '.aaaaaaeeaaaaaa.'] }],
      side: [{ y: 10, rows: ['.....eeeeeee....', '....aaaaaaaaa...', '....aaaaaaaaa...', '...aaaaaaaaaaa..'] }],
    },
  }),
};

// ---------------------------------------------------------------- 2. Tanker
const TANKER: GrigoriOpt = {
  slug: 'tanker', name: 'Tanker',
  note: 'A buzz cut, a white undershirt with the arms bare, black braces over it, grey trousers with a red star buckle. Nothing hides the size of him.',
  rig: rig({
    id: 'grigori', body: 'big', torso: 'plain', weapon: 'none',
    pal: { ...SKIN, h: 'yellow', a: 'bone', b: 'grey1', p: 'grey1', q: 'grey1', r: 'red' },
    hair: {
      down: [{ y: 2, rows: ['.....hhhhhh.....', '....hhhhhhhh....'] }, BROW.down],
      up: [{ y: 2, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....'] }],
      side: [{ y: 2, rows: ['.....hhhhhh.....', '....hhhhhh......', '....hhh.........'] }, BROW.side],
    },
    trim: {
      down: [{ y: 8, rows: ['...s.bb..bb.s...', '.....bb..bb.....', '...pppprrpppp...', '...pppppppppp...'] }],
      up: [{ y: 8, rows: ['...s.bb..bb.s...', '.....bbbbbb.....', '...pppppppppp...', '...pppppppppp...'] }],
      side: [{ y: 8, rows: ['.......bb.......', '.......bb.......', '.....ppprrp.....', '.....pppppp.....'] }],
    },
  }, 's'),
};

// ---------------------------------------------------------------- 3. Suit
const SUIT: GrigoriOpt = {
  slug: 'suit', name: 'Suit',
  note: 'Blond hair slicked back with a hard side part, a charcoal suit with shoulders padded wide, a white shirt, a red tie. The man who sends the soldiers, then comes himself.',
  rig: rig({
    id: 'grigori', body: 'big', torso: 'plain', weapon: 'none',
    pal: { ...SKIN, h: 'yellow', a: 'grey1', b: 'white', t: 'red', p: 'grey1', q: 'grey1' },
    hair: {
      down: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhh.hhh....', '....h......h....'] }, BROW.down],
      up: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....', '.....hhhhhh.....'] }],
      side: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhh......', '....hhhh........', '....hhh.........'] }, BROW.side],
    },
    trim: {
      down: [{ y: 8, rows: ['.aaaaabbbbaaaaa.', '.aaaaaabbaaaaaa.', '.......tt.......', '.......tt.......'] }],
      up: [{ y: 8, rows: ['.aaaaaaaaaaaaaa.', '.aaaaaaaaaaaaaa.'] }],
      side: [{ y: 8, rows: ['........bb......', '.........t......', '.........t......'] }],
    },
  }),
};

// ---------------------------------------------------------------- 4. Parka
const PARKA: GrigoriOpt = {
  slug: 'parka', name: 'Parka',
  note: 'Swept back blond hair to the collar, a dark green padded parka puffed out wide, the fur hood down in a thick white ring, grey trousers. Dressed for a winter that is not in the mall.',
  rig: rig({
    id: 'grigori', body: 'big', torso: 'plain', weapon: 'none',
    pal: { ...SKIN, h: 'yellow', a: 'pine1', b: 'bone', p: 'grey1', q: 'grey1' },
    hair: {
      down: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '...hhh....hhh...', '...hh......hh...', '...hh......hh...'] }, BROW.down],
      up: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '....hhhhhhhh....', '.....hhhhhh.....'] }],
      side: [{ y: 1, rows: ['.....hhhhhh.....', '...hhhhhhhhh....', '..hhhhhhhhhh....', '..hhhhhhh.......', '..hhhhhh........', '...hhhh.........', '....hh..........'] }, BROW.side],
    },
    trim: {
      down: [{ y: 9, rows: ['..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..'] }, { y: 8, rows: ['..bbbbbbbbbbbb..', '...bb......bb...', '.......b........', '.......b........'] }],
      up: [{ y: 9, rows: ['..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..'] }, { y: 8, rows: ['..bbbbbbbbbbbb..', '...bbbbbbbbbb...'] }],
      side: [{ y: 9, rows: ['....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaa....'] }, { y: 8, rows: ['....bbbbbbbb....', '.....bbbb.......'] }],
    },
  }),
};

// ---------------------------------------------------------------- 5. Apron
const APRON: GrigoriOpt = {
  slug: 'apron', name: 'Apron',
  note: 'Thin pale hair going back at the temples, a white shirt with the sleeves rolled, a long grey rubber apron spotted dark, grey trousers. Works in the lab, not the barracks.',
  rig: rig({
    id: 'grigori', body: 'big', torso: 'plain', weapon: 'none',
    pal: { ...SKIN, h: 'yellow', a: 'bone', b: 'grey2', p: 'grey1', q: 'grey1' },
    hair: {
      down: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hh....hh....', '....h......h....'] }, BROW.down],
      up: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....', '.....hhhhhh.....'] }],
      side: [{ y: 1, rows: ['.....hhhhhh.....', '....hhhhhhhh....', '....hhhhh.......', '....hhhh........', '....hhh.........'] }, BROW.side],
    },
    trim: {
      down: [{ y: 8, rows: ['....bbbbbbbb....', '....bbebbbbb....', '....bbbbbeeb....', '....bebbbbbb....', '....bbbbbbbb....'] }],
      up: [{ y: 8, rows: ['....b......b....', '.....bbbbbb.....'] }],
      side: [{ y: 8, rows: ['.....b..........', '.........bb.....', '.........bb.....', '.........be.....', '.........bb.....'] }],
    },
  }),
};

export const GRIGORI_OPTS: GrigoriOpt[] = [GREATCOAT, TANKER, SUIT, PARKA, APRON];
