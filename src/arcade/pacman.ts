// PAC-MAN and MS. PAC-MAN: one engine, two mazes. The player and four ghosts move a pixel at a time on the 8 px grid,
// with speeds kept as sixteenths of a pixel per tick so every run is the same for a seed. The stick's last direction is
// held and taken at the first cell center where it's open, and a reverse is taken at once.
//
// The ghosts leave the house one by one and switch between scatter (each to its own corner) and chase on a timer.
// Blinky (red) chases your cell, Pinky (pink) aims 4 cells ahead of you, Inky (cyan) mirrors Blinky through the cell 2
// ahead of you, and Clyde (orange) chases from far off and runs for his corner when he gets close. A power pellet turns
// the ghosts that are out blue for a few seconds (white flashes near the end), they turn round, and eating them in a row
// is worth 200, 400, 800 and 1600. An eaten ghost's eyes run back to the house and come out again.
//
// Dots are 10, pellets 50, and a fruit shows under the house twice a round (100, 300, then 500). Clearing the maze
// flashes the walls and starts the next round a little faster, with shorter blue time. 3 lives, and one more at 10000.
import { createRng } from '../core/rng.ts';
import type { SfxId } from '../core/types.ts';
import { rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawTinyText, tinyWidth } from '../gfx/font.ts';
import type { ColorName } from '../gfx/palette.ts';
import {
  chompFrame, EYES, facing, FRIGHT_BLUE, FRIGHT_WHITE, FRUIT_POINTS, FRUITS, GHOSTS, MS, MS_LIFE, PAC, PAC_DEATH, PAC_LIFE,
  wallCanvas,
} from './pacman_art.ts';
import { isPath, MAZE_H, MAZE_W, MAZES } from './pacman_mazes.ts';
import type { MazeId } from './pacman_mazes.ts';
import { drawBanner, drawLives, drawScoreLine } from './sprite.ts';
import { CELL, DX, DY, FIELD, stickDir } from './types.ts';
import type { Cart, CartFactory, CartOpts, Dir, Pad } from './types.ts';

const MW = MAZE_W * CELL;
/** Ticks for each stretch of a life or round. */
export const READY_T = 90, DYING_T = 90, CLEAR_T = 130, EAT_T = 36, GAMEOVER_T = 120, FRUIT_T = 540;
/** Scatter, chase, scatter, chase, scatter, then chase for good. */
const PHASES = [420, 1200, 420, 1200, 300];
const DIRS: readonly Dir[] = ['up', 'left', 'down', 'right'];
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const EXTRA_LIFE = 10000;

export type GhostState = 'house' | 'leaving' | 'out' | 'eyes' | 'entering';
export interface Ghost {
  /** Center pixel in maze space (0 to 167 across, 0 to 151 down). */
  x: number; y: number; dir: Dir; state: GhostState; fright: boolean;
  /** Sixteenths of a pixel carried to the next tick. */
  acc: number;
}
export type PacMode = 'ready' | 'play' | 'eat' | 'dying' | 'clear' | 'gameover' | 'over';
export interface Pop { x: number; y: number; text: string; t: number; color: ColorName }
export interface PacState {
  maze: MazeId; rows: readonly string[];
  score: number; lives: number; round: number;
  mode: PacMode; t: number;
  /** Ticks of play this life, for letting the ghosts out. */
  life: number;
  x: number; y: number; dir: Dir; wish: Dir | null; acc: number; moving: boolean; anim: number;
  /** Per cell: 0 nothing, 1 a dot, 2 a pellet. */
  dots: Uint8Array; left: number; total: number; eaten: number;
  ghosts: Ghost[];
  fright: number; chain: number;
  phase: number; phaseT: number;
  fruit: number;
  pops: Pop[];
  chomp: number;
  extra: boolean;
}

type Cell = [number, number];
interface MazeInfo { start: Cell; door: Cell; house: Cell[]; fruit: Cell; dots: Uint8Array }
const infoCache = new Map<MazeId, MazeInfo>();
/** Where things start in a maze, read from its rows once. */
export function mazeInfo(id: MazeId): MazeInfo {
  let m = infoCache.get(id);
  if (m) return m;
  const rows = MAZES[id].rows;
  const find = (ch: string): [number, number][] => {
    const out: [number, number][] = [];
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === ch) out.push([x, y]); });
    return out;
  };
  const dots = new Uint8Array(MAZE_W * MAZE_H);
  rows.forEach((r, y) => { for (let x = 0; x < MAZE_W; x++) dots[y * MAZE_W + x] = r[x] === '.' ? 1 : r[x] === 'o' ? 2 : 0; });
  m = { start: find('P')[0] as Cell, door: find('-')[0] as Cell, house: find('G'), fruit: find('F')[0] as Cell, dots };
  infoCache.set(id, m);
  return m;
}

