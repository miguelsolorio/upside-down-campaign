// The body Flayed Billy is drawn on (docs/level-9.md): a lean teen a size up, in a 24 by 24 cell like Grigori's, so he looms over the
// party. Skin only, with the dark veins as a separate overlay that can fade, so each design adds just a mullet, clothes and colors.
// Role letters: s skin, d skin shade, v veins, w a dead white eye, e ink (brows, mouth), h hair (and i its light), a b c cloth, m sleeve,
// p trousers (q the far leg), f shoes. Rows are written with S (segments at x) and C (centered), so no row needs counting dots.
// Pure data and pixel work: no DOM.
import type { ColorName } from '../palette.ts';
import { blitRows, hash2, mirrorRoles, outlineRoles } from '../canvas.ts';
import type { Part, View } from '../data/types.ts';

export const BC = 24;
export type Pt = [number, number];
type Segs = [number, string][];

/** A row from segments, each placed at its x. */
export const S = (...segs: Segs): string => {
  const out: string[] = [];
  for (const [x, s] of segs) { while (out.length < x) out.push('.'); for (let i = 0; i < s.length; i++) out[x + i] = s[i] as string; }
  return out.join('');
};
/** A row centered on the 24 wide cell. */
export const C = (s: string): string => S([(BC - s.length) >> 1, s]);
export const P = (y: number, ...rows: string[]): Part => ({ y, rows });

export type BLeg = 'stand' | 'stepA' | 'stepB' | 'wide' | 'kneel';
export type BArms = 'rest' | 'swingA' | 'swingB' | 'wind' | 'run' | 'grab' | 'hang' | 'limp';
export type BFace = 'dead' | 'snarl' | 'shut';
export interface BPose { legs: BLeg; arms: BArms; face: BFace; bob: number; lean: number; leanV: number; head?: Pt }

/** The pose the sheet shows, by the name the sim gives it (docs/level-9.md). */
export const BPOSES = {
  idle: { legs: 'stand', arms: 'rest', face: 'dead', bob: 0, lean: 0, leanV: 0 },
  walkA: { legs: 'stepA', arms: 'swingA', face: 'dead', bob: 1, lean: 0, leanV: 0 },
  walkB: { legs: 'stepB', arms: 'swingB', face: 'dead', bob: 1, lean: 0, leanV: 0 },
  charge: { legs: 'wide', arms: 'wind', face: 'snarl', bob: 1, lean: -2, leanV: 1, head: [-1, 1] },
  run: { legs: 'wide', arms: 'run', face: 'snarl', bob: 0, lean: 3, leanV: 1, head: [2, 1] },
  grab: { legs: 'wide', arms: 'grab', face: 'snarl', bob: 0, lean: 2, leanV: 1, head: [1, 0] },
  pinned: { legs: 'kneel', arms: 'hang', face: 'snarl', bob: 0, lean: 0, leanV: 2, head: [-1, -1] },
  freed: { legs: 'kneel', arms: 'limp', face: 'shut', bob: 0, lean: 1, leanV: 3, head: [3, 2] },
} as const satisfies Record<string, BPose>;

// ---------------------------------------------------------------- head, torso and legs, skin and trousers only
const HEAD: Record<View, Part> = {
  down: P(2, C('ssssss'), C('ssssssss'), C('ssssssssss'), C('dssssssssssd'), C('dssssssssssd'), C('ssssssssss'), C('ssssssss'), C('ssssss'), C('ssss')),
  up: P(2, C('ssssss'), C('ssssssss'), C('ssssssssss'), C('dssssssssssd'), C('dssssssssssd'), C('ssssssssss'), C('ssssssss'), C('ssssss'), C('ssss')),
  side: P(2, S([9, 'ssssss']), S([8, 'ssssssss']), S([8, 'sssssssss']), S([8, 'sddsssss'], [16, 's']), S([8, 'sddsssss'], [16, 's']), S([8, 'sddsssss'], [16, 's'], [17, 's']), S([8, 'sssssssss']), S([10, 'ssssss']), S([9, 'ssss'])),
};
const TORSO: Record<View, Part> = {
  down: P(11, C('ssssssssssss'), C('ssssssssssss'), C('ssssssssss'), C('sddssssdds'), C('ssssssssss'), C('ssssddssss'), C('ssssssssss')),
  up: P(11, C('ssssssssssss'), C('ssssssssssss'), C('sdssssssds'), C('ssssssssss'), C('sssssddsss'), C('ssssssssss'), C('ssssssssss')),
  side: P(11, S([8, 'ssssssss']), S([8, 'sssssssss']), S([8, 'sssssssss']), S([8, 'ssssssss']), S([8, 'ssssssss']), S([9, 'sssssss']), S([9, 'sssssss'])),
};

