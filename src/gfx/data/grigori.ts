// Grigori, the owner's pick: Greatcoat, a size up (docs/level-8.md). A blond flat top, a cold flat brow, a long grey greatcoat belted in
// black with red collar tabs and a red star on the buckle, falling to the boots and flaring at the hem, so he reads as one tall column.
// He stands in a 24 by 24 cell like the Warden, so he looms over the party. Five fill colors (skin, blond, grey, red, charcoal) and the
// ink outline. Front and back views are written as their left half and mirrored; the side view faces right. The arms are drawn on top
// by actor_grigori.ts, with a fist of skin. Roles: s skin, h hair, e ink (brow, eyes, mouth, belt, the coat's seam), a coat, b the
// collar tabs and the buckle, p trousers, f boots (ink).
import type { LegPose, Part, View } from './types.ts';

export const GRIGORI_CELL = 24;
export const GRIGORI_PAL = { s: 'skin0', d: 'skin0', e: 'ink', h: 'yellow', a: 'grey2', b: 'red', p: 'grey1', q: 'grey1', f: 'ink' } as const;

const sym = (half: string[]): string[] => half.map((r) => r + [...r].reverse().join(''));
const flip = (rows: string[]): string[] => rows.map((r) => [...r].reverse().join(''));
const P = (y: number, rows: string[]): Part => ({ y, rows });

export interface BigArt {
  head: Record<View, Part>;
  torso: Record<View, Part>;
  legs: Record<View, Record<LegPose, Part>>;
}

const FRONT_LEGS: Record<LegPose, string[]> = {
  stand: sym(['.......pppp.', '.......pppp.', '.......pppp.', '.......ffff.']),
  stepA: ['.......pppp..pppp.......', '.......pppp..pppp.......', '.......pppp..ffff.......', '.......ffff.............'],
  stepB: flip(['.......pppp..pppp.......', '.......pppp..pppp.......', '.......pppp..ffff.......', '.......ffff.............']),
  wide: sym(['......pppp..', '......pppp..', '......pppp..', '......ffff..']),
};
const SIDE_LEGS: Record<LegPose, string[]> = {
  stand: ['........ppppppp.........', '........ppppppp.........', '........ppppppp.........', '........fffffffff.......'],
  stepA: ['.......ppppppppp........', '......pppp....pppp......', '.....pppp......pppp.....', '....ffffff....ffffff....'],
  stepB: ['........ppppppp.........', '........pppp.ppp........', '........ppp...ppp.......', '.......ffff....ffff.....'],
  wide: ['......ppppppppppp.......', '.....pppp.....pppp......', '....pppp.......pppp.....', '...ffff.........ffff....'],
};
const legs = (rows: Record<LegPose, string[]>): Record<LegPose, Part> => ({ stand: P(19, rows.stand), stepA: P(19, rows.stepA), stepB: P(19, rows.stepB), wide: P(19, rows.wide) });

export const GRIGORI_ART: BigArt = {
  head: {
    down: P(1, sym(['.......hhhhh', '.......hhhhh', '......hhhhhh', '......hheees', '.......ssess', '.......sssss', '.......sssss', '.......sssee', '........ssss'])),
    up: P(1, sym(['.......hhhhh', '.......hhhhh', '......hhhhhh', '......hhhhhh', '......hhhhhh', '......hhhhhh', '......hhhhhh', '.......hhhhh', '........ssss'])),
    side: P(1, [
      '........hhhhhh..........', '.......hhhhhhhh.........', '.......hhhhhhhhh........', '.......hhhhhsseee.......', '.......hhhhssssess......',
      '.......hhhhssssssss.....', '.......hhhhsssssss......', '........hhhsssssee......', '.........hhssssss.......',
    ]),
  },
  torso: {
    down: P(10, sym(['....aaaabbss', '.....aaaaaae', '.....aaaaaae', '.....aaaaaae', '.....eeeeeeb', '.....aaaaaae', '.....aaaaaae', '.....aaaaaae', '....aaaaaaae', '....aaaaaaae', '....aaaaaaae'])),
    up: P(10, sym(['....aaaaaaaa', '.....aaaaaaa', '.....aaaaaaa', '.....aaaaaaa', '.....eeeeeee', '.....aaaaaae', '.....aaaaaae', '.....aaaaaae', '....aaaaaaae', '....aaaaaaae', '....aaaaaaae'])),
    side: P(10, [
      '......aaaaaaabb.........', '......aaaaaaaaaaa.......', '......aaaaaaaaaaa.......', '......aaaaaaaaaaa.......', '......eeeeeeeeeeb.......', '......aaaaaaaaaaa.......',
      '......aaaaaaaaaaa.......', '......aaaaaaaaaaa.......', '.....aaaaaaaaaaaaa......', '.....aaaaaaaaaaaaa......', '.....aaaaaaaaaaaaa......',
    ]),
  },
  legs: { down: legs(FRONT_LEGS), up: legs(FRONT_LEGS), side: legs(SIDE_LEGS) },
};
