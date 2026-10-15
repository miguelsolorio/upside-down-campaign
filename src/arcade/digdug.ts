// DIG DUG, the cabinet with MADMAX on its board. The digger starts on the surface over four strata of dirt and tunnels
// wherever he walks. Pookas and Fygars wait in pockets of their own; they walk the tunnels toward him, and now and then
// turn to ghost eyes and drift through the dirt. The harpoon flies three cells down a tunnel, and four pumps pop
// whatever it hooks, for more points the deeper it is (a Fygar pumped from the side is worth double). A Fygar that sees
// him along a row winds up and breathes fire through the dirt. Rocks fall when the dirt under them is dug, and crush
// everything they land on. When one enemy is left it runs for the surface and off the left edge. Clear the field and the
// next round has more of them. Three lives, an extra one at 10,000.
//
// The dirt is a grid of 4 px blocks, so tunnels are smooth; movement keeps to the 8 px cells, turning only where a cell
// lines up. Pure logic: the art and draw() are in digdug_art.ts.
import type { SfxId } from '../core/types.ts';
import { createRng } from '../core/rng.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawDigDug } from './digdug_art.ts';
import { CELL, DX, DY, FIELD, stickDir } from './types.ts';
import type { Cart, CartOpts, Dir, Pad } from './types.ts';

/** Blocks per side of the dirt grid (4 px each). */
export const BLOCKS = FIELD / 4;
/** The surface row the digger walks, and the first and last rows of dirt. */
export const SURFACE = 2, DIRT_TOP = 3, DIRT_BOTTOM = 19;
const MIN_Y = SURFACE * CELL, MAX_Y = DIRT_BOTTOM * CELL, MAX_X = FIELD - CELL;
const START_X = 10 * CELL;
const POINTS_BY_LAYER = [200, 300, 400, 500];
const CRUSH_POINTS = [0, 1000, 2500, 4000, 6000, 8000];
const READY_T = 90, DEAD_T = 100, CLEAR_T = 100, OVER_T = 130;
const PUMPS_TO_POP = 4;
const HARPOON_MAX = 26;
const EXTRA_LIFE = 10000;

export type MobKind = 'pooka' | 'fygar';
export interface Mob {
  kind: MobKind;
  x: number; y: number;
  dir: Dir;
  face: 'left' | 'right';
  homeX: number; homeY: number;
  ghost: boolean;
  /** Ticks spent as a ghost, and ticks of walking left before the next one. */
  ghostT: number; ghostIn: number;
  /** Pumps in it (0 = walking). Deflates one every 40 ticks once the harpoon lets go. */
  inflate: number; deflateT: number;
  /** Ticks since it popped, or -1. Crushed mobs ride the rock instead. */
  popT: number;
  crushed: boolean;
  escaping: boolean;
  /** Fire: wind-up ticks left, breath ticks left, ticks until it may breathe again. */
  windT: number; fireT: number; fireCd: number;
  acc: number;
  gone: boolean;
}

export interface Rock { x: number; y: number; state: 'rest' | 'wobble' | 'fall' | 'crumble'; t: number; crushed: Mob[]; hitPlayer: boolean }

export interface Harpoon { dir: Dir; len: number; state: 'out' | 'hooked' | 'back'; target: Mob | null; idle: number }

export interface Popup { x: number; y: number; text: string; t: number }

export type Phase = 'ready' | 'play' | 'dead' | 'clear' | 'gameover' | 'over';

export interface DigState {
  rng: () => number;
  t: number;
  phase: Phase; phaseT: number;
  round: number;
  score: number; lives: number; best: number; extra: boolean;
  /** 1 where a 4 px block is dug, BLOCKS by BLOCKS. The sky rows are always open. */
  dug: Uint8Array;
  /** 1 where an 8 px cell has paid its 10 points. */
  paid: Uint8Array;
  player: { x: number; y: number; dir: Dir; face: 'left' | 'right'; moving: boolean; step: number };
  mobs: Mob[];
  rocks: Rock[];
  harpoon: Harpoon | null;
  popups: Popup[];
  /** How the digger died this life, for the death art. */
  deathBy: 'touch' | 'fire' | 'rock';
}

