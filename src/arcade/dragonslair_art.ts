// The art for DRAGON'S LAIR: Dirk the knight in his poses, the dragon asleep and awake, the cue icons, and the four
// scene paintings (the drawbridge, the tentacle room, the crumbling ledge and the dragon's lair). A scene is painted
// with rects and sprites through a Pen that can mirror the whole picture left to right, the way the laserdisc showed a
// scene flipped the second time round. Each painter reads how far the scene has got, so the bridge loses planks, the
// tentacle reaches and the pillars crumble as the moves go by.
import { rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import type { ColorName } from '../gfx/palette.ts';
import { sprite } from './sprite.ts';
import type { Sprite, Turn } from './sprite.ts';
import { FIELD } from './types.ts';

// ---------------------------------------------------------------- Dirk
const DIRK_COLORS = { y: 'yellow', s: 'skin0', g: 'grey3', p: 'purple' } as const;
const TOP = ['..yyy....', '.yyyyy...', '.yyssss..', '.ysssps..', '..ssss...'];
const dirk = (rows: string[]): Sprite => sprite(rows, DIRK_COLORS);
/** Dirk facing right, 9 wide and 15 tall, his feet on the bottom row. */
export const DIRK = {
  stand: dirk([...TOP, '..gggg...', '.gggggg..', '.gppppgs.', '.gppppg.g', '..pppp..g', '..pppp..g', '..pp.pp.g', '..pp.pp..',
    '..gg.gg..', '.ggg.ggg.']),
  run: [
    dirk([...TOP, '..gggg...', '.gggggg..', 'sgppppgs.', '..pppp.gg', '..pppp...', '.pppppp..', 'pp....pp.', 'p......pp',
      'gg.....g.', 'g........']),
    dirk([...TOP, '..gggg...', '.gggggg..', '.gppppgs.', '.spppp.gg', '..pppp...', '..pppp...', '...ppp...', '...pp....',
      '...gg....', '...ggg...']),
  ],
  leap: dirk(['..yyy..s.', '.yyyyy.s.', '.yyssssg.', '.ysssps.g', '..ssss..g', '..gggg..g', '.gggggg..', '.gppppg..',
    '..pppp...', '..pppp...', '.pppppp..', 'pp....pp.', 'gg.....gg', '.........', '.........']),
  slash: sprite([...TOP, '..gggg...', '.gggggg....', '.gppppgsggggg', '.gppppg....', '..pppp.....', '..pppp.....',
    '..pp.pp....', '.pp...pp...', '.gg...gg...', 'ggg...ggg..'],
    DIRK_COLORS),
  duck: dirk(['.........', '.........', '.........', '.........', '.........', '..yyy....', '.yyyyy...', '.yyssss..',
    '.ysssps..', '..ssss...', '.gggggg..', 'sgppppgs.', '.pppppp.g', 'pp....pp.', 'gg....gg.']),
  fall: dirk(['s.......s', 'g..yyy..g', '.gyyyyyg.', '..yssss..', '..ssps...', '..gggg...', '.gggggg..', '..pppp...',
    '..pppp...', '.pp..pp..', 'pp....pp.', 'g......g.', '.........', '.........', '.........']),
};
/** What's left after the dragon's fire. */
export const ASH = sprite([
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '...bbb...',
  '..bkbkb..',
  '..bbbbb..',
  '...b.b...',
  '.....b...',
  '..bbbbb..',
  '....b....',
  '.kkbbbkk.',
  'kkkkkkkkk',
], { b: 'bone', k: 'grey1' });
/** The small life icon: Dirk's helmet head. */
export const DIRK_LIFE = sprite(['.yyy.', 'yyyyy', 'yssss', 'ysps.', '.ss..'], DIRK_COLORS);

// ---------------------------------------------------------------- cues
/** A fat arrow pointing right, 13 by 13, yellow on a black edge so it reads over any scene. Turned for the others. */
const ARROW_ROWS = [
  '.....k.......',
  '.....kk......',
  '.....kyk.....',
  '.....kyyk....',
  'kkkkkkyyyk...',
  'kyyyyyyyyyk..',
  'kyyyyyyyyyyk.',
  'kyyyyyyyyyk..',
  'kkkkkkyyyk...',
  '.....kyyk....',
  '.....kyk.....',
  '.....kk......',
  '.....k.......',
];
export const ARROWS = [sprite(ARROW_ROWS, { k: 'black', y: 'yellow' }), sprite(ARROW_ROWS, { k: 'black', y: 'white' })];
/** The sword cue, 13 by 13: a blade on a black edge, pointing up and right. */
const SWORD_ROWS = [
  '..........kkk',
  '.........kwwk',
  '........kwwk.',
  '.......kwwk..',
  '..k...kwwk...',
  '.kak.kwwk....',
  '..kakwwk.....',
  '...kawk......',
  '...kkak......',
  '..kakkak.....',
  '.kak..kak....',
  'kak....k.....',
  'kk...........',
];
export const SWORDS = [
  sprite(SWORD_ROWS, { k: 'black', w: 'white', a: 'amber' }), sprite(SWORD_ROWS, { k: 'black', w: 'yellow', a: 'orange' }),
];

/** The turn that points the right-facing arrow each way. */
export const ARROW_TURN: Readonly<Record<'up' | 'down' | 'left' | 'right', Turn>> = { right: 0, down: 1, left: 2, up: 3 };

// ---------------------------------------------------------------- the pen
/** Paints in field coordinates and mirrors left to right when the scene is flipped. */
export interface Pen {
  readonly mirror: boolean;
  r(x: number, y: number, w: number, h: number, c: ColorName): void;
  /** A sprite with its top-left at (x, y) in the unflipped picture. */
  s(sp: Sprite, x: number, y: number, flip?: boolean, turn?: Turn): void;
}

export function pen(ctx: Ctx, ox: number, oy: number, mirror: boolean): Pen {
  return {
    mirror,
    r(x, y, w, h, c) { rect(ctx, ox + (mirror ? FIELD - x - w : x), oy + y, w, h, c); },
    s(sp, x, y, flip = false, turn = 0) {
      const w = turn & 1 ? sp.h : sp.w;
      sp.draw(ctx, ox + (mirror ? FIELD - x - w : x), oy + y, turn, flip !== mirror);
    },
  };
}

// ---------------------------------------------------------------- the dragon
type Put = (x: number, y: number, ch: string) => void;
/** A char grid painted with shapes, outlined in 'd' wherever it meets the clear, then finished with details. */
function shapes(w: number, h: number, body: (put: Put) => void, details: (put: Put) => void): string[] {
  const g = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const put: Put = (x, y, ch) => {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < w && y < h) (g[y] as string[])[x] = ch;
  };
  body(put);
  const solid = (x: number, y: number): boolean => (g[y]?.[x] ?? '.') !== '.';
  const out = g.map((r) => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) (out[y] as string[])[x] = 'd';
  }
  details((x, y, ch) => { if (x >= 0 && y >= 0 && x < w && y < h) (out[y] as string[])[x] = ch; });
  return out.map((r) => r.join(''));
}
const oval = (put: Put, cx: number, cy: number, rx: number, ry: number, ch: string): void => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, ch);
  }
};
const box = (put: Put, x: number, y: number, w: number, h: number, ch: string): void => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, ch);
};

