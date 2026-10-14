// The riot guard (16 by 16 cell) and the warden (24 by 24): head, torso and legs as ASCII, drawn the way the agent is.
// Front and back views are written as their left half and mirrored; the side view faces right and is flipped for left.
// The arms, the clear riot shield and the baton are drawn on top by actor_foes.ts.
// Roles: n armor dark, N armor, h armor lit, v visor glass, c visor glint, e warden eyes, p boots, g gloves,
//   r trim band (red on an elite), R trim spike (hot on an elite), x crest (hot on an elite),
//   s shield frame, S shield lit edge, d shield glint, y the warden's hazard stripe on its shield, b baton, B baton tip, k outline.
import type { LegPose, Part, View } from './types.ts';

export interface FoeArt {
  cell: number;
  head: Record<View, Part>;
  torso: Record<View, Part>;
  legs: Record<View, Record<LegPose, Part>>;
}

const sym = (half: string[]): string[] => half.map((r) => r + [...r].reverse().join(''));
const flip = (rows: string[]): string[] => rows.map((r) => [...r].reverse().join(''));
const P = (y: number, rows: string[]): Part => ({ y, rows });

export const PALS = {
  guard: { n: 'shadow', N: 'dusk', h: 'slate', v: 'teal0', c: 'cyan', e: 'hot', p: 'grey1', g: 'grey2', s: 'sky', S: 'white', d: 'cyan', b: 'grey3', B: 'white' },
  warden: { n: 'night', N: 'shadow', h: 'dusk', v: 'ink', c: 'cyan', e: 'hot', p: 'grey1', g: 'grey2', s: 'sky', S: 'white', d: 'cyan', b: 'grey3', B: 'white', y: 'amber' },
} as const;
/** What the trim roles are on a normal foe and on an elite one. */
export const TRIM = {
  guard: { normal: { r: 'slate', R: 'mist', x: 'slate' }, elite: { r: 'red', R: 'hot', x: 'hot' } },
  warden: { normal: { r: 'slate', R: 'grey3', x: 'grey2' }, elite: { r: 'red', R: 'hot', x: 'hot' } },
} as const;

// ---------------------------------------------------------------- guard
const G_LEGS_SIDE: Record<LegPose, string[]> = {
  stand: ['.....NNNNN......', '.....NNNNN......', '.....nnnnn......', '.....pppppp.....'],
  stepA: ['.....NNNNN......', '....NN...NN.....', '...nn.....nn....', '..ppp.....ppp...'],
  stepB: ['.....NNNNN......', '.....NN..NN.....', '....nn....nn....', '...ppp....ppp...'],
  wide: ['....NNNNNNN.....', '...NN.....NN....', '..nn.......nn...', '.ppp.......ppp..'],
};
const G_LEGS_FRONT: Record<LegPose, string[]> = {
  stand: sym(['....NNN.', '....NNN.', '....nnn.', '....ppp.']),
  stepA: ['....NNN..NNN....', '....NNN..ppp....', '....nnn.........', '....ppp.........'],
  stepB: ['....NNN..NNN....', '....ppp..NNN....', '.........nnn....', '.........ppp....'],
  wide: sym(['...NNN..', '...NNN..', '...nnn..', '...ppp..']),
};

export const GUARD_ART: FoeArt = {
  cell: 16,
  head: {
    down: P(1, sym(['.....nnn', '....nNNN', '....rrrr', '....nvvv', '....nvcv', '.....nnn'])),
    up: P(1, sym(['.....nnn', '....nNNN', '....rrrr', '....nNNN', '....nNNh', '.....nnn'])),
    side: P(1, ['.....nnnnn......', '....nNNNNNn.....', '....rrrrrrr.....', '....nNNNvcvn....', '....nNNNvvvn....', '.....nnnnnn.....']),
  },
  torso: {
    down: P(7, sym(['...RhNNN', '...hNNNh', '....NNNn', '....rrrr'])),
    up: P(7, sym(['...RhNNN', '...hNNnn', '....NNnh', '....rrrr'])),
    side: P(7, ['....hNNNNNh.....', '...RhNNNNNN.....', '....NNNnNNN.....', '....rrrrrrr.....']),
  },
  legs: {
    down: Object.fromEntries(Object.entries(G_LEGS_FRONT).map(([k, v]) => [k, P(11, v)])) as Record<LegPose, Part>,
    up: Object.fromEntries(Object.entries(G_LEGS_FRONT).map(([k, v]) => [k, P(11, v)])) as Record<LegPose, Part>,
    side: Object.fromEntries(Object.entries(G_LEGS_SIDE).map(([k, v]) => [k, P(11, v)])) as Record<LegPose, Part>,
  },
};

