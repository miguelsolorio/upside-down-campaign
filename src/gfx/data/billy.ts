// Flayed Billy, the owner's pick: Lifeguard (docs/level-9.md), the boy Billy Hargrove was in 1985 with the lifeguard's tan gone to ash,
// dark veins over pale skin and dead white eyes, on a lean teen body a size up in a 24 by 24 cell like Grigori's, so he looms over the
// party. Bare chest, red lifeguard trunks with a white drawstring, the whistle still on its cord, bare feet, and a sun bleached mullet,
// wet and swept back. The body is skin only and the veins are a layer of their own that can fade (actor_billy.ts composes it), so the
// kneel can show them going as Eleven reaches him. Role letters: s skin, d skin shade, v veins, w a dead white eye, e ink (brows, mouth),
// h hair (and i its light), b the drawstring and the whistle, c the whistle's cord, p trunks (q the far leg), f feet. Rows are written
// with S (segments at x) and C (centered), so no row needs counting dots. Pure data: no DOM.
import type { ColorName } from '../palette.ts';
import type { Part, View } from './types.ts';

export const BILLY_CELL = 24;
export type Pt = [number, number];
type Segs = [number, string][];

/** A row from segments, each placed at its x. */
export const S = (...segs: Segs): string => {
  const out: string[] = [];
  for (const [x, s] of segs) { while (out.length < x) out.push('.'); for (let i = 0; i < s.length; i++) out[x + i] = s[i] as string; }
  return out.join('');
};
/** A row centered on the 24 wide cell. */
export const C = (s: string): string => S([(BILLY_CELL - s.length) >> 1, s]);
export const P = (y: number, ...rows: string[]): Part => ({ y, rows });

export type BLeg = 'stand' | 'stepA' | 'stepB' | 'wide' | 'kneel';
export type BArms = 'rest' | 'swingA' | 'swingB' | 'wind' | 'jab' | 'run' | 'grab' | 'hang' | 'limp';
export type BFace = 'dead' | 'snarl' | 'shut';
export interface BPose { legs: BLeg; arms: BArms; face: BFace; bob: number; lean: number; leanV: number; head?: Pt }

const B = (legs: BLeg, arms: BArms, face: BFace, bob: number, lean: number, leanV: number, head?: Pt): BPose => ({ legs, arms, face, bob, lean, leanV, ...(head ? { head } : {}) });

/** The poses, by the name the picker in actor_billy.ts gives them. The charge's wind-up and run, the grab's reach and hold, the jab's wind-up and blow, the stun's two sways, the kneel and the free man. */
export const BPOSES = {
  idle: B('stand', 'rest', 'dead', 0, 0, 0), idleB: B('stand', 'rest', 'dead', 1, 0, 0),
  walkA: B('stepA', 'swingA', 'dead', 1, 0, 0), walkB: B('stepB', 'swingB', 'dead', 1, 0, 0),
  jabWind: B('wide', 'wind', 'snarl', 1, -1, 0, [-1, 0]), jab: B('wide', 'jab', 'snarl', 0, 2, 1, [1, 0]),
  charge: B('wide', 'wind', 'snarl', 1, -2, 1, [-1, 1]), run: B('wide', 'run', 'snarl', 0, 3, 1, [2, 1]),
  grab: B('wide', 'grab', 'snarl', 0, 2, 1, [1, 0]), hold: B('wide', 'grab', 'snarl', 1, 2, 1, [1, 1]),
  stunA: B('stand', 'limp', 'dead', 2, -1, 2, [-1, 2]), stunB: B('stand', 'limp', 'dead', 2, 1, 2, [1, 2]),
  hurt: B('stand', 'limp', 'snarl', 0, -1, 0, [-1, -1]),
  pinned: B('kneel', 'hang', 'snarl', 0, 0, 2, [-1, -1]), freed: B('kneel', 'limp', 'shut', 0, 1, 3, [3, 2]),
} as const satisfies Record<string, BPose>;
export type BPoseName = keyof typeof BPOSES;

