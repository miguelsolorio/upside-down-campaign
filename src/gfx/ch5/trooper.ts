// The trooper (docs/chapter-5.md, stage 5.1): an army rifleman in olive fatigues, a domed helmet with a sand band, webbing, a rifle and a
// clear riot shield, in a 16 by 16 cell like the heroes. He is written the way the riot guard and Grigori are (actor_foes.ts,
// actor_grigori.ts): head, torso and legs as ASCII parts, then the arms, the rifle and the shield drawn on top from a rig per stance, and
// composeTrooper hands back a role buffer with the ink outline in. Poses: idle, walk (two frames), aim, burst (two flashes), shield
// (blocking), flank (turning, torso and legs not facing the same way), hurt and ko. Front and back are written whole; the side view
// faces right and `trooperPx` mirrors it for left. The later build decides which pose the sim's state asks for. Pure: no DOM.
import type { LegPose, Part, View } from '../data/types.ts';
import type { ColorName } from '../palette.ts';
import type { Dir, Pt, Rect } from './troop_kit.ts';
import { R, faced, fit, flash, fill, outline, over, put, rotate, rows, settle, shieldLayer, stroke, toPx } from './troop_kit.ts';
import type { Px } from '../px.ts';

export const TROOPER_CELL = 16;
const C = TROOPER_CELL;

/** Role letters to palette colors. H helmet, L its lit spot, q sand band, s skin, e eyes, o fatigues, O lit, n shade, w webbing, m trousers, f boots,
 * g hands, r rifle, R its lit tip, T stock, W V d the shield (lit edge, shaded edge, glint), F G muzzle flash (flame, core), a speed tick. */
export const TROOPER_PAL: Record<string, ColorName> = {
  H: 'pine1', L: 'pine2', q: 'sand', s: 'skin0', e: 'ink', o: 'pine2', O: 'pine3', n: 'pine1', w: 'soil2', m: 'pine1', f: 'soil1', g: 'skin0',
  r: 'grey2', R: 'grey3', T: 'soil2', W: 'white', V: 'sky', d: 'cyan', F: 'yellow', G: 'white', a: 'grey3',
};

const P = (y: number, list: string[]): Part => ({ y, rows: list });

// ---------------------------------------------------------------- the parts
const HEAD: Record<View, Part> = {
  down: P(1, [R(5, 'HHHHHH'), R(4, 'HLHHHHHH'), R(4, 'qqqqqqqq'), R(4, 'HsessesH'), R(4, 'HssssssH'), R(5, 'nssssn')]),
  up: P(1, [R(5, 'HHHHHH'), R(4, 'HLHHHHHH'), R(4, 'qqqqqqqq'), R(4, 'HHHHHHHH'), R(4, 'HHHHHHHH'), R(5, 'HssssH')]),
  side: P(1, [R(4, 'HHHHHH'), R(3, 'HLHHHHHH'), R(3, 'qqqqqqqqq'), R(3, 'HHHHHsess'), R(3, 'HHHHHsss'), R(4, 'HHHnsss')]),
};
const TORSO: Record<View, Part> = {
  down: P(7, [R(3, 'OoooooooOn'), R(4, 'owoooowo'), R(4, 'oowoowoo'), R(4, 'wwwwwwww')]),
  up: P(7, [R(3, 'OoooooooOn'), R(4, 'ooTTTToo'), R(4, 'ooTwwToo'), R(4, 'wwwwwwww')]),
  side: P(7, [R(3, 'TOoooooon'), R(3, 'TToowoon'), R(3, 'TToooown'), R(4, 'wwwwwww')]),
};
const FRONT_LEGS: Record<LegPose, string[]> = {
  stand: [R(4, 'mmm..mmm'), R(4, 'mmm..mmm'), R(4, 'mmm..mmm'), R(4, 'fff..fff')],
  stepA: [R(4, 'mmm..mmm'), R(4, 'mmm..mmm'), R(4, 'mmm..fff'), R(4, 'fff')],
  stepB: [R(4, 'mmm..mmm'), R(4, 'mmm..mmm'), R(4, 'fff..mmm'), R(9, 'fff')],
  wide: [R(3, 'mmm....mmm'), R(3, 'mmm....mmm'), R(3, 'mmm....mmm'), R(3, 'fff....fff')],
};
const SIDE_LEGS: Record<LegPose, string[]> = {
  stand: [R(5, 'mmmmm'), R(5, 'mmmmm'), R(5, 'mmmmm'), R(5, 'ffffff')],
  stepA: [R(5, 'mmmmm'), R(4, 'mm...mm'), R(3, 'mm.....mm'), R(2, 'fff.....fff')],
  stepB: [R(5, 'mmmmm'), R(5, 'mm.mm'), R(5, 'mm..mm'), R(4, 'fff..fff')],
  wide: [R(4, 'mmmmmmm'), R(3, 'mm.....mm'), R(2, 'mm.......mm'), R(1, 'fff.......fff')],
};
const LEGS: Record<View, Record<LegPose, Part>> = {
  down: { stand: P(11, FRONT_LEGS.stand), stepA: P(11, FRONT_LEGS.stepA), stepB: P(11, FRONT_LEGS.stepB), wide: P(11, FRONT_LEGS.wide) },
  up: { stand: P(11, FRONT_LEGS.stand), stepA: P(11, FRONT_LEGS.stepA), stepB: P(11, FRONT_LEGS.stepB), wide: P(11, FRONT_LEGS.wide) },
  side: { stand: P(11, SIDE_LEGS.stand), stepA: P(11, SIDE_LEGS.stepA), stepB: P(11, SIDE_LEGS.stepB), wide: P(11, SIDE_LEGS.wide) },
};