// ---------------------------------------------------------------- the dirt
const bi = (bx: number, by: number): number => by * BLOCKS + bx;
export function blockDug(s: DigState, bx: number, by: number): boolean {
  if (bx < 0 || by < 0 || bx >= BLOCKS || by >= BLOCKS) return false;
  return s.dug[bi(bx, by)] === 1;
}
function digRect(s: DigState, x: number, y: number, w: number, h: number): boolean {
  let fresh = false;
  for (let by = Math.floor(y / 4); by <= Math.floor((y + h - 1) / 4); by++) {
    for (let bx = Math.floor(x / 4); bx <= Math.floor((x + w - 1) / 4); bx++) {
      if (bx < 0 || by < 0 || bx >= BLOCKS || by >= BLOCKS) continue;
      if (s.dug[bi(bx, by)] === 0) { s.dug[bi(bx, by)] = 1; fresh = true; }
    }
  }
  return fresh;
}
/** Every block of an 8 px cell is dug. Rows above the dirt are open; the row under the field is not. */
export function cellOpen(s: DigState, c: number, r: number): boolean {
  if (c < 0 || c >= 21 || r < 1 || r > DIRT_BOTTOM) return false;
  return blockDug(s, c * 2, r * 2) && blockDug(s, c * 2 + 1, r * 2) && blockDug(s, c * 2, r * 2 + 1) && blockDug(s, c * 2 + 1, r * 2 + 1);
}
const rockAt = (s: DigState, x: number, y: number): boolean =>
  s.rocks.some((k) => (k.state === 'rest' || k.state === 'wobble') && Math.abs(k.x - x) < CELL && Math.abs(k.y - y) < CELL);

/** The layer an enemy is in, for its points: 0 near the top to 3 at the bottom. */
export function layerOf(y: number): number {
  const r = Math.round(y / CELL);
  return Math.max(0, Math.min(3, Math.floor((r - DIRT_TOP) / 4)));
}

// ---------------------------------------------------------------- a round
function newRound(s: DigState): void {
  s.dug.fill(0);
  s.paid.fill(0);
  // The sky and the surface are open, and a shaft runs down the middle to start from.
  for (let by = 0; by < DIRT_TOP * 2; by++) for (let bx = 0; bx < BLOCKS; bx++) s.dug[bi(bx, by)] = 1;
  digRect(s, START_X, DIRT_TOP * CELL, CELL, 6 * CELL);
  const taken = new Set<number>();
  const mark = (c: number, r: number): void => { taken.add(r * 21 + c); s.paid[r * 21 + c] = 1; };
  for (let r = 0; r <= 9; r++) for (let c = 8; c <= 12; c++) mark(c, r);
  const count = Math.min(3 + s.round, 8);
  const fygars = Math.max(1, Math.floor(count / 2.5));
  s.mobs = [];
  for (let i = 0; i < count; i++) {
    const horiz = s.rng() < 0.6;
    const len = horiz ? 4 : 3;
    for (let tries = 0; tries < 200; tries++) {
      const r = DIRT_TOP + 1 + Math.floor(s.rng() * (DIRT_BOTTOM - DIRT_TOP - (horiz ? 1 : len)));
      const c = 1 + Math.floor(s.rng() * (21 - 2 - (horiz ? len : 0)));
      const cells: [number, number][] = [];
      for (let k = 0; k < len; k++) cells.push(horiz ? [c + k, r] : [c, r + k]);
      // Keep a cell of dirt between pockets, and off the start shaft.
      const clash = cells.some(([cc, rr]) => {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (taken.has((rr + dy) * 21 + cc + dx)) return true;
        return false;
      });
      if (clash) continue;
      for (const [cc, rr] of cells) { digRect(s, cc * CELL, rr * CELL, CELL, CELL); mark(cc, rr); }
      const [mc, mr] = cells[len >> 1] as [number, number];
      s.mobs.push(newMob(s, i < fygars ? 'fygar' : 'pooka', mc * CELL, mr * CELL, horiz ? 'left' : 'up'));
      break;
    }
  }
  // Rocks sit in solid dirt with solid dirt under them, so none falls before the digger touches it.
  s.rocks = [];
  const rocks = 3 + (s.round > 3 ? 1 : 0);
  for (let i = 0, tries = 0; i < rocks && tries < 300; tries++) {
    const c = 1 + Math.floor(s.rng() * 19), r = DIRT_TOP + 1 + Math.floor(s.rng() * 11);
    if (taken.has(r * 21 + c) || taken.has((r + 1) * 21 + c) || taken.has((r - 1) * 21 + c)) continue;
    mark(c, r);
    s.rocks.push({ x: c * CELL, y: r * CELL, state: 'rest', t: 0, crushed: [], hitPlayer: false });
    i++;
  }
  s.harpoon = null;
  s.popups = [];
  resetPlayer(s);
}