// ---------------------------------------------------------------- warden
const W_LEGS_SIDE: Record<LegPose, string[]> = {
  stand: ['.......NNNNNNN..........', '.......NNNNNNN..........', '.......nnnnnnn..........', '.......nnnnnnn..........', '......ppppppppp.........', '......ppppppppp.........'],
  stepA: ['.......NNNNNNN..........', '......NNN...NNN.........', '.....nnn.....nnn........', '.....nnn.....pppp.......', '....pppp................', '....pppp................'],
  stepB: ['.......NNNNNNN..........', '.......NNN...NNN........', '......nnn.....nnn.......', '......pppp....nnn.......', '...............pppp.....', '...............pppp.....'],
  wide: ['......NNNNNNNNN.........', '.....NNN.......NNN......', '....nnn.........nnn.....', '....nnn.........nnn.....', '...pppp.........pppp....', '...pppp.........pppp....'],
};
const W_STAND_FRONT = sym(['......NNNNN.', '......NNNNN.', '......nnnnn.', '......nnnnn.', '.....pppppp.', '.....pppppp.']);
const W_STEP_A = ['......NNNNN..NNNNN......', '......NNNNN..NNNNN......', '......nnnnn..pppppp.....', '......nnnnn.............', '.....pppppp.............', '.....pppppp.............'];
const W_LEGS_FRONT: Record<LegPose, string[]> = {
  stand: W_STAND_FRONT,
  stepA: W_STEP_A,
  stepB: flip(W_STEP_A),
  wide: sym(['....NNNNN...', '....NNNNN...', '....nnnnn...', '....nnnnn...', '...ppppp....', '...ppppp....'].map((r) => r.padEnd(12, '.'))),
};

export const WARDEN_ART: FoeArt = {
  cell: 24,
  head: {
    down: P(1, sym(['.........xxx', '......nnnxxx', '.....nNNNxxx', '.....rrrrrrr', '.....nvvvvvv', '.....nvvveee', '.....nnNNNNN', '......nnnnnn'])),
    up: P(1, sym(['.........xxx', '......nnnxxx', '.....nNNNxxx', '.....rrrrrrr', '.....nNNNNNN', '.....nNNhNNN', '.....nnNNNNN', '......nnnnnn'])),
    side: P(1, ['.....xxxxxx.............', '.....xxxxxnnnn..........', '......nnNNNNNNn.........', '......rrrrrrrrr.........', '......nNNNvvvvvn........', '......nNNNveeeen........', '......nnNNNNNNn.........', '.......nnnnnnn..........']),
  },
  torso: {
    down: P(8, sym(['..R.........', '..RRhhNNNNNN', '..RhhhNNNNNN', '...hNNNNNnnN', '....NNNNnnnn', '....NNNNnrrr', '....rrrrrrrr', '....nNNNNNNN', '....nnNNNNNN'])),
    up: P(8, sym(['..R.........', '..RRhhNNNNNN', '..RhhhNNNNNN', '...hNNNnnnnn', '....NNnhhhhh', '....NNnnnnnn', '....rrrrrrrr', '....nNNNNNNN', '....nnNNNNNN'])),
    side: P(8, ['.....R..................', '.....RRhhNNNNNN.........', '.....RhhhNNNNNNN........', '......hNNNNNnnNN........', '......NNNNnnnnNN........', '......NNNNnrrrNN........', '......rrrrrrrrrr........', '......nNNNNNNNNN........', '......nnNNNNNNNN........']),
  },
  legs: {
    down: Object.fromEntries(Object.entries(W_LEGS_FRONT).map(([k, v]) => [k, P(17, v)])) as Record<LegPose, Part>,
    up: Object.fromEntries(Object.entries(W_LEGS_FRONT).map(([k, v]) => [k, P(17, v)])) as Record<LegPose, Part>,
    side: Object.fromEntries(Object.entries(W_LEGS_SIDE).map(([k, v]) => [k, P(17, v)])) as Record<LegPose, Part>,
  },
};