const FRONT: Record<BLeg, string[]> = {
  stand: [C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('fffff..fffff')],
  stepA: [C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('pppp..ffff'), S([6, 'fffff'])],
  stepB: [C('pppp..pppp'), C('pppp..pppp'), C('pppp..pppp'), C('ffff..pppp'), S([13, 'fffff'])],
  wide: [S([6, 'pppp'], [14, 'pppp']), S([5, 'pppp'], [15, 'pppp']), S([5, 'pppp'], [15, 'pppp']), S([4, 'pppp'], [16, 'pppp']), S([3, 'fffff'], [16, 'fffff'])],
  kneel: [],
};
const SIDE: Record<BLeg, string[]> = {
  stand: [S([9, 'ppppppp']), S([9, 'ppppppp']), S([9, 'ppppppp']), S([9, 'ppppppp']), S([9, 'ffffffff'])],
  stepA: [S([9, 'ppppppp']), S([8, 'qqqq'], [13, 'pppp']), S([7, 'qqqq'], [14, 'pppp']), S([6, 'qqqq'], [15, 'ppp']), S([4, 'ffffff'], [15, 'ffff'])],
  stepB: [S([9, 'ppppppp']), S([8, 'pppp'], [13, 'qqqq']), S([7, 'pppp'], [14, 'qqqq']), S([6, 'ppp'], [15, 'qqq']), S([4, 'ffff'], [15, 'ffffff'])],
  wide: [S([8, 'ppppppppp']), S([6, 'qqqqq'], [14, 'pppp']), S([5, 'qqqqq'], [15, 'pppp']), S([4, 'qqqq'], [16, 'pppp']), S([2, 'ffffff'], [16, 'ffff'])],
  kneel: [],
};
/** The kneel is a profile: the thigh down to the knee, the shin along the floor behind it, the sole of the foot at the end. */
const KNEEL = [S([10, 'ppppppp']), S([4, 'ff'], [6, 'qqqqq'], [11, 'pppppp']), S([4, 'fff'], [7, 'qqqq'], [11, 'ppppppp'])];