function newMob(s: DigState, kind: MobKind, x: number, y: number, dir: Dir): Mob {
  return {
    kind, x, y, dir, face: s.rng() < 0.5 ? 'left' : 'right', homeX: x, homeY: y, ghost: false, ghostT: 0, ghostIn: ghostDelay(s),
    inflate: 0, deflateT: 0, popT: -1, crushed: false, escaping: false, windT: 0, fireT: 0, fireCd: 120, acc: 0, gone: false,
  };
}

/** Ticks before a mob goes ghost: shorter every round. */
const ghostDelay = (s: DigState): number => Math.max(240, 720 - s.round * 60) + Math.floor(s.rng() * 360);

function resetPlayer(s: DigState): void {
  s.player = { x: START_X, y: MIN_Y, dir: 'down', face: 'right', moving: false, step: 0 };
}

/** After a death: the digger back on the surface, the mobs that are left back in their pockets. */
function resetLife(s: DigState): void {
  resetPlayer(s);
  s.harpoon = null;
  for (const m of s.mobs) {
    if (m.gone || m.popT >= 0 || m.crushed) continue;
    Object.assign(m, { x: m.homeX, y: m.homeY, ghost: false, ghostT: 0, ghostIn: ghostDelay(s), inflate: 0, windT: 0, fireT: 0, fireCd: 120, escaping: false });
  }
}

const alive = (m: Mob): boolean => !m.gone && m.popT < 0 && !m.crushed;

// ---------------------------------------------------------------- the digger
const vertical = (d: Dir): boolean => d === 'up' || d === 'down';

function stepPlayer(s: DigState, pad: Pad, out: SfxId[]): void {
  const p = s.player;
  const want = stickDir(pad);
  p.moving = false;
  const h = s.harpoon;
  if (h) {
    // Moving lets go of the harpoon. It can't move while the harpoon is out.
    if (want && h.state === 'hooked') h.state = 'back';
    return;
  }
  if (pad.firePressed) {
    s.harpoon = { dir: p.dir, len: 0, state: 'out', target: null, idle: 0 };
    out.push('swing');
    return;
  }
  if (!want) return;
  let d = want;
  // A turn waits for the cell to line up, so tunnels stay on the grid.
  if (vertical(d) !== vertical(p.dir)) {
    const along = vertical(p.dir) ? p.y : p.x;
    if (along % CELL !== 0) d = p.dir;
  }
  const nx = p.x + DX[d], ny = p.y + DY[d];
  if (nx < 0 || nx > MAX_X || ny < MIN_Y || ny > MAX_Y) { p.dir = d; return; }
  if (rockAt(s, nx, ny)) { p.dir = d; return; }
  // Digging is a little slower than walking a tunnel.
  const lead = leadOpen(s, nx, ny, d);
  if (!lead && s.t % 4 === 0) { p.dir = d; return; }
  p.x = nx; p.y = ny; p.dir = d; p.moving = true; p.step++;
  if (d === 'left' || d === 'right') p.face = d;
  if (digRect(s, p.x, p.y, CELL, CELL) && p.step % 10 === 0) out.push('step');
  const c = Math.round(p.x / CELL), r = Math.round(p.y / CELL);
  if (r >= DIRT_TOP && s.paid[r * 21 + c] === 0 && cellOpen(s, c, r)) { s.paid[r * 21 + c] = 1; addScore(s, 10); }
}

/** The blocks the digger's front edge moves into are already dug. */
function leadOpen(s: DigState, x: number, y: number, d: Dir): boolean {
  const ex = d === 'right' ? x + CELL - 1 : x, ey = d === 'down' ? y + CELL - 1 : y;
  if (vertical(d)) return blockDug(s, Math.floor(x / 4), Math.floor(ey / 4)) && blockDug(s, Math.floor((x + 7) / 4), Math.floor(ey / 4));
  return blockDug(s, Math.floor(ex / 4), Math.floor(y / 4)) && blockDug(s, Math.floor(ex / 4), Math.floor((y + 7) / 4));
}

