// CENTIPEDE, the cabinet with DUSTIN on its board. A gnome guards the bottom five rows of a mushroom field while a
// centipede winds down from the top a cell at a time: at an edge or a mushroom it drops a row and turns, and once it
// reaches the bottom it keeps bouncing inside the gnome's rows. A hit segment turns into a mushroom and splits the body,
// so the segment behind it becomes a new head. Mushrooms take four hits. A spider zigzags through the gnome's rows,
// eating mushrooms, and pays more the closer it is when shot. Clearing the centipede starts the next wave: faster, with
// more heads and new colors. After a death the chipped mushrooms heal, for 5 points each, and the wave starts over.
// Three lives, an extra one every 12,000.
//
// Segments move along the 8 px cells: each slides from one cell to the next as a shared counter runs 0 to 7, so the
// body is smooth, and every segment walks into the cell its leader just left. Pure logic: the art and draw() are in
// centipede_art.ts.
import type { SfxId } from '../core/types.ts';
import { createRng, randInt } from '../core/rng.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawCentipede } from './centipede_art.ts';
import { CELL, CELLS, FIELD } from './types.ts';
import type { Cart, CartFactory, CartOpts, Pad } from './types.ts';

/** The gnome's rows: the first one, and the last row of the field. */
export const ZONE_ROW = 16, LAST_ROW = CELLS - 1;
export const ZONE_Y = ZONE_ROW * CELL;
/** The gnome's box in px, and where each life starts. */
export const GNOME_W = 7, GNOME_H = 8;
const START_X = 80, START_Y = FIELD - GNOME_H - 1;
export const READY_T = 90, DEATH_T = 80, OVER_T = 120;
const GNOME_SPEED = 1.5, DEAD_ZONE = 0.3;
const SHOT_SPEED = 6, SHOT_GAP = 3;
const EXTRA_LIFE = 12000, MAX_LIVES = 6;
const SEGMENTS = 10;
const HEAD_POINTS = 100, BODY_POINTS = 10, HEAL_POINTS = 5;
/** Spider points by how close it was to the gnome when shot. */
const SPIDER_POINTS: [number, number][] = [[20, 900], [40, 600], [Infinity, 300]];

export type Phase = 'ready' | 'play' | 'dying' | 'gameover' | 'done';

/** One segment. It slides from cell (fx, fy) to cell (tx, ty) as the shared counter `t` runs 0 to 7. `dx` is the way it
 * walks once it gets there, `vy` the way it drops at the next turn (1 down, -1 up). */
export interface Seg { fx: number; fy: number; tx: number; ty: number; dx: number; vy: number }
export interface Spider { x: number; y: number; vx: number; vy: number; dir: number; turn: number }
export interface Popup { x: number; y: number; text: string; t: number }

export interface CentipedeState {
  phase: Phase; timer: number; tick: number;
  score: number; lives: number; wave: number; nextLife: number;
  /** Hits left per cell, 0 to 4, CELLS by CELLS. Row 0 is the score strip and stays empty. */
  mush: Uint8Array;
  /** The gnome's top-left in field px. */
  px: number; py: number;
  /** The shot's tip, or null. One at a time. */
  shot: { x: number; y: number } | null;
  cool: number;
  /** The centipedes, head first. */
  chains: Seg[][];
  /** The shared step counter (0 to 7 px into the current cell) and the leftover fraction of a px. */
  t: number; acc: number;
  spider: Spider | null; spiderWait: number;
  popups: Popup[];
  /** The tick each sound last played, to keep the busy ones down. */
  heard: Record<string, number>;
}

// ---------------------------------------------------------------- the grid
const idx = (cx: number, cy: number): number => cy * CELLS + cx;
const inGrid = (cx: number, cy: number): boolean => cx >= 0 && cx < CELLS && cy >= 1 && cy <= LAST_ROW;
/** Hits left in the mushroom at a cell, 0 for none or off the grid. */
export function mushAt(s: CentipedeState, cx: number, cy: number): number {
  return inGrid(cx, cy) ? s.mush[idx(cx, cy)] : 0;
}
/** A segment's top-left in field px. */
export function segPos(s: CentipedeState, g: Seg): [number, number] {
  return [g.fx * CELL + (g.tx - g.fx) * s.t, g.fy * CELL + (g.ty - g.fy) * s.t];
}
const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean =>
  ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;

/** Px per tick: 1 on the first wave, up to 1.75. */
const waveSpeed = (wave: number): number => Math.min(1 + (wave - 1) * 0.15, 1.75);

function sfx(s: CentipedeState, out: SfxId[], id: SfxId, gap = 0): void {
  if (out.length >= 3 || out.includes(id) || s.tick - (s.heard[id] ?? -999) < gap) return;
  s.heard[id] = s.tick;
  out.push(id);
}