// ---------------------------------------------------------------- poses and rigs
export type TrooperPose = 'idle' | 'walk' | 'aim' | 'burst' | 'shield' | 'flank' | 'hurt' | 'ko';
type Stance = 'carry' | 'aim' | 'block' | 'flank' | 'hurt';
interface Step { stance: Stance; legs: LegPose; bob: number; lean: number; boom?: number; turn?: boolean }
const S = (stance: Stance, legs: LegPose, bob = 0, lean = 0, extra: Partial<Step> = {}): Step => ({ stance, legs, bob, lean, ...extra });

/** The frames of each pose. boom is the size of the muzzle flash, turn shows the torso the other way. */
export const TROOPER_POSES: Record<TrooperPose, Step[]> = {
  idle: [S('carry', 'stand'), S('carry', 'stand', 1)],
  walk: [S('carry', 'stepA', 1), S('carry', 'stepB', 1)],
  aim: [S('aim', 'stand')],
  burst: [S('aim', 'wide', 0, -1, { boom: 2 }), S('aim', 'stand', 0, 0, { boom: 1 })],
  shield: [S('block', 'wide', 1, 1)],
  flank: [S('flank', 'stepA', 1, 0, { turn: true }), S('flank', 'stepB', 1)],
  hurt: [S('hurt', 'stand', 0, -1)],
  ko: [S('hurt', 'stand')],
};

interface Rig {
  /** Shoulders of the arm that holds the rifle and of the one that holds the shield. */
  hands: [Pt, Pt];
  gun: [Pt, Pt] | null;
  shield: { r: Rect; front: boolean };
}
const SHOULDERS: Record<View, [Pt, Pt]> = { down: [[4, 8], [11, 8]], up: [[4, 8], [11, 8]], side: [[7, 8], [8, 8]] };

const RIGS: Record<View, Record<Stance, Rig>> = {
  side: {
    carry: { hands: [[8, 10], [10, 9]], gun: [[5, 10], [12, 12]], shield: { r: { x: 10, y: 5, w: 5, h: 10 }, front: true } },
    aim: { hands: [[7, 8], [10, 9]], gun: [[5, 8], [11, 8]], shield: { r: { x: 4, y: 10, w: 4, h: 5 }, front: true } },
    block: { hands: [[8, 10], [11, 9]], gun: [[5, 11], [9, 12]], shield: { r: { x: 9, y: 2, w: 6, h: 13 }, front: true } },
    flank: { hands: [[8, 10], [11, 9]], gun: [[5, 10], [11, 11]], shield: { r: { x: 11, y: 5, w: 4, h: 10 }, front: true } },
    hurt: { hands: [[9, 6], [4, 6]], gun: [[9, 7], [13, 3]], shield: { r: { x: 10, y: 9, w: 4, h: 6 }, front: true } },
  },
  down: {
    carry: { hands: [[12, 10], [4, 10]], gun: [[12, 9], [10, 12]], shield: { r: { x: 3, y: 6, w: 8, h: 9 }, front: true } },
    aim: { hands: [[8, 10], [10, 9]], gun: [[11, 8], [5, 13]], shield: { r: { x: 12, y: 8, w: 3, h: 7 }, front: true } },
    block: { hands: [[12, 10], [3, 9]], gun: null, shield: { r: { x: 2, y: 5, w: 12, h: 9 }, front: true } },
    flank: { hands: [[12, 10], [3, 9]], gun: [[12, 9], [10, 12]], shield: { r: { x: 1, y: 6, w: 6, h: 9 }, front: true } },
    hurt: { hands: [[1, 6], [14, 6]], gun: [[13, 8], [14, 3]], shield: { r: { x: 1, y: 9, w: 3, h: 6 }, front: true } },
  },
  up: {
    carry: { hands: [[12, 10], [4, 10]], gun: [[12, 10], [11, 7]], shield: { r: { x: 3, y: 4, w: 8, h: 9 }, front: false } },
    aim: { hands: [[8, 8], [11, 8]], gun: [[10, 8], [10, 2]], shield: { r: { x: 1, y: 8, w: 3, h: 7 }, front: true } },
    block: { hands: [[12, 9], [3, 9]], gun: null, shield: { r: { x: 2, y: 2, w: 12, h: 11 }, front: false } },
    flank: { hands: [[12, 10], [3, 9]], gun: [[12, 10], [11, 7]], shield: { r: { x: 8, y: 5, w: 6, h: 9 }, front: false } },
    hurt: { hands: [[1, 6], [14, 6]], gun: [[13, 8], [14, 3]], shield: { r: { x: 12, y: 9, w: 3, h: 6 }, front: true } },
  },
};