const mid = (c: number): number => c * CELL + 4;
const atCenter = (x: number, y: number): boolean => (x & 7) === 4 && (y & 7) === 4;
const wrapX = (x: number): number => (x + MW) % MW;
const wrapDx = (d: number): number => (d > MW / 2 ? d - MW : d < -MW / 2 ? d + MW : d);

function cellAt(s: PacState, cx: number, cy: number): string | undefined {
  const row = s.rows[cy];
  if (!row) return undefined;
  if (cx < 0 || cx >= MAZE_W) return row[0] === 'T' ? 'T' : undefined;
  return row[cx];
}
const open = (s: PacState, cx: number, cy: number): boolean => isPath(cellAt(s, cx, cy));

// ---------------------------------------------------------------- tuning by round
const pacSpeed = (s: PacState): number => 12 + Math.min(4, s.round - 1) + (s.fright > 0 ? 2 : 0);
const ghostBase = (s: PacState): number => 10 + Math.min(5, s.round - 1);
const frightTime = (round: number): number => Math.max(60, 360 - 50 * (round - 1));
const RELEASE = [0, 30, 240, 480];
const releaseAt = (s: PacState, i: number): number => Math.round((RELEASE[i] as number) * Math.max(0.4, 1 - 0.15 * (s.round - 1)));
const fruitKind = (round: number): number => Math.min(FRUITS.length - 1, round - 1);

function ghostSpeed(s: PacState, g: Ghost, i: number): number {
  if (g.state === 'eyes') return 32;
  if (g.state === 'entering') return 16;
  if (g.state === 'leaving' || g.state === 'house') return 8;
  if (g.fright) return 8;
  if (cellAt(s, g.x >> 3, g.y >> 3) === 'T') return 7;
  // Blinky hurries when the maze is nearly clear.
  return ghostBase(s) + (i === 0 && s.left <= 20 ? 2 : 0);
}

// ---------------------------------------------------------------- setup
function resetLife(s: PacState): void {
  const m = mazeInfo(s.maze);
  s.x = mid(m.start[0]); s.y = mid(m.start[1]); s.dir = 'left'; s.wish = null; s.acc = 0; s.moving = false; s.anim = 0;
  const [dx, dy] = m.door;
  const house = m.house;
  const homes: [number, number][] = [[dx, dy - 1], house[1] ?? m.door, house[0] ?? m.door, house[2] ?? m.door];
  s.ghosts = homes.map(([hx, hy], i) => (
    { x: mid(hx), y: mid(hy), dir: i === 0 ? 'left' : 'up', state: i === 0 ? 'out' : 'house', fright: false, acc: 0 }));
  s.fright = 0; s.chain = 0; s.phase = 0; s.phaseT = 0; s.life = 0; s.fruit = 0; s.pops = [];
}

function newRound(s: PacState): void {
  s.dots = mazeInfo(s.maze).dots.slice();
  s.total = s.dots.reduce((n, d) => n + (d ? 1 : 0), 0);
  s.left = s.total; s.eaten = 0;
  resetLife(s);
}

function setMode(s: PacState, mode: PacMode): void { s.mode = mode; s.t = 0; }

// ---------------------------------------------------------------- the ghosts
function targetFor(s: PacState, i: number): [number, number] {
  const px = s.x >> 3, py = s.y >> 3;
  const scatter = s.phase % 2 === 0 && s.phase < PHASES.length;
  const corners: [number, number][] = [[MAZE_W - 2, -3], [1, -3], [MAZE_W - 1, MAZE_H + 1], [0, MAZE_H + 1]];
  if (scatter) return corners[i] as [number, number];
  if (i === 1) return [px + DX[s.dir] * 4, py + DY[s.dir] * 4];
  if (i === 2) {
    const b = s.ghosts[0] as Ghost;
    const vx = px + DX[s.dir] * 2, vy = py + DY[s.dir] * 2;
    return [vx * 2 - (b.x >> 3), vy * 2 - (b.y >> 3)];
  }
  if (i === 3) {
    const d2 = (px - (s.ghosts[3] as Ghost).x / 8) ** 2 + (py - (s.ghosts[3] as Ghost).y / 8) ** 2;
    return d2 > 36 ? [px, py] : corners[3] as [number, number];
  }
  return [px, py];
}