function addScore(s: CentipedeState, n: number, out: SfxId[]): void {
  s.score += n;
  while (s.score >= s.nextLife) {
    s.nextLife += EXTRA_LIFE;
    if (s.lives < MAX_LIVES) { s.lives++; sfx(s, out, 'pickup'); }
  }
}

// ---------------------------------------------------------------- setting up
/** `n` new mushrooms at random on rows 2 to 14, clear of the gnome's rows. */
function plantField(s: CentipedeState, rng: () => number, n: number): void {
  for (let tries = 0; n > 0 && tries < 500; tries++) {
    const i = idx(randInt(rng, 0, CELLS - 1), randInt(rng, 2, ZONE_ROW - 2));
    if (!s.mush[i]) { s.mush[i] = 4; n--; }
  }
}

/** A chain of `len` segments sitting off one side of row `row`, about to walk in. */
function chainAt(edge: number, dir: number, row: number, len: number): Seg[] {
  const out: Seg[] = [];
  for (let k = 0; k < len; k++) { const x = edge - dir * k; out.push({ fx: x, fy: row, tx: x, ty: row, dx: dir, vy: 1 }); }
  return out;
}

/** The wave's centipedes: ten segments, a few of them split off as lone heads from the other side on later waves. */
export function spawnCentipede(s: CentipedeState): void {
  const extra = Math.min(s.wave - 1, 4);
  const dir = s.wave % 2 ? 1 : -1;
  s.chains = [chainAt(dir > 0 ? -1 : CELLS, dir, 1, SEGMENTS - extra)];
  for (let j = 0; j < extra; j++) s.chains.push(chainAt((dir > 0 ? CELLS : -1) + dir * j * 3, -dir, 1 + (j % 2) * 2, 1));
  s.t = 0;
  s.acc = 0;
}

function resetLife(s: CentipedeState): void {
  s.px = START_X; s.py = START_Y;
  s.shot = null; s.cool = 0;
  s.spider = null; s.spiderWait = 300;
  spawnCentipede(s);
  s.phase = 'ready'; s.timer = READY_T;
}

// ---------------------------------------------------------------- the gnome
/** The mushrooms under the gnome's body box at (x, y). */
function mushUnder(s: CentipedeState, x: number, y: number): number[] {
  const x0 = Math.round(x) + 1, y0 = Math.round(y) + 1, w = GNOME_W - 2, h = GNOME_H - 1;
  const out: number[] = [];
  for (let cy = Math.floor(y0 / CELL); cy <= Math.floor((y0 + h - 1) / CELL); cy++) {
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor((x0 + w - 1) / CELL); cx++) {
      if (mushAt(s, cx, cy) && overlap(x0, y0, w, h, cx * CELL, cy * CELL, 7, 7)) out.push(idx(cx, cy));
    }
  }
  return out;
}

/** Half a px at a time, so the gnome stops flush against a mushroom. One it already stands in doesn't block it. */
function moveGnome(s: CentipedeState, pad: Pad): void {
  const vx = Math.abs(pad.mx) > DEAD_ZONE ? Math.sign(pad.mx) : 0;
  const vy = Math.abs(pad.my) > DEAD_ZONE ? Math.sign(pad.my) : 0;
  if (!vx && !vy) return;
  const old = mushUnder(s, s.px, s.py);
  const free = (x: number, y: number): boolean => mushUnder(s, x, y).every((i) => old.includes(i));
  for (let k = 0; k < GNOME_SPEED * 2; k++) {
    const nx = Math.max(0, Math.min(FIELD - GNOME_W, s.px + vx / 2));
    if (vx && free(nx, s.py)) s.px = nx;
    const ny = Math.max(ZONE_Y, Math.min(START_Y, s.py + vy / 2));
    if (vy && free(s.px, ny)) s.py = ny;
  }
}

// ---------------------------------------------------------------- the shot
function killSeg(s: CentipedeState, c: number, i: number, out: SfxId[]): void {
  const chain = s.chains[c], g = chain[i];
  addScore(s, i === 0 ? HEAD_POINTS : BODY_POINTS, out);
  const near = s.t < CELL / 2;
  const cx = near ? g.fx : g.tx, cy = near ? g.fy : g.ty;
  if (inGrid(cx, cy)) s.mush[idx(cx, cy)] = 4;
  s.chains[c] = chain.slice(0, i);
  const back = chain.slice(i + 1);
  if (back.length) {
    // The new head was walking into the new mushroom: it turns now instead.
    const h = back[0];
    if (h.tx === cx && h.ty === cy) aim(s, h);
    s.chains.push(back);
  }
  s.chains = s.chains.filter((ch) => ch.length > 0);
  sfx(s, out, 'kill');
}

