// The Commander (docs/chapter-5.md, stage 5.1's mini-boss): a trooper captain a size up, in a 24 by 24 cell like the Warden. An officer's peaked
// cap with a gold badge, a moustache, gold epaulettes, a belt and a full-height clear riot shield. Composed like the trooper (trooper.ts):
// head, torso and legs, then the arms and the shield from a rig per stance. Poses: idle, walk (two frames), plant (the shield planted and
// the whistle at his mouth, two frames of sound marks), charge (two frames), stun (against a wall, two frames of stars), hurt and ko.
// `cracked` is the second half of the fight: the shield's frame is dull and a break runs across it, from any pose. Pure: no DOM.
import type { View } from '../data/types.ts';
import type { ColorName } from '../palette.ts';
import type { Dir, Pt, Rect } from './troop_kit.ts';
import { R, faced, fill, fit, outline, over, put, rotate, rows, settle, shieldLayer, stroke, toPx } from './troop_kit.ts';
import type { Px } from '../px.ts';

export const COMMANDER_CELL = 24;
const C = COMMANDER_CELL;

/** Role letters to palette colors. C crown, L its lit spot, c its shade, b band, v visor, A gold, s skin, e eyes, m moustache, o jacket, O lit, n shade, R and Y
 * medals, B belt, p trousers, f boots, g hands, z whistle, M N sound marks, a speed tick, W V d y the shield (lit edge, shaded edge, glint, band), X x its dulled edge and its crack. */
export const COMMANDER_PAL: Record<string, ColorName> = {
  C: 'pine2', L: 'pine3', c: 'pine1', b: 'grey1', v: 'grey1', A: 'amber', s: 'skin0', e: 'ink', m: 'soil1', o: 'pine2', O: 'pine3', n: 'pine1',
  R: 'red', Y: 'yellow', B: 'grey1', p: 'pine1', f: 'soil0', g: 'skin0', z: 'bone', M: 'white', N: 'yellow', a: 'grey3',
  W: 'white', V: 'sky', d: 'cyan', y: 'amber', X: 'mist', x: 'white',
};

type Leg = [x0: number, w: number, len: number, toe?: number];
/** Legs from row 16: each is a column of trousers ending in a boot row, a toe px longer to the front in profile. */
function legRows(list: Leg[]): string[] {
  const out: string[] = [];
  for (let j = 0; j < 7; j++) {
    const row = new Array<string>(C).fill('.');
    for (const [x0, w, len, toe = 0] of list) if (j < len) for (let i = 0; i < w + (j === len - 1 ? toe : 0); i++) row[x0 + i] = j === len - 1 ? 'f' : 'p';
    out.push(row.join(''));
  }
  return out;
}
type LegPose = 'stand' | 'stepA' | 'stepB' | 'wide';
const FRONT: Record<LegPose, Leg[]> = {
  stand: [[6, 5, 7], [13, 5, 7]], stepA: [[6, 5, 7], [13, 5, 5]], stepB: [[6, 5, 5], [13, 5, 7]], wide: [[4, 5, 7], [15, 5, 7]],
};
const SIDE: Record<LegPose, Leg[]> = {
  stand: [[6, 6, 7, 3]], stepA: [[3, 5, 6], [9, 5, 7, 3]], stepB: [[6, 5, 7, 3], [4, 4, 5]], wide: [[2, 5, 7], [10, 5, 6, 3]],
};

const HEAD: Record<View, string[]> = {
  down: [
    R(7, 'CCCCCCCCCC', C), R(5, 'CLCCCCCCCCCCCC', C), R(5, 'bbbbbbbAAbbbbb', C), R(6, 'vvvvvvvvvvvv', C),
    R(7, 'ssessssess', C), R(7, 'ssssssssss', C), R(7, 'ssmmmmmmss', C), R(8, 'ssssssss', C), R(10, 'ssss', C),
  ],
  up: [
    R(7, 'CCCCCCCCCC', C), R(5, 'CLCCCCCCCCCCCC', C), R(5, 'bbbbbbbbbbbbbb', C), R(6, 'cccccccccccc', C),
    R(7, 'ssssssssss', C), R(7, 'ssssssssss', C), R(7, 'ssssssssss', C), R(8, 'ssssssss', C), R(10, 'ssss', C),
  ],
  side: [
    R(5, 'CCCCCCCC', C), R(4, 'CLCCCCCCCCC', C), R(4, 'bbbbbbbbAAb', C), R(5, 'cccccsvvvvvvv', C),
    R(5, 'sssssssses', C), R(5, 'ssssssssss', C), R(5, 'ssssssmmmm', C), R(6, 'sssssss', C), R(8, 'ssss', C),
  ],
};
const TORSO: Record<View, string[]> = {
  down: [
    R(4, 'AAAooooooooooAAA', C), R(5, 'Oooooooooooooon', C), R(5, 'ooRoooooooYooo', C), R(5, 'onnnoooooonnno', C),
    R(5, 'BBBBBBBAABBBBB', C), R(5, 'ooooooooooooon', C),
  ],
  up: [
    R(4, 'AAAooooooooooAAA', C), R(5, 'Oooooooooooooon', C), R(5, 'ooooooooooooon', C), R(5, 'ooooooooooooon', C),
    R(5, 'BBBBBBBBBBBBBB', C), R(5, 'ooooooooooooon', C),
  ],
  side: [
    R(5, 'AAAoooooooo', C), R(5, 'OoooooooooA', C), R(5, 'oooRoooYoon', C), R(5, 'ooonnooooon', C),
    R(5, 'BBBBBBBBBBB', C), R(5, 'oooooooooon', C),
  ],
};