const SHIELD = { lit: 'W', edge: 'V', glint: 'd' } as const;

/** The rifle: a stock, a barrel, a lit tip and a magazine under the middle. */
function rifle(buf: Uint8Array, a: Pt, b: Pt): void {
  stroke(buf, C, a, b, 'r');
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i < 3; i++) put(buf, C, a[0] + Math.round((dx * i) / n), a[1] + Math.round((dy * i) / n), 'T');
  put(buf, C, b[0], b[1], 'R');
  const mx = a[0] + Math.round(dx * 0.4), my = a[1] + Math.round(dy * 0.4);
  if (Math.abs(dx) >= Math.abs(dy)) put(buf, C, mx, my + 1, 'r'); else put(buf, C, mx + 1, my, 'r');
}

/** One frame of the trooper, facing right when view is 'side'. */
export function composeTrooper(view: View, pose: TrooperPose, frame = 0): Uint8Array {
  const list = TROOPER_POSES[pose];
  const step = list[Math.min(frame, list.length - 1)] as Step;
  const rig = RIGS[view][step.stance];
  const dx = view === 'side' ? step.lean : 0, dy = step.bob;
  const upper: View = step.turn ? (view === 'side' ? 'down' : 'side') : view;
  const body = new Uint8Array(C * C);
  rows(body, C, LEGS[view][step.legs].y, LEGS[view][step.legs].rows);
  rows(body, C, TORSO[upper].y, TORSO[upper].rows, dx, dy);
  rows(body, C, HEAD[upper].y, HEAD[upper].rows, dx, dy);
  const [gs, ss] = SHOULDERS[view];
  const down = step.stance === 'hurt';
  stroke(body, C, [gs[0] + dx, gs[1] + dy], [rig.hands[0][0] + dx, rig.hands[0][1] + (down ? 0 : dy)], 'o', true);
  stroke(body, C, [ss[0] + dx, ss[1] + dy], [rig.hands[1][0] + dx, rig.hands[1][1] + (down ? 0 : dy)], 'o', true);
  if (rig.gun) rifle(body, [rig.gun[0][0] + dx, rig.gun[0][1] + dy], [rig.gun[1][0] + dx, rig.gun[1][1] + dy]);
  put(body, C, rig.hands[0][0] + dx, rig.hands[0][1] + (down ? 0 : dy), 'g');
  put(body, C, rig.hands[1][0] + dx, rig.hands[1][1] + (down ? 0 : dy), 'g');
  if (pose === 'ko') {
    const lying = settle(rotate(body, C, view !== 'down'), C);
    outline(lying, C);
    return lying;
  }
  outline(body, C);
  const sh = shieldLayer(C, fit(rig.shield.r, dx, step.stance === 'block' || step.stance === 'carry' ? dy : 0, C), SHIELD);
  let out: Uint8Array;
  if (rig.shield.front) { out = body.slice(); over(out, sh); } else { out = sh.slice(); for (let i = 0; i < out.length; i++) if (body[i]) out[i] = body[i] as number; }
  if (step.boom && rig.gun) {
    const [a, m] = rig.gun, sx = Math.sign(m[0] - a[0]), sy = Math.sign(m[1] - a[1]);
    flash(out, C, [m[0] + dx + sx * 2, m[1] + dy + sy * 2], step.boom, 'F', 'G');
  }
  return out;
}

/** A painted frame for a direction on screen (left is the right profile mirrored). */
export function trooperPx(dir: Dir, pose: TrooperPose, frame = 0): Px {
  return toPx(faced((v) => composeTrooper(v, pose, frame), dir, C), C, TROOPER_PAL);
}