function killSpider(s: CentipedeState, out: SfxId[]): void {
  const sp = s.spider as Spider;
  const d = Math.hypot(sp.x + 4 - (s.px + 3), sp.y + 3 - (s.py + 4));
  const pts = (SPIDER_POINTS.find(([r]) => d < r) as [number, number])[1];
  addScore(s, pts, out);
  s.popups.push({ x: Math.max(0, Math.min(FIELD - 12, Math.round(sp.x))), y: Math.round(sp.y), text: String(pts), t: 60 });
  s.spider = null;
  s.spiderWait = spiderGap(s);
  sfx(s, out, 'kill');
  if (pts > 300) sfx(s, out, 'pickup');
}

/** The shot's tip at (x, y): a segment, the spider, then a mushroom. True if it hit something. */
function shotHits(s: CentipedeState, x: number, y: number, out: SfxId[]): boolean {
  for (let c = 0; c < s.chains.length; c++) {
    const chain = s.chains[c];
    for (let i = 0; i < chain.length; i++) {
      const [gx, gy] = segPos(s, chain[i]);
      if (x >= gx && x < gx + 7 && y >= gy && y < gy + 7) { killSeg(s, c, i, out); return true; }
    }
  }
  const sp = s.spider;
  if (sp && x >= sp.x && x < sp.x + 9 && y >= sp.y && y < sp.y + 7) { killSpider(s, out); return true; }
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (mushAt(s, cx, cy)) {
    const i = idx(cx, cy);
    s.mush[i]--;
    if (!s.mush[i]) { addScore(s, 1, out); sfx(s, out, 'step', 4); }
    return true;
  }
  return false;
}

function moveShot(s: CentipedeState, out: SfxId[]): void {
  const shot = s.shot as { x: number; y: number };
  for (let k = 0; k < SHOT_SPEED / 2; k++) {
    shot.y -= 2;
    if (shot.y < 7 || shotHits(s, shot.x, shot.y, out)) { s.shot = null; return; }
  }
}

// ---------------------------------------------------------------- the centipede
/** Picks a head's next cell from where it stands: on along the row, or down a row and back at an edge or a mushroom.
 * Once it has reached the bottom it turns up again, and bounces between the gnome's first row and the last. */
export function aim(s: CentipedeState, h: Seg): void {
  const nx = h.fx + h.dx;
  const inside = h.fx >= 0 && h.fx < CELLS;
  if (inside && (nx < 0 || nx >= CELLS || mushAt(s, nx, h.fy))) {
    let ny = h.fy + h.vy;
    if (ny > LAST_ROW) { h.vy = -1; ny = h.fy - 1; } else if (h.vy < 0 && ny < ZONE_ROW) { h.vy = 1; ny = h.fy + 1; }
    h.tx = h.fx; h.ty = ny; h.dx = -h.dx;
  } else {
    h.tx = nx; h.ty = h.fy;
  }
}

/** Every segment reached its cell: the body moves up one place, and the head picks a new cell. */
function advance(s: CentipedeState, chain: Seg[]): void {
  for (let i = chain.length - 1; i > 0; i--) {
    const g = chain[i], p = chain[i - 1];
    g.fx = g.tx; g.fy = g.ty; g.tx = p.tx; g.ty = p.ty; g.dx = p.dx; g.vy = p.vy;
  }
  const h = chain[0];
  h.fx = h.tx; h.fy = h.ty;
  aim(s, h);
}

function moveCentipede(s: CentipedeState): void {
  s.acc += waveSpeed(s.wave);
  let n = Math.floor(s.acc);
  s.acc -= n;
  while (n-- > 0) {
    if (++s.t < CELL) continue;
    s.t = 0;
    for (const chain of s.chains) advance(s, chain);
  }
}

// ---------------------------------------------------------------- the spider
const spiderGap = (s: CentipedeState): number => Math.max(240, 480 - s.wave * 20);

function spawnSpider(s: CentipedeState, rng: () => number): void {
  const dir = rng() < 0.5 ? 1 : -1;
  s.spider = { x: dir > 0 ? -9 : FIELD, y: randInt(rng, ZONE_Y - 8, FIELD - 8), vx: 0, vy: 0, dir, turn: 0 };
}