export type DragonPose = 'asleep' | 'awake' | 'lunge' | 'slain';
/** The dragon facing left, 64 by 40: a green body on its treasure with a folded wing, and the head low (asleep, slain)
 * or raised with the jaws open (awake), or thrust low and open at Dirk (lunge). */
function dragon(pose: DragonPose): Sprite {
  const up = pose === 'awake', open = up || pose === 'lunge';
  const hx = up ? 6 : 0, hy = up ? 2 : pose === 'lunge' ? 22 : 26;
  const rows = shapes(64, 40, (put) => {
    oval(put, 44, 26, 16, 10, 'g');
    oval(put, 29, 24, 8, 9, 'g');
    // The tail sweeps out behind and curls up to a spade.
    for (let i = 0; i <= 14; i++) { const t = i / 14; oval(put, 56 + 7 * t, 31 - 16 * t * t, 4 - 2.6 * t, 4 - 2.6 * t, 'g'); }
    box(put, 61, 12, 3, 3, 'l'); put(62, 11, 'l');
    oval(put, 27, 28, 4, 5, 'a'); oval(put, 41, 34, 11, 1.6, 'a');
    box(put, 22, 30, 5, 7, 'g'); box(put, 48, 31, 6, 6, 'g'); box(put, 20, 36, 8, 2, 'l'); box(put, 47, 36, 8, 2, 'l');
    // The folded wing: a leaf green sail with darker ribs, and spikes down the back.
    for (let i = 0; i < 14; i++) for (let j = 0; j <= i; j++) put(38 + i, 19 - j + Math.floor(i / 3), 'l');
    for (let k = 0; k < 5; k++) { put(32 + k * 6, 16, 'l'); put(32 + k * 6, 15, 'l'); put(33 + k * 6, 16, 'l'); }
    // The neck from the chest to the head.
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      oval(put, 26 + (hx + 12 - 26) * t, 18 + (hy + 5 - 18) * t, 3.2, 3.2, 'g');
    }
    oval(put, hx + 12, hy + 5, 5, 4, 'g');
    box(put, hx + 1, hy + 3, 10, 4, 'g');
    if (open) box(put, hx + 3, hy + 9, 9, 2, 'g');
    for (let i = 0; i < 4; i++) { put(hx + 14 + i, hy + 1 - i, 'l'); put(hx + 16 + i, hy + 2 - i, 'l'); }
  }, (put) => {
    for (let i = 1; i < 12; i += 4) for (let j = 0; j < 9 - i / 2; j++) put(50 - j, 7 + i + j, 'g');
    put(hx + 2, hy + 4, 'd');
    if (pose === 'asleep') { put(hx + 11, hy + 4, 'd'); put(hx + 12, hy + 4, 'd'); put(hx + 13, hy + 3, 'd'); }
    else if (pose === 'slain') for (const [i, j] of [[11, 3], [13, 3], [12, 4], [11, 5], [13, 5]] as const) put(hx + i, hy + j, 'd');
    else { put(hx + 11, hy + 3, 'a'); put(hx + 12, hy + 3, 'a'); put(hx + 12, hy + 4, 'd'); box(put, hx + 2, hy + 7, 9, 2, 'd'); }
  });
  return sprite(rows, { d: 'pine0', g: 'pine2', l: 'leaf', a: 'amber' });
}
export const DRAGON: Readonly<Record<DragonPose, Sprite>> = {
  asleep: dragon('asleep'), awake: dragon('awake'), lunge: dragon('lunge'), slain: dragon('slain'),
};