// ---------------------------------------------------------------- the harpoon
/** Where the harpoon's tip is: from the middle of the digger's front edge, `len` px out. */
export function harpoonTip(s: DigState, h: Harpoon): { x: number; y: number } {
  const p = s.player;
  return { x: p.x + 4 + DX[h.dir] * (4 + h.len), y: p.y + 4 + DY[h.dir] * (4 + h.len) };
}

function stepHarpoon(s: DigState, pad: Pad, out: SfxId[]): void {
  const h = s.harpoon;
  if (!h) return;
  if (h.state === 'out') {
    for (let i = 0; i < 3 && h.state === 'out'; i++) {
      h.len++;
      const tip = harpoonTip(s, h);
      if (!blockDug(s, Math.floor(tip.x / 4), Math.floor(tip.y / 4)) || h.len >= HARPOON_MAX) { h.state = 'back'; break; }
      const m = s.mobs.find((mm) => alive(mm) && !mm.ghost && Math.abs(mm.x + 4 - tip.x) <= 4 && Math.abs(mm.y + 4 - tip.y) <= 4);
      if (m) { h.state = 'hooked'; h.target = m; pump(s, m, out); }
    }
    return;
  }
  if (h.state === 'hooked') {
    const m = h.target;
    if (!m || !alive(m)) { s.harpoon = null; return; }
    h.idle++;
    if (pad.firePressed || (pad.fire && h.idle >= 18)) pump(s, m, out);
    if (m.inflate >= PUMPS_TO_POP) { popMob(s, m, h.dir, out); s.harpoon = null; return; }
    if (h.idle > 50) h.state = 'back';
    return;
  }
  h.len -= 4;
  if (h.len <= 0) s.harpoon = null;
}

function pump(s: DigState, m: Mob, out: SfxId[]): void {
  m.inflate++;
  m.deflateT = 0;
  m.windT = 0; m.fireT = 0;
  if (s.harpoon) s.harpoon.idle = 0;
  out.push('hit');
}

function popMob(s: DigState, m: Mob, from: Dir, out: SfxId[]): void {
  m.popT = 0;
  const side = from === 'left' || from === 'right';
  const pts = (POINTS_BY_LAYER[layerOf(m.y)] as number) * (m.kind === 'fygar' && side ? 2 : 1);
  addScore(s, pts);
  s.popups.push({ x: m.x + 4, y: m.y, text: String(pts), t: 0 });
  out.push('kill');
}

// ---------------------------------------------------------------- the mobs
/** Walking speed in px a tick: a little faster each round, and the last one runs. */
function speedOf(s: DigState, m: Mob): number {
  const base = Math.min(0.85, 0.45 + s.round * 0.05);
  return m.escaping ? base + 0.2 : m.ghost ? base * 0.75 : base;
}

const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

function stepMob(s: DigState, m: Mob, out: SfxId[]): void {
  if (m.popT >= 0) { if (++m.popT > 24) m.gone = true; return; }
  if (m.crushed || m.gone) return;
  if (m.inflate > 0) {
    if (s.harpoon?.target === m && s.harpoon.state === 'hooked') return;
    if (++m.deflateT >= 40) { m.inflate--; m.deflateT = 0; }
    return;
  }
  if (m.kind === 'fygar' && stepFire(s, m, out)) return;
  if (!m.ghost && !m.escaping) m.ghostIn--;
  m.acc += speedOf(s, m);
  while (m.acc >= 1) {
    m.acc -= 1;
    if (m.ghost) ghostStep(s, m); else walkStep(s, m);
    if (m.gone) return;
  }
}

/** One px along the tunnels. At each cell it picks a way: mostly toward the digger, never back unless it must. */
function walkStep(s: DigState, m: Mob): void {
  const p = s.player;
  if (m.x % CELL === 0 && m.y % CELL === 0) {
    const c = m.x / CELL, r = m.y / CELL;
    if (m.escaping && r <= SURFACE) {
      // On the surface, the runner heads off the left edge.
      m.dir = 'left';
      if (m.x <= 0) { m.gone = true; return; }
    } else {
      if (!m.escaping && m.ghostIn <= 0) { m.ghost = true; m.ghostT = 0; return; }
      const open = DIRS.filter((d) => cellOpen(s, c + DX[d], r + DY[d]) && r + DY[d] >= SURFACE && !rockAt(s, m.x + DX[d] * CELL, m.y + DY[d] * CELL));
      const ahead = open.filter((d) => d !== OPP[m.dir]);
      const pool = ahead.length > 0 ? ahead : open;
      if (pool.length === 0) return;
      const tx = m.escaping ? m.x : p.x, ty = m.escaping ? 0 : p.y;
      const dist = (d: Dir): number => Math.abs(m.x + DX[d] * CELL - tx) + Math.abs(m.y + DY[d] * CELL - ty);
      m.dir = s.rng() < 0.7 ? pool.reduce((a, b) => (dist(b) < dist(a) ? b : a)) : pool[Math.floor(s.rng() * pool.length)] as Dir;
    }
  }
  m.x += DX[m.dir]; m.y += DY[m.dir];
  if (m.dir === 'left' || m.dir === 'right') m.face = m.dir;
}