// ---------------------------------------------------------------- head, torso and legs, skin and trunks only
export const HEAD: Record<View, Part> = {
  down: P(2, C('ssssss'), C('ssssssss'), C('ssssssssss'), C('dssssssssssd'), C('dssssssssssd'), C('ssssssssss'), C('ssssssss'), C('ssssss'), C('ssss')),
  up: P(2, C('ssssss'), C('ssssssss'), C('ssssssssss'), C('dssssssssssd'), C('dssssssssssd'), C('ssssssssss'), C('ssssssss'), C('ssssss'), C('ssss')),
  side: P(2, S([9, 'ssssss']), S([8, 'ssssssss']), S([8, 'sssssssss']), S([8, 'sddsssss'], [16, 's']), S([8, 'sddsssss'], [16, 's']), S([8, 'sddsssss'], [16, 's'], [17, 's']), S([8, 'sssssssss']), S([10, 'ssssss']), S([9, 'ssss'])),
};
export const TORSO: Record<View, Part> = {
  down: P(11, C('ssssssssssss'), C('ssssssssssss'), C('ssssssssss'), C('sddssssdds'), C('ssssssssss'), C('ssssddssss'), C('ssssssssss')),
  up: P(11, C('ssssssssssss'), C('ssssssssssss'), C('sdssssssds'), C('ssssssssss'), C('sssssddsss'), C('ssssssssss'), C('ssssssssss')),
  side: P(11, S([8, 'ssssssss']), S([8, 'sssssssss']), S([8, 'sssssssss']), S([8, 'ssssssss']), S([8, 'ssssssss']), S([9, 'sssssss']), S([9, 'sssssss'])),
};
/** The trunks over the hips and the whistle on its cord, white drawstring at the waist. */
export const TRIM: Record<View, Part[]> = {
  down: [P(11, S([8, 'c'], [15, 'c']), S([9, 'c'], [14, 'c']), S([10, 'c'], [13, 'c']), S([11, 'cc']), S([11, 'bb'])), P(17, C('bbbbbbbbbb'))],
  up: [P(11, S([10, 'cccc'])), P(17, C('bbbbbbbbbb'))],
  side: [P(11, S([10, 'c']), S([11, 'c']), S([12, 'c']), S([13, 'cc'])), P(17, S([9, 'bbbbbbb']))],
};

export const LEGS_FRONT: Record<Exclude<BLeg, 'kneel'>, string[]> = {
  stand: [C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('fffff..fffff')],
  stepA: [C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('pppp..ffff'), S([6, 'fffff'])],
  stepB: [C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('ffff..pppp'), S([13, 'fffff'])],
  wide: [S([6, 'pppp'], [14, 'pppp']), S([5, 'pppp'], [15, 'pppp']), S([5, 'pppp'], [15, 'pppp']), S([4, 'pppp'], [16, 'pppp']), S([3, 'fffff'], [16, 'fffff'])],
};
export const LEGS_SIDE: Record<Exclude<BLeg, 'kneel'>, string[]> = {
  stand: [S([9, 'ppppppp']), S([9, 'ppppppp']), S([9, 'ppppppp']), S([9, 'ppppppp']), S([9, 'ffffffff'])],
  stepA: [S([9, 'ppppppp']), S([8, 'qqqq'], [13, 'pppp']), S([7, 'qqqq'], [14, 'pppp']), S([6, 'qqqq'], [15, 'ppp']), S([4, 'ffffff'], [15, 'ffff'])],
  stepB: [S([9, 'ppppppp']), S([8, 'pppp'], [13, 'qqqq']), S([7, 'pppp'], [14, 'qqqq']), S([6, 'ppp'], [15, 'qqq']), S([4, 'ffff'], [15, 'ffffff'])],
  wide: [S([8, 'ppppppppp']), S([6, 'qqqqq'], [14, 'pppp']), S([5, 'qqqqq'], [15, 'pppp']), S([4, 'qqqq'], [16, 'pppp']), S([2, 'ffffff'], [16, 'ffff'])],
};
/**
 * The kneel: from the side the thigh goes down to the knee and the shin lies along the floor behind it, the sole of the foot at the end.
 * From the front both knees are on the floor, from behind the soles of the feet show. KNEEL_AT is the row the legs start on and KNEEL_DROP
 * how far the rest of him goes down for it: a front or back view is lowered farther, since the legs are folded away from the viewer.
 */