// ---------------------------------------------------------------- the scenes
export type Phase = 'intro' | 'beat' | 'cue' | 'act' | 'death' | 'clear' | 'bonus' | 'gameover' | 'over';
/** What a painter needs to know: which move the scene is on, the phase and its tick, and where Dirk's feet are. */
export interface SceneView { move: number; phase: Phase; t: number; clock: number; dx: number; dy: number }
export type Layer = 'back' | 'front';
export type Painter = (p: Pen, v: SceneView, layer: Layer) => void;

/** Move k is being set up or waits for the answer. */
const live = (v: SceneView, k: number): boolean => v.move === k && (v.phase === 'beat' || v.phase === 'cue');
/** Move k is being acted out, or is done. */
const made = (v: SceneView, k: number): boolean => v.move > k || (v.move === k && v.phase === 'act');
/** How far a hazard has come: 0 to 1 over the beat, 1 through the cue. */
const build = (v: SceneView): number => (v.phase === 'cue' ? 1 : v.phase === 'beat' ? v.t / 30 : 0);
const shake = (v: SceneView): number => ((v.clock >> 1) & 1);

function stars(p: Pen, v: SceneView, n: number, h: number): void {
  for (let i = 0; i < n; i++) {
    const x = (i * 53 + 11) % 168, y = 10 + ((i * 37 + 5) % h);
    p.r(x, y, 1, 1, (v.clock >> 4) % 7 === i % 7 ? 'white' : 'mist');
  }
}