/** One px straight through the dirt toward the digger (or up, for the runner). It turns solid again in an open cell. */
function ghostStep(s: DigState, m: Mob): void {
  m.ghostT++;
  const tx = m.escaping ? Math.round(m.x / CELL) * CELL : s.player.x, ty = m.escaping ? SURFACE * CELL : s.player.y;
  if (m.x !== tx && (s.t & 1 || m.y === ty)) m.x += Math.sign(tx - m.x);
  else if (m.y !== ty) m.y += Math.sign(ty - m.y);
  if (m.x < tx) m.face = 'right'; else if (m.x > tx) m.face = 'left';
  if (m.ghostT < 60 || m.x % CELL !== 0 || m.y % CELL !== 0) return;
  if (!cellOpen(s, m.x / CELL, m.y / CELL)) return;
  m.ghost = false;
  m.ghostIn = ghostDelay(s);
}

/** A Fygar that sees the digger along its row winds up, then breathes fire three cells through the dirt. True while it
 * stands still to do it. */
function stepFire(s: DigState, m: Mob, out: SfxId[]): boolean {
  if (m.fireT > 0) { if (--m.fireT === 0) m.fireCd = 150; return true; }
  if (m.windT > 0) {
    if (--m.windT === 0) { m.fireT = 30; out.push('flame'); }
    return true;
  }
  if (m.fireCd > 0) { m.fireCd--; return false; }
  if (m.ghost || m.escaping) return false;
  const p = s.player;
  const ahead = m.face === 'right' ? p.x > m.x : p.x < m.x;
  if (Math.abs(p.y - m.y) <= 4 && Math.abs(p.x - m.x) <= 44 && ahead && s.rng() < 1 / 45) { m.windT = 36; return true; }
  return false;
}

/** The fire's box while a Fygar breathes: it grows over the first ticks to three cells. */
export function fireBox(m: Mob): { x: number; y: number; w: number; h: number } | null {
  if (m.fireT <= 0) return null;
  const len = Math.min(24, (31 - m.fireT) * 3);
  return { x: m.face === 'right' ? m.x + CELL : m.x - len, y: m.y + 1, w: len, h: CELL - 2 };
}

// ---------------------------------------------------------------- rocks
function stepRocks(s: DigState, out: SfxId[]): void {
  const p = s.player;
  for (const k of s.rocks) {
    k.t++;
    if (k.state === 'rest') {
      const by = (k.y + CELL) / 4;
      if (blockDug(s, k.x / 4, by) && blockDug(s, k.x / 4 + 1, by)) { k.state = 'wobble'; k.t = 0; }
    } else if (k.state === 'wobble') {
      if (k.t >= 45) { k.state = 'fall'; k.t = 0; out.push('thud'); }
    } else if (k.state === 'fall') {
      k.y += 2;
      for (const m of s.mobs) {
        if (!alive(m) || m.crushed || Math.abs(m.x - k.x) >= 7 || m.y + 2 < k.y || m.y > k.y + CELL) continue;
        m.crushed = true;
        k.crushed.push(m);
        if (s.harpoon?.target === m) s.harpoon = null;
      }
      for (const m of k.crushed) m.y = k.y + 4;
      if (s.phase === 'play' && Math.abs(p.x - k.x) < 7 && p.y + 2 >= k.y && p.y < k.y + CELL) { k.hitPlayer = true; die(s, 'rock', out); }
      const by = (k.y + CELL) / 4;
      const below = k.y + CELL >= FIELD - CELL || !(blockDug(s, k.x / 4, by) && blockDug(s, k.x / 4 + 1, by));
      if (k.y % 4 === 0 && below) {
        k.state = 'crumble'; k.t = 0;
        out.push('thud');
        if (k.crushed.length > 0) {
          const pts = CRUSH_POINTS[Math.min(k.crushed.length, CRUSH_POINTS.length - 1)] as number;
          addScore(s, pts);
          s.popups.push({ x: k.x + 4, y: k.y, text: String(pts), t: 0 });
          out.push('kill');
        }
      }
    } else if (k.state === 'crumble' && k.t > 30) {
      for (const m of k.crushed) m.gone = true;
    }
  }
  s.rocks = s.rocks.filter((k) => !(k.state === 'crumble' && k.t > 30));
}