// ---------------------------------------------------------------- faces
const FACE: Record<BFace, Record<View, Part>> = {
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
type Seg = [number, number, number, number];
/** Vein paths in cell coordinates for the head and the torso. They are drawn on skin only, so clothes and hair cover them. */
const VEINS: Record<View, { head: Seg[]; torso: Seg[] }> = {
  down: {
    head: [[11, 10, 10, 8], [10, 8, 9, 6], [9, 6, 9, 4], [9, 6, 8, 5], [13, 9, 14, 7], [14, 7, 15, 5], [14, 7, 16, 7], [12, 4, 12, 3]],
    torso: [[8, 11, 11, 13], [11, 13, 11, 16], [15, 11, 13, 13], [13, 13, 14, 17], [10, 14, 9, 17], [11, 13, 9, 13]],
  },
  up: { head: [[11, 10, 10, 8], [10, 8, 9, 6], [13, 9, 14, 6]], torso: [[8, 11, 11, 14], [11, 14, 11, 17], [15, 11, 13, 14], [13, 14, 14, 17], [11, 14, 9, 16]] },
  side: { head: [[10, 10, 11, 8], [11, 8, 12, 6], [12, 6, 13, 5], [11, 8, 9, 7]], torso: [[9, 11, 11, 13], [11, 13, 12, 17], [13, 12, 14, 15], [11, 13, 9, 15]] },
};

// ---------------------------------------------------------------- arms: a path of points from the shoulder
const SHOULDER: Record<View, [Pt, Pt]> = { down: [[5, 12], [18, 12]], up: [[5, 12], [18, 12]], side: [[10, 12], [13, 12]] };
type ArmPaths = [Pt[], Pt[]];
const ARMS: Record<View, Record<BArms, ArmPaths>> = {
  down: {
    rest: [[[5, 19]], [[18, 19]]], swingA: [[[5, 18]], [[18, 20]]], swingB: [[[5, 20]], [[18, 18]]],
    wind: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]], run: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]],
    grab: [[[8, 16]], [[15, 16]]], hang: [[[5, 19]], [[18, 19]]], limp: [[[4, 20]], [[19, 20]]],
  },
  up: {
    rest: [[[5, 19]], [[18, 19]]], swingA: [[[5, 18]], [[18, 20]]], swingB: [[[5, 20]], [[18, 18]]],
    wind: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]], run: [[[3, 15], [5, 18]], [[20, 15], [18, 18]]],
    grab: [[[8, 8]], [[15, 8]]], hang: [[[5, 19]], [[18, 19]]], limp: [[[4, 20]], [[19, 20]]],
  },
  side: {
    rest: [[[10, 19]], [[13, 19]]], swingA: [[[8, 18]], [[16, 18]]], swingB: [[[14, 18]], [[10, 19]]],
    wind: [[[8, 15], [4, 16]], [[11, 16], [6, 14]]], run: [[[8, 15], [5, 17]], [[16, 15], [18, 12]]],
    grab: [[[17, 12], [20, 12]], [[18, 14], [21, 14]]], hang: [[[10, 19]], [[13, 19]]], limp: [[[10, 20]], [[13, 20]]],
  },
};

export interface BillyRig {
  /** Role to palette color, including v (veins), w (eye whites) and the design's own letters. */
  pal: Record<string, ColorName>;
  hair: Record<View, Part[]>;
  /** Clothes over the torso and anything hung on it, drawn with the torso. */
  trim: Record<View, Part[]>;
  /** The leg row (0 to 4) from which the legs are bare skin, for trunks and cutoffs. */
  bare?: number;
  /** The role the sleeves are drawn in, and how many px of the arm they cover. */
  sleeve?: { role: string; len: number };
}

const code = (c: string): number => c.charCodeAt(0);
function put(buf: Uint8Array, x: number, y: number, ch: string, over = true): void {
  if (x >= 0 && x < BC && y >= 0 && y < BC && (over || !buf[y * BC + x])) buf[y * BC + x] = code(ch);
}
const blit = (buf: Uint8Array, part: Part, dx: number, dy: number): void => { if (part.rows.length) blitRows(buf, BC, part.rows, dx, part.y + dy); };

/** Veins as pixels along segments, kept where the hash is under `keep` (1 is all of them), and only on skin. */
function veins(buf: Uint8Array, segs: Seg[], dx: number, dy: number, keep: number): void {
  for (const [x0, y0, x1, y1] of segs) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / (n || 1)) + dx, y = Math.round(y0 + ((y1 - y0) * i) / (n || 1)) + dy;
      if (hash2(x, y, 5) / 4294967296 >= keep) continue;
      if (x >= 0 && x < BC && y >= 0 && y < BC && buf[y * BC + x] === code('s')) buf[y * BC + x] = code('v');
    }
  }
}