function disc(p: Pen, cx: number, cy: number, r: number, c: ColorName): void {
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    p.r(cx - w, cy + y, w * 2 + 1, 1, c);
  }
}

/** Flames from (x0, y0) to (x1, y1), a ragged jet with a hot core. */
function flame(p: Pen, x0: number, y0: number, x1: number, y1: number, clock: number, upto = 1): void {
  for (let i = 0; i <= 16 * upto; i++) {
    const t = i / 16, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const r = 2 + Math.round(t * 4) + ((clock + i) % 3 === 0 ? 1 : 0);
    disc(p, x, y + (((clock >> 1) + i) % 3) - 1, r, i % 4 === 0 ? 'hot' : 'orange');
    disc(p, x, y, Math.max(1, r - 2), 'yellow');
  }
}

// ---- 1. the drawbridge: the planks fall away behind Dirk, a serpent rises from the moat, and he dives for the gate.
const bridge: Painter = (p, v, layer) => {
  if (layer === 'front') {
    const k = live(v, 2) ? build(v) : v.move === 2 && v.phase === 'act' ? 1 - v.t / 32 : 0;
    if (k > 0) {
      const hy = 124 - Math.round(34 * k);
      for (let y = 124; y > hy; y -= 3) p.r(118 + Math.round(Math.sin(y / 6) * 2), y, 5, 4, 'pine2');
      p.r(112, hy - 3, 9, 6, 'pine2'); p.r(112, hy - 3, 9, 1, 'leaf');
      p.r(114, hy - 2, 2, 2, 'hot'); p.r(110, hy + 1, 5, 1, 'blood1');
    }
    // The splash as Dirk goes into the moat.
    if (v.phase === 'death' && v.dy > 124 && v.dy < 150) {
      for (let i = 0; i < 6; i++) p.r(v.dx - 8 + i * 3, 122 - ((v.t + i * 5) % 9), 2, 2, i % 2 ? 'white' : 'sky');
    }
    return;
  }
  p.r(0, 8, 168, 116, 'night');
  stars(p, v, 22, 70);
  disc(p, 28, 26, 6, 'cream'); disc(p, 30, 24, 5, 'night');
  p.r(112, 34, 56, 90, 'grey2'); p.r(144, 18, 24, 20, 'grey2');
  for (let x = 112; x < 144; x += 8) p.r(x, 28, 5, 6, 'grey2');
  for (let x = 144; x < 168; x += 8) p.r(x, 12, 5, 6, 'grey2');
  for (let y = 40; y < 120; y += 6) {
    p.r(112, y, 56, 1, 'grey1');
    for (let x = 112 + ((y / 6) % 2) * 6; x < 168; x += 12) p.r(x, y, 1, 6, 'grey1');
  }
  p.r(154, 26, 3, 7, 'amber'); p.r(154, 48, 3, 7, 'amber');
  p.r(122, 82, 26, 42, 'ink'); p.r(124, 79, 22, 3, 'ink'); p.r(127, 77, 16, 2, 'ink');
  const gate = v.move >= 3 && (v.phase === 'clear' || v.phase === 'bonus') ? Math.min(1, v.t / 20) : 0;
  for (let x = 124; x < 147; x += 4) p.r(x, 79, 1, 8 + Math.round(gate * 34), 'grey3');
  p.r(123, 86 + Math.round(gate * 34), 24, 1, 'grey3');
  p.r(0, 124, 168, 36, 'teal0');
  for (let i = 0; i < 10; i++) p.r((i * 31 + (v.clock >> 2) + (i % 3) * 40) % 176 - 8, 130 + (i % 4) * 8, 7, 1, 'teal1');
  p.r(0, 116, 28, 44, 'soil1'); p.r(0, 116, 28, 2, 'pine2'); p.r(112, 120, 56, 4, 'grey1');
  for (let x = 28; x < 122; x += 6) {
    const a = x < 52, b = x >= 64 && x < 94;
    let drop = 0;
    const k = a ? 0 : 1;
    if ((a || b) && made(v, k)) drop = v.move === k && v.phase === 'act' ? v.t * v.t / 12 : 99;
    if (v.phase === 'death' && Math.abs(x + 2 - v.dx) < 12) drop = v.t * v.t / 20;
    if (drop > 30) continue;
    const jig = (a && live(v, 0)) || (b && live(v, 1)) ? shake(v) : 0;
    p.r(x, 116 + jig + Math.round(drop), 5, 5, 'soil2'); p.r(x, 116 + jig + Math.round(drop), 5, 1, 'soil3');
  }
  for (let i = 0; i < 24; i++) p.r(Math.round(120 - i * 3.8), Math.round(80 + i * 1.4), 2, 2, 'grey3');
};