// ---------------------------------------------------------------- poses and rigs
export type CommanderPose = 'idle' | 'walk' | 'plant' | 'charge' | 'stun' | 'hurt' | 'ko';
type Stance = 'carry' | 'plant' | 'charge' | 'stun' | 'hurt';
interface Step { stance: Stance; legs: LegPose; bob: number; lean: number; beat?: number }
const S = (stance: Stance, legs: LegPose, bob = 0, lean = 0, beat?: number): Step => ({ stance, legs, bob, lean, ...(beat === undefined ? {} : { beat }) });

/** The frames of each pose. beat counts the frames of sound marks and stars. */
export const COMMANDER_POSES: Record<CommanderPose, Step[]> = {
  idle: [S('carry', 'stand'), S('carry', 'stand', 1)],
  walk: [S('carry', 'stepA', 1), S('carry', 'stepB', 1)],
  plant: [S('plant', 'wide', 0, 0, 0), S('plant', 'wide', 0, 0, 1)],
  charge: [S('charge', 'wide', 2, 2), S('charge', 'stepA', 2, 2)],
  stun: [S('stun', 'stand', 2, -1, 0), S('stun', 'stand', 3, -1, 1)],
  hurt: [S('hurt', 'stand', 0, -1)],
  ko: [S('hurt', 'stand')],
};

interface Rig { hands: [Pt, Pt]; shield: { r: Rect; front: boolean } }
const SHOULDERS: Record<View, [Pt, Pt]> = { down: [[5, 12], [18, 12]], up: [[5, 12], [18, 12]], side: [[9, 12], [10, 12]] };
const RIGS: Record<View, Record<Stance, Rig>> = {
  side: {
    carry: { hands: [[8, 17], [15, 14]], shield: { r: { x: 14, y: 6, w: 8, h: 16 }, front: true } },
    plant: { hands: [[14, 9], [15, 15]], shield: { r: { x: 15, y: 5, w: 8, h: 18 }, front: true } },
    charge: { hands: [[12, 16], [17, 14]], shield: { r: { x: 15, y: 8, w: 8, h: 15 }, front: true } },
    stun: { hands: [[8, 19], [11, 19]], shield: { r: { x: 2, y: 16, w: 9, h: 7 }, front: true } },
    hurt: { hands: [[12, 7], [6, 8]], shield: { r: { x: 14, y: 12, w: 7, h: 10 }, front: true } },
  },
  down: {
    carry: { hands: [[4, 17], [19, 17]], shield: { r: { x: 4, y: 10, w: 16, h: 12 }, front: true } },
    plant: { hands: [[8, 8], [19, 16]], shield: { r: { x: 2, y: 7, w: 20, h: 16 }, front: true } },
    charge: { hands: [[4, 17], [19, 17]], shield: { r: { x: 2, y: 10, w: 20, h: 13 }, front: true } },
    stun: { hands: [[3, 20], [20, 20]], shield: { r: { x: 14, y: 14, w: 9, h: 9 }, front: true } },
    hurt: { hands: [[2, 8], [21, 8]], shield: { r: { x: 1, y: 13, w: 7, h: 10 }, front: true } },
  },
  up: {
    carry: { hands: [[4, 17], [19, 17]], shield: { r: { x: 4, y: 8, w: 16, h: 13 }, front: false } },
    plant: { hands: [[8, 8], [19, 16]], shield: { r: { x: 2, y: 5, w: 20, h: 17 }, front: false } },
    charge: { hands: [[4, 17], [19, 17]], shield: { r: { x: 2, y: 8, w: 20, h: 14 }, front: false } },
    stun: { hands: [[3, 20], [20, 20]], shield: { r: { x: 1, y: 14, w: 9, h: 9 }, front: true } },
    hurt: { hands: [[2, 8], [21, 8]], shield: { r: { x: 16, y: 13, w: 7, h: 10 }, front: true } },
  },
};

const CLEAR = { lit: 'W', edge: 'V', glint: 'd', band: 'y' } as const;
const BROKEN = { ...CLEAR, crack: { lit: 'X', line: 'x' } } as const;

