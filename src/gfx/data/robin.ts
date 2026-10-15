// Robin, the owner's pick: Sailor. The Scoops Ahoy uniform as the shop sells it: a white dixie cup cap, a navy square collar over a
// white middy, a pink tie, navy slacks, short blond hair. A teen, so the adult body. Five fill colors (skin, yellow, white, navy,
// pink) and the ink outline. Rows are 16 wide. Roles: h hair and the wafer cone, a the cap and the middy, b the collar and the cap
// band, t the tie and the scoop, p slacks. The scoop is a stamp on the front hand (CharSpec.held): the arm carries it up at rest
// and in the wind-up, and the hand is empty once it is thrown. Cast (Word vomit) is both hands up and no scoop.
import type { CharSpec, Held, Pt, Stamp } from './types.ts';

const at = (rows: string[], ox: number, oy: number): Stamp => ({ rows, ox, oy });
const SCOOP = [at(['.t.', 'ttt', 'ttt', 'hhh', '.h.'], -1, -5)];
const same = (st: Stamp[]): Held => ({ down: st, up: st, side: st });
const raised = (x: number, y: number): Record<'rest' | 'swingA' | 'swingB', Pt> => ({ rest: [x, y], swingA: [x, y + 1], swingB: [x, y - 1] });

export const ROBIN: CharSpec = {
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
  held: same(SCOOP),
  // The toss lets go of it, and Word vomit has both hands up and nothing in them.
  heldBy: { strike: same([]), raise: same([]), thrust: same([]) },
  // An underhand lob: the arm swings back and low in profile, and up beside her head from the front.
  near: { down: raised(13, 8), up: raised(13, 8), side: { ...raised(13, 9), windup: [3, 10] } },
};