function chooseDir(s: PacState, g: Ghost, i: number, rng: () => number): Dir {
  const cx = g.x >> 3, cy = g.y >> 3;
  const opts = DIRS.filter((d) => d !== OPP[g.dir] && open(s, cx + DX[d], cy + DY[d]));
  if (!opts.length) return OPP[g.dir];
  if (g.fright) return opts[Math.floor(rng() * opts.length)] as Dir;
  const m = mazeInfo(s.maze);
  const [tx, ty] = g.state === 'eyes' ? [m.door[0], m.door[1] - 1] : targetFor(s, i);
  let best = opts[0] as Dir, bd = Infinity;
  for (const d of opts) {
    const dd = (cx + DX[d] - tx) ** 2 + (cy + DY[d] - ty) ** 2;
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

function ghostPx(s: PacState, g: Ghost, i: number, rng: () => number): void {
  const m = mazeInfo(s.maze);
  const doorX = mid(m.door[0]), outY = mid(m.door[1] - 1), inY = mid(m.door[1] + 1);
  if (g.state === 'leaving') {
    if (g.x !== doorX) g.x += Math.sign(doorX - g.x);
    else if (g.y > outY) { g.y -= 1; g.dir = 'up'; } else { g.state = 'out'; g.fright = false; g.dir = i % 2 ? 'right' : 'left'; }
    return;
  }
  if (g.state === 'entering') {
    if (g.y < inY) { g.y += 1; g.dir = 'down'; } else { g.state = 'leaving'; g.fright = false; }
    return;
  }
  if (g.state !== 'out' && g.state !== 'eyes') return;
  if (atCenter(g.x, g.y)) {
    if (g.state === 'eyes' && g.x === doorX && g.y === outY) { g.state = 'entering'; return; }
    g.dir = chooseDir(s, g, i, rng);
  }
  g.x = wrapX(g.x + DX[g.dir]); g.y += DY[g.dir];
}

// ---------------------------------------------------------------- the player
function eatAt(s: PacState, out: SfxId[]): void {
  const k = (s.y >> 3) * MAZE_W + (s.x >> 3);
  const d = s.dots[k];
  if (!d) return;
  s.dots[k] = 0; s.left--; s.eaten++;
  if (d === 2) {
    s.score += 50;
    out.push('pickup');
    s.fright = frightTime(s.round); s.chain = 0;
    for (const g of s.ghosts) if (g.state === 'out') { g.fright = true; g.dir = OPP[g.dir]; }
  } else {
    s.score += 10;
    if (s.chomp >= 10) { out.push('step'); s.chomp = 0; }
  }
  if (s.eaten === Math.floor(s.total * 0.3) || s.eaten === Math.floor(s.total * 0.7)) s.fruit = FRUIT_T;
}

function pacPx(s: PacState, out: SfxId[]): boolean {
  if (atCenter(s.x, s.y)) {
    const cx = s.x >> 3, cy = s.y >> 3;
    if (s.wish && open(s, cx + DX[s.wish], cy + DY[s.wish])) s.dir = s.wish;
    if (!open(s, cx + DX[s.dir], cy + DY[s.dir])) return false;
  } else if (s.wish === OPP[s.dir]) s.dir = s.wish;
  s.x = wrapX(s.x + DX[s.dir]); s.y += DY[s.dir];
  eatAt(s, out);
  return true;
}

const near = (ax: number, ay: number, bx: number, by: number): boolean => Math.abs(wrapDx(ax - bx)) < 6 && Math.abs(ay - by) < 6;

// ---------------------------------------------------------------- one tick
function play(s: PacState, pad: Pad, rng: () => number, out: SfxId[]): void {
  const want = stickDir(pad);
  if (want) s.wish = want;
  s.life++; s.chomp++;
  s.acc += pacSpeed(s);
  const n = s.acc >> 4;
  s.acc &= 15;
  let moved = 0, blocked = false;
  for (let k = 0; k < n && !blocked; k++) { if (pacPx(s, out)) moved++; else blocked = true; }
  if (blocked) s.moving = false; else if (moved) s.moving = true;
  if (s.moving) s.anim++;

  if (s.fright > 0) {
    s.fright--;
    if (s.fright === 0) for (const g of s.ghosts) g.fright = false;
  } else if (s.phase < PHASES.length && ++s.phaseT >= (PHASES[s.phase] as number)) {
    s.phase++; s.phaseT = 0;
    for (const g of s.ghosts) if (g.state === 'out') g.dir = OPP[g.dir];
  }
  s.ghosts.forEach((g, i) => {
    if (g.state === 'house' && s.life >= releaseAt(s, i)) g.state = 'leaving';
    g.acc += ghostSpeed(s, g, i);
    for (let n = g.acc >> 4; n > 0; n--) ghostPx(s, g, i, rng);
    g.acc &= 15;
  });

  if (s.fruit > 0) {
    s.fruit--;
    const [fx, fy] = mazeInfo(s.maze).fruit;
    if (near(s.x, s.y, mid(fx), mid(fy))) {
      const pts = FRUIT_POINTS[fruitKind(s.round)] as number;
      s.score += pts; s.fruit = 0; out.push('pickup');
      s.pops.push({ x: mid(fx), y: mid(fy), text: String(pts), t: 90, color: 'pink' });
    }
  }
  for (const g of s.ghosts) {
    if (g.state !== 'out' || !near(s.x, s.y, g.x, g.y)) continue;
    if (g.fright) {
      const pts = 200 << Math.min(3, s.chain++);
      s.score += pts; out.push('kill');
      g.state = 'eyes'; g.fright = false;
      s.pops.push({ x: g.x, y: g.y, text: String(pts), t: EAT_T, color: 'cyan' });
      setMode(s, 'eat');
      return;
    }
    out.push('ko');
    setMode(s, 'dying');
    s.lives--;
    return;
  }
  if (s.left === 0) { out.push('levelUp'); setMode(s, 'clear'); }
}

function step(s: PacState, pad: Pad, rng: () => number): SfxId[] {
  const out: SfxId[] = [];
  if (s.mode === 'over') return out;
  const before = s.score;
  s.t++;
  for (const p of s.pops) p.t--;
  s.pops = s.pops.filter((p) => p.t > 0);
  switch (s.mode) {
    case 'ready':
      if (s.t === 1) out.push('confirm');
      if (s.t >= READY_T) setMode(s, 'play');
      break;
    case 'play': play(s, pad, rng, out); break;
    case 'eat': if (s.t >= EAT_T) setMode(s, 'play'); break;
    case 'dying':
      if (s.t >= DYING_T) {
        if (s.lives > 0) { resetLife(s); setMode(s, 'ready'); } else setMode(s, 'gameover');
      }
      break;
    case 'clear':
      if (s.t >= CLEAR_T) { s.round++; newRound(s); setMode(s, 'ready'); }
      break;
    case 'gameover': if (s.t >= GAMEOVER_T) setMode(s, 'over'); break;
  }
  if (!s.extra && before < EXTRA_LIFE && s.score >= EXTRA_LIFE) { s.extra = true; s.lives++; }
  return out.slice(0, 3);
}

// ---------------------------------------------------------------- drawing
function drawWrapped(x: number, draw: (x: number) => void): void {
  draw(x);
  if (x < 5) draw(x + MW);
  else if (x > MW - 6) draw(x - MW);
}

function drawField(s: PacState, ctx: Ctx, mx: number, my: number): void {
  const def = MAZES[s.maze];
  const m = mazeInfo(s.maze);
  const flash = s.mode === 'clear' && s.t >= 30 && Math.floor((s.t - 30) / 12) % 2 === 0;
  ctx.drawImage(wallCanvas(s.rows, flash ? 'white' : def.line, def.fill), mx, my);
  rect(ctx, mx + m.door[0] * CELL - 2, my + m.door[1] * CELL + 3, CELL + 4, 2, def.door);
  const blink = s.mode === 'play' && (s.t >> 3) % 2 === 1;
  for (let i = 0; i < s.dots.length; i++) {
    const d = s.dots[i];
    if (!d) continue;
    const x = mx + (i % MAZE_W) * CELL, y = my + Math.floor(i / MAZE_W) * CELL;
    if (d === 1) rect(ctx, x + 3, y + 3, 2, 2, def.dot);
    else if (!blink) { rect(ctx, x + 1, y + 2, 6, 4, def.dot); rect(ctx, x + 2, y + 1, 4, 6, def.dot); }
  }
  if (s.fruit > 0) FRUITS[fruitKind(s.round)]?.draw(ctx, mx + mid(m.fruit[0]) - 4, my + mid(m.fruit[1]) - 4);

  const hideGhosts = (s.mode === 'dying' && s.t >= 30) || (s.mode === 'clear' && s.t >= 30) || s.mode === 'gameover';
  const frame = (s.t >> 3) & 1;
  if (!hideGhosts) {
    s.ghosts.forEach((g, i) => {
      if (s.mode === 'eat' && g.state === 'eyes' && s.pops.some((p) => p.x === g.x && p.y === g.y)) return;
      const bob = g.state === 'house' ? ((s.t >> 4) % 2 ? -1 : 1) : 0;
      const gy = my + g.y - 4 + bob;
      drawWrapped(g.x, (x) => {
        const gx = mx + x - 4;
        if (g.state === 'eyes' || g.state === 'entering') { EYES[g.dir].draw(ctx, gx, gy); return; }
        if (g.fright) {
          const white = s.fright < 100 && (s.fright >> 3) % 2 === 0;
          (white ? FRIGHT_WHITE : FRIGHT_BLUE)[frame]?.draw(ctx, gx, gy);
          return;
        }
        GHOSTS[i]?.[frame]?.draw(ctx, gx, gy);
        EYES[g.dir].draw(ctx, gx, gy);
      });
    });
  }
  const showPac = s.mode !== 'eat' && s.mode !== 'gameover' && !(s.mode === 'clear' && s.t >= CLEAR_T - 10);
  if (showPac) {
    const py = my + s.y - 4;
    drawWrapped(s.x, (x) => {
      if (s.mode === 'dying') {
        if (s.t < 30) (s.maze === 'mspacman' ? MS : PAC)[1]?.draw(ctx, mx + x - 4, py, facing(s.dir).turn, facing(s.dir).flip);
        else { const f = Math.floor((s.t - 30) / 5); if (f < PAC_DEATH.length) PAC_DEATH[f]?.draw(ctx, mx + x - 4, py); }
        return;
      }
      const set = s.maze === 'mspacman' ? MS : PAC;
      const f = s.mode === 'ready' ? (s.maze === 'mspacman' ? 1 : 0) : s.moving ? chompFrame(s.anim) : 1;
      const { turn, flip } = facing(s.dir);
      set[f]?.draw(ctx, mx + x - 4, py, turn, flip);
    });
  }
  for (const p of s.pops) drawTinyText(ctx, p.text, mx + p.x - Math.floor(tinyWidth(p.text) / 2), my + p.y - 2, p.color);
}

function drawPac(s: PacState, best: number, ctx: Ctx, ox: number, oy: number): void {
  rect(ctx, ox, oy, FIELD, FIELD, 'black');
  const mx = ox, my = oy + CELL;
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, MW, MAZE_H * CELL);
  ctx.clip();
  drawField(s, ctx, mx, my);
  ctx.restore();
  drawScoreLine(ctx, ox, oy, s.score, best);
  const spare = s.mode === 'dying' || s.mode === 'gameover' || s.mode === 'over' ? s.lives : s.lives - 1;
  drawLives(ctx, ox, oy, Math.max(0, spare), s.maze === 'mspacman' ? MS_LIFE : PAC_LIFE);
  // The fruit of this round and the ones before, bottom right.
  for (let r = s.round, i = 0; r >= 1 && i < 5; r--, i++) {
    FRUITS[fruitKind(r)]?.draw(ctx, ox + FIELD - 11 - i * 10, oy + FIELD - 9);
  }
  const by = CELL + mazeInfo(s.maze).fruit[1] * CELL + 1;
  if (s.mode === 'ready') drawBanner(ctx, ox, oy, by, 'READY!', 'yellow');
  if (s.mode === 'gameover' || s.mode === 'over') drawBanner(ctx, ox, oy, by, 'GAME OVER', 'hot');
}

// ---------------------------------------------------------------- the carts
/** A Pac-Man cart and its state, for tests that look inside. */
export function buildPacman(opts: CartOpts, maze: MazeId): { cart: Cart; s: PacState } {
  const rng = createRng(opts.seed);
  const s: PacState = {
    maze, rows: MAZES[maze].rows, score: 0, lives: 3, round: 1, mode: 'ready', t: 0, life: 0,
    x: 0, y: 0, dir: 'left', wish: null, acc: 0, moving: false, anim: 0,
    dots: new Uint8Array(0), left: 0, total: 0, eaten: 0, ghosts: [],
    fright: 0, chain: 0, phase: 0, phaseT: 0, fruit: 0, pops: [], chomp: 99, extra: false,
  };
  newRound(s);
  const cart: Cart = {
    get score() { return s.score; },
    get lives() { return s.lives; },
    get over() { return s.mode === 'over'; },
    step: (pad) => step(s, pad, rng),
    draw: (ctx, ox, oy) => drawPac(s, opts.best, ctx, ox, oy),
  };
  return { cart, s };
}

export const createPacman: CartFactory = (opts) => buildPacman(opts, 'pacman').cart;
export const createMsPacman: CartFactory = (opts) => buildPacman(opts, 'mspacman').cart;