// ---- 2. the tentacle room: it reaches from a hole in the wall, sweeps low, swings high, and Dirk runs for the door.
/** The tentacle from the hole to its tip, tapering, with pink suckers underneath. */
function tentacle(p: Pen, tx: number, ty: number, clock: number): void {
  const x0 = 6, y0 = 100, n = 14;
  for (let i = n; i >= 0; i--) {
    const t = i / n, wob = Math.sin(t * 5 + clock / 6) * 4 * (1 - t) * t * 2;
    const x = x0 + (tx - x0) * t, y = y0 + (ty - y0) * t + wob, r = Math.max(1, Math.round(4 - t * 3));
    disc(p, x, y, r, 'pine2');
    p.r(x - r + 1, y - r, Math.max(1, r), 1, 'leaf');
    if (i % 3 === 1) p.r(x, y + r - 1, 2, 1, 'pink');
  }
}

const room: Painter = (p, v, layer) => {
  if (layer === 'back') {
    p.r(0, 8, 168, 112, 'shadow');
    for (let y = 18; y < 120; y += 10) {
      p.r(0, y, 168, 1, 'night');
      for (let x = ((y / 10) % 2) * 10; x < 168; x += 20) p.r(x, y, 1, 10, 'night');
    }
    p.r(0, 120, 168, 40, 'grey1');
    for (const y of [126, 136, 150]) p.r(0, y, 168, 1, 'grey2');
    for (const tx of [44, 108]) {
      p.r(tx, 56, 3, 8, 'soil2');
      const f = (v.clock >> 2) % 3;
      p.r(tx - 1, 50 - f, 5, 6 + f, 'orange'); p.r(tx, 52, 3, 3, 'yellow');
    }
    const open = v.move >= 3 && v.phase !== 'beat' && v.phase !== 'cue';
    p.r(136, 80, 26, 40, 'grey2'); p.r(139, 78, 20, 2, 'grey2');
    p.r(138, 82, 22, 38, open ? 'ink' : 'soil1');
    if (!open) {
      for (let x = 142; x < 160; x += 5) p.r(x, 82, 1, 38, 'soil0');
      p.r(138, 90, 22, 2, 'grey3'); p.r(138, 110, 22, 2, 'grey3'); p.r(141, 100, 2, 2, 'amber');
    }
    p.r(0, 84, 12, 32, 'ink'); p.r(10, 84, 2, 32, 'grey2'); p.r(0, 82, 12, 2, 'grey2');
    return;
  }
  // Where the tip is for each move: reaching at chest height, sweeping the floor, swinging at head height, then back.
  let tx = 14, ty = 100;
  const k = build(v), a = v.phase === 'act' ? v.t / 32 : 0;
  if (v.phase === 'death') { tx = v.dx; ty = v.dy - 8; }
  else if (v.move === 0 && v.phase !== 'intro') { tx = v.phase === 'act' ? v.dx - 12 - a * 30 : 14 + (v.dx - 26) * k; ty = 104; }
  else if (v.move === 1) { tx = v.phase === 'act' ? v.dx - 10 + a * 40 : 14 + (v.dx - 24) * k; ty = 116; }
  else if (v.move === 2) { tx = v.phase === 'act' ? v.dx - 10 + a * 40 : 14 + (v.dx - 24) * k; ty = 98 - Math.round(k * 4); }
  tentacle(p, tx, ty, v.clock);
  if (v.phase === 'death' && v.t > 6 && v.t < 52) for (const y of [v.dy - 12, v.dy - 6]) p.r(v.dx - 6, y, 13, 3, 'pine2');
  if (v.move === 0 && v.phase === 'act' && v.t < 12) p.r(tx + 2, ty - 2, 3, 3, 'pink');
};