export const KNEEL: Record<View, string[]> = {
  side: [S([10, 'ppppppp']), S([4, 'ff'], [6, 'qqqqq'], [11, 'pppppp']), S([4, 'fff'], [7, 'qqqq'], [11, 'ppppppp'])],
  down: [C('pppp..pppp'), C('pppp..pppp')],
  up: [C('pppp..pppp'), C('ffff..ffff')],
};
export const KNEEL_AT: Record<View, number> = { side: 20, down: 21, up: 21 };
export const KNEEL_DROP: Record<View, number> = { side: 0, down: 3, up: 3 };

// ---------------------------------------------------------------- faces
export const FACE: Record<BFace, Record<View, Part>> = {
  dead: {
    down: P(5, S([8, 'eee'], [13, 'eee']), S([8, 'e'], [9, 'ww'], [13, 'ww'], [15, 'e']), S([8, 'e'], [9, 'ww'], [11, 'dd'], [13, 'ww'], [15, 'e']), S([9, 'v'], [10, 'eeee'], [14, 'v'])),
    up: P(0), side: P(5, S([13, 'eeee']), S([13, 'e'], [14, 'ww']), S([13, 'e'], [14, 'ww']), S([14, 'ee'])),
  },
  snarl: {
    down: P(5, S([8, 'eee'], [13, 'eee']), S([8, 'e'], [9, 'ww'], [13, 'ww'], [15, 'e']), S([8, 'e'], [9, 'ww'], [11, 'dd'], [13, 'ww'], [15, 'e']), S([9, 'ewwwwe']), S([10, 'eeee'])),
    up: P(0), side: P(5, S([13, 'eeee']), S([13, 'e'], [14, 'ww']), S([13, 'e'], [14, 'ww']), S([13, 'ewwe']), S([14, 'ee'])),
  },
  shut: {
    down: P(6, S([9, 'ee'], [13, 'ee']), S([9, 'dd'], [13, 'dd']), S([11, 'ee'])),
    up: P(0), side: P(6, S([14, 'ee']), S([14, 'd']), S([15, 'e'])),
  },
};

// ---------------------------------------------------------------- veins
export type Seg = [number, number, number, number];
/** Vein paths in cell coordinates for the head and the torso. They are drawn on skin only, so the trunks and the hair cover them. */
export const VEINS: Record<View, { head: Seg[]; torso: Seg[] }> = {
  down: {
    head: [[11, 10, 10, 8], [10, 8, 9, 6], [9, 6, 9, 4], [9, 6, 8, 5], [13, 9, 14, 7], [14, 7, 15, 5], [14, 7, 16, 7], [12, 4, 12, 3]],
    torso: [[8, 11, 11, 13], [11, 13, 11, 16], [15, 11, 13, 13], [13, 13, 14, 17], [10, 14, 9, 17], [11, 13, 9, 13]],
  },
  up: { head: [[11, 10, 10, 8], [10, 8, 9, 6], [13, 9, 14, 6]], torso: [[8, 11, 11, 14], [11, 14, 11, 17], [15, 11, 13, 14], [13, 14, 14, 17], [11, 14, 9, 16]] },
  side: { head: [[10, 10, 11, 8], [11, 8, 12, 6], [12, 6, 13, 5], [11, 8, 9, 7]], torso: [[9, 11, 11, 13], [11, 13, 12, 17], [13, 12, 14, 15], [11, 13, 9, 15]] },
};