/** One arm along its path, two px thick: sleeve first, then skin with a vein down one edge, and a fist at the end. */
function arm(buf: Uint8Array, from: Pt, path: Pt[], dx: number, dy: number, extra: number, rig: BillyRig, keep: number): void {
  const pts = [from, ...path];
  let step = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    let x = pts[k]![0] + dx, y = pts[k]![1] + dy;
    const ex = pts[k + 1]![0] + dx, ey = pts[k + 1]![1] + dy;
    const level = Math.abs(ex - x) > Math.abs(ey - y);
    const adx = Math.abs(ex - x), ady = -Math.abs(ey - y), sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = adx + ady;
    for (let i = 0; i < 40; i++) {
      const sl = rig.sleeve && step < rig.sleeve.len ? rig.sleeve.role : 's';
      const vein = sl === 's' && step % 3 === 1 && hash2(x, y, 9) / 4294967296 < keep ? 'v' : 's';
      put(buf, x, y, sl, false);
      if (extra) put(buf, x + (level ? 0 : extra), y + (level ? extra : 0), sl === 's' ? vein : sl, false);
      step++;
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= ady) { err += ady; x += sx; }
      if (e2 <= adx) { err += adx; y += sy; }
    }
  }
  const end = pts[pts.length - 1] as Pt;
  for (const [ox, oy] of [[0, 0], [extra || 1, 0], [0, 1], [extra || 1, 1]]) put(buf, end[0] + dx + (ox as number), end[1] + dy + (oy as number), 's');
}

/** A shade line on the torso along an arm laid over it, so a near arm in profile reads against the chest of the same skin. */
function edge(buf: Uint8Array, lay: Uint8Array): void {
  for (let y = 0; y < BC; y++) {
    for (let x = 0; x < BC; x++) {
      if (lay[y * BC + x] || buf[y * BC + x] !== code('s')) continue;
      if ((x > 0 && lay[y * BC + x - 1]) || (x < BC - 1 && lay[y * BC + x + 1]) || (y > 0 && lay[(y - 1) * BC + x]) || (y < BC - 1 && lay[(y + 1) * BC + x])) buf[y * BC + x] = code('d');
    }
  }
}

/** One frame of Billy as role letters, facing right when the view is 'side'. `keep` is the share of his veins still showing, 1 to 0. */
export function composeBilly(rig: BillyRig, view: View, pose: BPose, keep = 1): Uint8Array {
  const buf = new Uint8Array(BC * BC);
  const dx = view === 'side' ? pose.lean : 0, dy = pose.bob + pose.leanV;
  const hx = dx + (pose.head?.[0] ?? 0), hy = dy + (pose.head?.[1] ?? 0);
  const [a0, a1] = ARMS[view][pose.arms], [s0, s1] = SHOULDER[view];
  const legs = view === 'side' ? SIDE : FRONT;
  const rows = pose.legs === 'kneel' ? KNEEL.map((r) => (rig.bare !== undefined ? r.replace(/q/g, 's') : r)) : legs[pose.legs].map((r, i) => (rig.bare !== undefined && i >= rig.bare ? r.replace(/[pq]/g, 's') : r));
  if (view === 'side') arm(buf, s0, a0, dx, dy, 0, rig, keep);
  blit(buf, P(pose.legs === 'kneel' ? 20 : 18, ...rows), 0, 0);
  blit(buf, TORSO[view], dx, dy);
  veins(buf, VEINS[view].torso, dx, dy, keep);
  for (const t of rig.trim[view]) blit(buf, t, dx, dy);
  if (view === 'side') {
    const lay = new Uint8Array(BC * BC);
    arm(lay, s1, a1, dx, dy, 1, rig, keep);
    edge(buf, lay);
    for (let i = 0; i < lay.length; i++) if (lay[i]) buf[i] = lay[i] as number;
  } else { arm(buf, s0, a0, dx, dy, -1, rig, keep); arm(buf, s1, a1, dx, dy, 1, rig, keep); }
  blit(buf, HEAD[view], hx, hy);
  veins(buf, VEINS[view].head, hx, hy, keep);
  blit(buf, FACE[pose.face][view], hx, hy);
  for (const h of rig.hair[view]) blit(buf, h, hx, hy);
  outlineRoles(buf, BC, BC, code('k'));
  return buf;
}

/** A side frame turned to face left. */
export const mirror = (buf: Uint8Array): Uint8Array => mirrorRoles(buf, BC, BC);