// ---------------------------------------------------------------- tick
function addScore(s: DigState, n: number): void {
  s.score += n;
  if (!s.extra && s.score >= EXTRA_LIFE) { s.extra = true; s.lives++; }
}

function die(s: DigState, by: DigState['deathBy'], out: SfxId[]): void {
  if (s.phase !== 'play') return;
  s.phase = 'dead'; s.phaseT = 0; s.deathBy = by;
  s.harpoon = null;
  out.push('ko');
}

function stepPlay(s: DigState, pad: Pad, out: SfxId[]): void {
  stepPlayer(s, pad, out);
  stepHarpoon(s, pad, out);
  const left = s.mobs.filter(alive);
  // The last one standing makes a run for it after a while.
  if (left.length === 1 && s.phaseT > 240) {
    const m = left[0] as Mob;
    if (!m.escaping && m.inflate === 0) { m.escaping = true; m.ghost = m.y > SURFACE * CELL; m.ghostT = 0; }
  }
  for (const m of s.mobs) stepMob(s, m, out);
  stepRocks(s, out);
  if (s.phase !== 'play') return;
  const p = s.player;
  for (const m of s.mobs) {
    if (!alive(m)) continue;
    const box = fireBox(m);
    if (box && p.x + 6 > box.x && p.x + 2 < box.x + box.w && p.y + 6 > box.y && p.y + 2 < box.y + box.h) { die(s, 'fire', out); return; }
    if (!m.ghost && m.inflate === 0 && Math.abs(m.x - p.x) < 6 && Math.abs(m.y - p.y) < 6) { die(s, 'touch', out); return; }
  }
  if (s.mobs.every((m) => m.gone)) {
    s.phase = 'clear'; s.phaseT = 0;
    out.push('confirm');
  }
}

function step(s: DigState, pad: Pad): SfxId[] {
  const out: SfxId[] = [];
  if (s.phase === 'over') return out;
  s.t++;
  s.phaseT++;
  for (const u of s.popups) u.t++;
  s.popups = s.popups.filter((u) => u.t < 60);
  switch (s.phase) {
    case 'ready':
      if (s.phaseT >= READY_T) { s.phase = 'play'; s.phaseT = 0; }
      break;
    case 'play':
      stepPlay(s, pad, out);
      break;
    case 'dead':
      if (s.phaseT >= DEAD_T) {
        s.lives--;
        s.phaseT = 0;
        if (s.lives <= 0) { s.phase = 'gameover'; out.push('hurt'); } else { resetLife(s); s.phase = 'ready'; }
      }
      break;
    case 'clear':
      if (s.phaseT >= CLEAR_T) { s.round++; newRound(s); s.phase = 'ready'; s.phaseT = 0; }
      break;
    case 'gameover':
      if (s.phaseT >= OVER_T) s.phase = 'over';
      break;
  }
  return out;
}

// ---------------------------------------------------------------- the cart
export function buildDigDug(opts: CartOpts): { cart: Cart; s: DigState } {
  const s: DigState = {
    rng: createRng(opts.seed), t: 0, phase: 'ready', phaseT: 0, round: 1, score: 0, lives: 3, best: opts.best, extra: false,
    dug: new Uint8Array(BLOCKS * BLOCKS), paid: new Uint8Array(21 * 21),
    player: { x: START_X, y: MIN_Y, dir: 'down', face: 'right', moving: false, step: 0 },
    mobs: [], rocks: [], harpoon: null, popups: [], deathBy: 'touch',
  };
  newRound(s);
  const cart: Cart = {
    get score() { return s.score; },
    get lives() { return s.lives; },
    get over() { return s.phase === 'over'; },
    step: (pad) => step(s, pad),
    draw: (ctx: Ctx, ox: number, oy: number) => drawDigDug(ctx, s, ox, oy),
  };
  return { cart, s };
}

export const createDigDug = (opts: CartOpts): Cart => buildDigDug(opts).cart;