// ---------------------------------------------------------------- arms: a path of points from the shoulder
export const SHOULDER: Record<View, [Pt, Pt]> = { down: [[5, 12], [18, 12]], up: [[5, 12], [18, 12]], side: [[10, 12], [13, 12]] };
export type ArmPaths = [Pt[], Pt[]];
export const ARMS: Record<View, Record<BArms, ArmPaths>> = {
  down: {
    rest: [[[5, 19]], [[18, 19]]], swingA: [[[5, 18]], [[18, 20]]], swingB: [[[5, 20]], [[18, 18]]],
    wind: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]], run: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]], jab: [[[3, 15], [5, 18]], [[16, 14], [13, 16]]],
    grab: [[[8, 16]], [[15, 16]]], hang: [[[5, 19]], [[18, 19]]], limp: [[[4, 20]], [[19, 20]]],
  },
  up: {
    rest: [[[5, 19]], [[18, 19]]], swingA: [[[5, 18]], [[18, 20]]], swingB: [[[5, 20]], [[18, 18]]],
    wind: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]], run: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]], jab: [[[3, 15], [5, 18]], [[17, 10], [15, 8]]],
    grab: [[[8, 8]], [[15, 8]]], hang: [[[5, 19]], [[18, 19]]], limp: [[[4, 20]], [[19, 20]]],
  },
  side: {
    rest: [[[10, 19]], [[13, 19]]], swingA: [[[8, 18]], [[16, 18]]], swingB: [[[14, 18]], [[10, 19]]],
    wind: [[[8, 15], [4, 16]], [[11, 16], [6, 14]]], run: [[[8, 15], [5, 17]], [[16, 15], [18, 12]]], jab: [[[8, 15], [4, 16]], [[18, 12], [22, 12]]],
    grab: [[[17, 12], [20, 12]], [[18, 14], [21, 14]]], hang: [[[10, 19]], [[13, 19]]], limp: [[[10, 20]], [[13, 20]]],
  },
};

// ---------------------------------------------------------------- the mullet
/** The front of the mullet: slicked and wet, the brows and the eyes clear, long behind. */
const FRONT: string[] = [S([9, 'hhhhhh']), S([7, 'hhhhhhhhhh']), S([6, 'hhhhihhhhhhh']), S([6, 'hhhhh'], [13, 'hhhhh']), S([6, 'hh'], [16, 'hh']), S([6, 'h'], [17, 'h']), S([6, 'h'], [17, 'h'])];
/** From behind, a mullet is a short mound that flares into a wedge down the neck, its tips feathered. */
const BACK: string[] = [S([9, 'hhhhhh']), S([8, 'hhihhhhh']), S([7, 'hhhhhhihhh']), S([6, 'hhhhhihhhhhh']), S([6, 'hhhhhhhhhhhh']), S([6, 'hhihhhhhhihh']), S([6, 'hhhhhhhhhhhh']), S([6, 'hhhhhhhihhhh']), S([5, 'hhhhhhhhhhhhhh']), S([5, 'hhhhihhhhhhhhh']), S([5, 'hhhhhhhhhhhhhh']), S([7, 'hhhhhhhhhh'])];
const SIDE_HAIR: string[] = [S([9, 'hhhhhh']), S([7, 'hhhhhihhhhh']), S([6, 'hhhhhhhhhhh']), S([6, 'hhhhhhhhhh'], [15, 'hh']), S([5, 'hhhh']), S([4, 'hhhhh']), S([4, 'hhhh']), S([4, 'hhh']), S([5, 'hhh']), S([5, 'hh']), S([6, 'hh']), S([7, 'h'])];
export const HAIR: Record<View, Part[]> = { down: [P(1, ...FRONT)], up: [P(1, ...BACK)], side: [P(1, ...SIDE_HAIR)] };

/** The colors: ash skin, red trunks, a white drawstring, a pale yellow whistle, bare feet. `v` is the veins. */
export const BILLY_PAL: Record<string, ColorName> = { s: 'bone', d: 'grey3', v: 'purple0', w: 'white', e: 'ink', h: 'yellow', i: 'cream', b: 'white', c: 'red', p: 'red', q: 'blood1', f: 'bone' };
/** The skin he gets back, a summer's tan, and its shade. */
export const BILLY_TAN: ColorName = 'skin1';