// ---- 3. the crumbling ledge: over a pit, from the ledge to two stone pillars and across, bats on the way.
const PITS = { left: 36, p1: [52, 100], p2: [92, 96], right: 132 } as const;
const ledge: Painter = (p, v, layer) => {
  if (layer === 'front') {
    if (live(v, 2) || (v.move === 2 && v.phase === 'act')) {
      const k = v.phase === 'act' ? v.t / 32 : 0, come = build(v);
      for (let i = 0; i < 3; i++) {
        const bx = v.phase === 'act' ? v.dx + 10 + i * 9 + k * 30 : 180 - (180 - v.dx - 10 - i * 9) * come;
        const by = v.dy - 18 + i * 5 - (v.phase === 'act' ? k * 50 : 0) + (((v.clock >> 2) + i) % 2);
        const up = ((v.clock >> 2) + i) % 2 === 0;
        const wy = by + (up ? -1 : 1);
        p.r(bx, by, 3, 3, 'purple'); p.r(bx - 3, wy, 3, 1, 'purple'); p.r(bx + 3, wy, 3, 1, 'purple');
        p.r(bx + 1, by + 1, 1, 1, 'hot');
      }
    }
    return;
  }
  p.r(0, 8, 168, 152, 'soil0');
  for (let i = 0; i < 18; i++) p.r((i * 47) % 160, 14 + ((i * 29) % 80), 6 + (i % 3) * 3, 3, 'soil1');
  for (let x = 6; x < 168; x += 23) for (let j = 0; j < 4; j++) p.r(x + j, 8, 7 - j * 2, 6 + j * 3 - (x % 3) * 2, 'soil1');
  p.r(PITS.left, 92, PITS.right - PITS.left, 68, 'black');
  p.r(PITS.left, 150, PITS.right - PITS.left, 10, 'blood0');
  for (let x = PITS.left + 4; x < PITS.right; x += 13) p.r(x, 154 + (x % 3), 6, 1, 'blood1');
  // A rock falls once Dirk has jumped off it, or with him when he misses.
  const under = v.move === 0 ? 0 : v.move === 1 ? 1 : 3;
  const crumble = (k: number): number =>
    (v.phase === 'death' && k === under) || (v.move === k && v.phase === 'act') ? v.t * v.t / 10 : made(v, k) ? 99 : 0;
  const rock = (x: number, top: number, w: number, k: number, edge = false): void => {
    const d = crumble(k), jig = live(v, k) ? shake(v) : 0;
    const y = top + d + jig, h = edge ? 8 : 160 - top;
    if (d < 60) { p.r(x, y, w, h, 'soil2'); p.r(x, y, w, 2, 'soil3'); p.r(x, y + 2, 2, h - 2, 'soil1'); }
    if (live(v, k) && v.t % 8 < 4) p.r(x + 5, top + 3, 1, 4, 'soil0');
  };
  p.r(0, 104, PITS.left - 8, 56, 'soil2'); p.r(0, 104, PITS.left - 8, 2, 'soil3');
  rock(PITS.left - 8, 104, 8, 0, true);
  rock(PITS.p1[0], PITS.p1[1], 16, 1);
  rock(PITS.p2[0], PITS.p2[1], 16, 3);
  p.r(PITS.right, 96, 168 - PITS.right, 64, 'soil2'); p.r(PITS.right, 96, 168 - PITS.right, 2, 'soil3');
  p.r(150, 70, 14, 26, 'ink'); p.r(152, 68, 10, 2, 'ink');
};