/** A ')' of sound: `h` px each way from the center, opening toward `dir`. */
function arc(buf: Uint8Array, cx: number, cy: number, h: number, dir: 1 | -1, ch: string): void {
  for (let k = -h; k <= h; k++) put(buf, C, cx + dir * (Math.abs(k) >= h ? 0 : 1), cy + k, ch);
}

/** The whistle's marks: two arcs on each side of the head from the front, on the facing side in profile. beat 0 is close, 1 is a step wider. */
function marks(buf: Uint8Array, view: View, beat: number, dx: number): void {
  if (view === 'side') { arc(buf, 17 + dx + beat, 8, 1, 1, 'M'); arc(buf, 19 + dx + beat * 2, 8, 2, 1, 'N'); return; }
  arc(buf, 18 + beat, 6, 1, 1, 'M'); arc(buf, 19 + beat * 2, 6, 2, 1, 'N');
  arc(buf, 5 - beat, 6, 1, -1, 'M'); arc(buf, 4 - beat * 2, 6, 2, -1, 'N');
}

/** A small plus of stars about the head: beat 0 and 1 turn them a step. */
function stars(buf: Uint8Array, view: View, beat: number): void {
  const at: Pt[] = view === 'side' ? [[6, 3], [13, 2], [17, 4]] : [[5, 3], [12, 2], [19, 3]];
  at.forEach(([x, y], i) => {
    const o = (i + beat) % 3;
    const cx = x + (o === 0 ? 0 : o === 1 ? 1 : -1), cy = y + (o === 1 ? 1 : 0);
    put(buf, C, cx, cy, 'N'); put(buf, C, cx - 1, cy, 'Y'); put(buf, C, cx + 1, cy, 'Y'); put(buf, C, cx, cy - 1, 'Y'); put(buf, C, cx, cy + 1, 'Y');
  });
}

/** Speed ticks behind a charge: short dashes on the side he comes from. */
function ticks(buf: Uint8Array, view: View): void {
  const at: Pt[] = view === 'side' ? [[1, 10], [2, 14], [1, 18]] : view === 'down' ? [[1, 3], [19, 2], [1, 7], [20, 6]] : [[3, 19], [17, 20], [9, 21]];
  for (const [x, y] of at) { put(buf, C, x, y, 'a'); put(buf, C, x + 1, y, 'a'); put(buf, C, x + 2, y, 'a'); }
}

/** One frame of the Commander, facing right when view is 'side'. */
export function composeCommander(view: View, pose: CommanderPose, frame = 0, cracked = false): Uint8Array {
  const list = COMMANDER_POSES[pose];
  const step = list[Math.min(frame, list.length - 1)] as Step;
  const rig = RIGS[view][step.stance];
  const dx = view === 'side' ? step.lean : 0, dy = step.bob;
  const slump = step.stance === 'stun' || step.stance === 'hurt';
  const body = new Uint8Array(C * C);
  const legs = view === 'side' ? SIDE[step.legs] : FRONT[step.legs];
  rows(body, C, 16, legRows(legs));
  rows(body, C, 10, TORSO[view], dx, dy);
  rows(body, C, 1, HEAD[view], dx, dy + (step.stance === 'stun' ? 1 : 0));
  const [sa, sb] = SHOULDERS[view];
  const hy = slump ? 0 : dy;
  stroke(body, C, [sa[0] + dx, sa[1] + dy], [rig.hands[0][0] + dx, rig.hands[0][1] + hy], 'o', true);
  stroke(body, C, [sb[0] + dx, sb[1] + dy], [rig.hands[1][0] + dx, rig.hands[1][1] + hy], 'o', true);
  for (const h of rig.hands) fill(body, C, { x: h[0] + dx - 1, y: h[1] + hy - 1, w: 2, h: 2 }, 'g');
  if (step.stance === 'plant') { put(body, C, view === 'side' ? 15 + dx : 10, 8 + dy, 'z'); put(body, C, view === 'side' ? 16 + dx : 11, 8 + dy, 'z'); }
  if (pose === 'ko') { const lying = settle(rotate(body, C, view !== 'down'), C); outline(lying, C); return lying; }
  outline(body, C);
  const r = fit(rig.shield.r, dx, slump || step.stance === 'plant' ? 0 : dy, C);
  const sh = shieldLayer(C, r, cracked ? BROKEN : CLEAR);
  let out: Uint8Array;
  if (rig.shield.front) { out = body.slice(); over(out, sh); } else { out = sh.slice(); for (let i = 0; i < out.length; i++) if (body[i]) out[i] = body[i] as number; }
  if (step.stance === 'plant') marks(out, view, step.beat ?? 0, dx);
  if (step.stance === 'stun') stars(out, view, step.beat ?? 0);
  if (step.stance === 'charge') ticks(out, view);
  return out;
}

/** A painted frame for a direction on screen (left is the right profile mirrored). */
export function commanderPx(dir: Dir, pose: CommanderPose, frame = 0, cracked = false): Px {
  return toPx(faced((v) => composeCommander(v, pose, frame, cracked), dir, C), C, COMMANDER_PAL);
}