/** Diagonal runs and straight hops up and down, the way across from one side to the other. Eats what it walks over. */
function moveSpider(s: CentipedeState, rng: () => number): void {
  const sp = s.spider as Spider;
  if (--sp.turn <= 0) {
    const spd = 0.7 + Math.min(s.wave, 8) * 0.05;
    sp.turn = randInt(rng, 16, 44);
    sp.vx = rng() < 0.3 ? 0 : sp.dir * spd;
    sp.vy = (rng() < 0.5 ? -1 : 1) * (spd + 0.4);
  }
  sp.x += sp.vx; sp.y += sp.vy;
  if (sp.y < ZONE_Y - 16) { sp.y = ZONE_Y - 16; sp.vy = Math.abs(sp.vy); }
  if (sp.y > FIELD - 8) { sp.y = FIELD - 8; sp.vy = -Math.abs(sp.vy); }
  const cx = Math.floor((sp.x + 4) / CELL), cy = Math.floor((sp.y + 3) / CELL);
  if (mushAt(s, cx, cy)) s.mush[idx(cx, cy)] = 0;
  if ((sp.dir > 0 && sp.x > FIELD) || (sp.dir < 0 && sp.x < -9)) { s.spider = null; s.spiderWait = spiderGap(s); }
}

// ---------------------------------------------------------------- a tick
function touched(s: CentipedeState): boolean {
  const ax = Math.round(s.px) + 1, ay = Math.round(s.py) + 1, aw = GNOME_W - 2, ah = GNOME_H - 1;
  for (const chain of s.chains) {
    for (const g of chain) {
      const [x, y] = segPos(s, g);
      if (overlap(ax, ay, aw, ah, x + 1, y + 1, 5, 5)) return true;
    }
  }
  const sp = s.spider;
  return !!sp && overlap(ax, ay, aw, ah, Math.round(sp.x) + 1, Math.round(sp.y) + 1, 7, 5);
}

function play(s: CentipedeState, rng: () => number, pad: Pad, out: SfxId[]): void {
  moveGnome(s, pad);
  if (s.cool > 0) s.cool--;
  if (!s.shot && (pad.firePressed || (pad.fire && s.cool === 0))) {
    s.shot = { x: Math.round(s.px) + 3, y: Math.round(s.py) - 1 };
    s.cool = SHOT_GAP;
    sfx(s, out, 'rock', 6);
  }
  if (s.shot) moveShot(s, out);
  moveCentipede(s);
  if (s.spider) moveSpider(s, rng);
  else if (--s.spiderWait <= 0) spawnSpider(s, rng);
  if (touched(s)) {
    s.phase = 'dying'; s.timer = DEATH_T; s.shot = null;
    sfx(s, out, 'ko');
    return;
  }
  if (!s.chains.length) {
    s.wave++;
    spawnCentipede(s);
    plantField(s, rng, 3);
    sfx(s, out, 'confirm');
  }
}

/** The death has played out: the next life, with the field healed, or the end. */
function loseLife(s: CentipedeState, out: SfxId[]): void {
  s.lives--;
  if (s.lives <= 0) { s.phase = 'gameover'; s.timer = OVER_T; return; }
  let healed = 0;
  for (let i = 0; i < s.mush.length; i++) if (s.mush[i] && s.mush[i] < 4) { s.mush[i] = 4; healed++; }
  if (healed) addScore(s, healed * HEAL_POINTS, out);
  resetLife(s);
}

function step(s: CentipedeState, rng: () => number, pad: Pad): SfxId[] {
  const out: SfxId[] = [];
  if (s.phase === 'done') return out;
  s.tick++;
  for (const p of s.popups) p.t--;
  s.popups = s.popups.filter((p) => p.t > 0);
  if (s.phase === 'play') play(s, rng, pad, out);
  else if (--s.timer > 0) return out;
  else if (s.phase === 'ready') { s.phase = 'play'; sfx(s, out, 'confirm'); }
  else if (s.phase === 'dying') loseLife(s, out);
  else s.phase = 'done';
  return out;
}

/** The cart and its live state, for tests that set up a board by hand. */
export function buildCentipede(opts: CartOpts): { cart: Cart; s: CentipedeState } {
  const rng = createRng(opts.seed);
  const s: CentipedeState = {
    phase: 'ready', timer: READY_T, tick: 0,
    score: 0, lives: 3, wave: 1, nextLife: EXTRA_LIFE,
    mush: new Uint8Array(CELLS * CELLS),
    px: START_X, py: START_Y, shot: null, cool: 0,
    chains: [], t: 0, acc: 0,
    spider: null, spiderWait: 300,
    popups: [], heard: {},
  };
  plantField(s, rng, randInt(rng, 32, 38));
  resetLife(s);
  const cart: Cart = {
    get score() { return s.score; },
    get lives() { return s.lives; },
    get over() { return s.phase === 'done'; },
    step: (pad: Pad) => step(s, rng, pad),
    draw: (ctx: Ctx, ox: number, oy: number) => drawCentipede(ctx, ox, oy, s, opts.best),
  };
  return { cart, s };
}

export const createCentipede: CartFactory = (opts) => buildCentipede(opts).cart;