// ---- 4. the lair: the dragon asleep on its gold, the magic sword in a stone. Grab it, dodge the fire, strike.
const lair: Painter = (p, v, layer) => {
  const woke = v.phase === 'death' || (made(v, 1) && !(v.move === 1 && v.phase === 'act' && v.t < 16));
  const slain = v.move >= 4 && (v.phase === 'clear' || v.phase === 'bonus' || (v.phase === 'act' && v.t > 16));
  if (layer === 'back') {
    p.r(0, 8, 168, 152, 'purple0'); p.r(0, 8, 168, 10, 'ink');
    for (let x = 4; x < 168; x += 19) for (let j = 0; j < 3; j++) p.r(x + j, 18, 5 - j * 2, 4 + j * 3, 'ink');
    p.r(0, 140, 168, 20, 'night'); p.r(0, 140, 168, 1, 'shadow');
    for (let i = 0; i < 7; i++) disc(p, 100 + i * 11, 140, 6 + (i % 3) * 2, 'amber');
    for (let i = 0; i < 7; i++) p.r(97 + i * 11, 136 - (i % 3) * 2, 3, 1, 'yellow');
    p.r(150, 126, 14, 14, 'soil2'); p.r(150, 126, 14, 4, 'soil1'); p.r(150, 131, 14, 1, 'amber'); p.r(156, 130, 2, 3, 'amber');
    for (let i = 0; i < 6; i++) if ((v.clock >> 3) % 6 === i) p.r(102 + i * 10, 131 - (i % 2) * 4, 1, 1, 'cream');
    p.r(52, 132, 14, 8, 'grey2'); p.r(52, 132, 14, 1, 'grey3');
    if (!made(v, 1)) {
      p.r(58, 116, 2, 16, 'cyan'); p.r(58, 116, 1, 16, 'white'); p.r(55, 115, 8, 1, 'amber');
      p.r(58, 110, 2, 5, 'soil2'); p.r(58, 109, 2, 1, 'amber');
      if ((v.clock >> 3) % 2) { p.r(54, 112, 1, 1, 'white'); p.r(63, 120, 1, 1, 'white'); }
    }
    p.s(DRAGON[slain ? 'slain' : woke && v.move === 4 ? 'lunge' : woke ? 'awake' : 'asleep'], 92, 100);
    if (!woke) for (let i = 0; i < 3; i++) {
      const zy = 118 - ((v.clock / 2 + i * 12) % 36), zx = 96 + i * 3;
      p.r(zx, zy, 3, 1, 'mist'); p.r(zx + 1, zy + 1, 1, 1, 'mist'); p.r(zx, zy + 2, 3, 1, 'mist');
    }
    return;
  }
  // The mouth: up high, or down low when the head lunges in the last move.
  const mouthX = v.move === 4 ? 96 : 100, mouthY = v.move === 4 ? 130 : 110;
  if (live(v, 2) || live(v, 3)) disc(p, mouthX, mouthY, 1 + Math.round(build(v) * 2), (v.clock >> 2) % 2 ? 'orange' : 'yellow');
  if (v.move === 2 && v.phase === 'act' && v.t < 24) flame(p, mouthX, mouthY, 54, 132, v.clock, Math.min(1, v.t / 8));
  if (v.move === 3 && v.phase === 'act' && v.t < 26) flame(p, mouthX, mouthY + 4, 4, 140, v.clock, Math.min(1, v.t / 8));
  if (v.move === 4 && v.phase === 'act' && v.t > 12 && v.t < 24) disc(p, mouthX - 2, mouthY - 2, (v.t - 8) >> 1, 'white');
  if (v.phase === 'death' && v.t < 40) flame(p, mouthX, mouthY, v.dx, v.dy - 7, v.clock, Math.min(1, v.t / 6));
};

/** The four scenes in run order. */
export const PAINTERS: readonly Painter[] = [bridge, room, ledge, lair];
