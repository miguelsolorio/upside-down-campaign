// GALAGA, the cabinet with LUCAS on its board. The ship slides along the bottom with two shots on screen at most. Each
// stage, thirty bugs fly in a row at a time along looping paths and settle into a formation that sways side to side: four
// bosses on top (two hits each, and they change color after the first), two rows of butterflies and two of bees. Then
// they peel off and dive, looping out of the formation and swerving down at the ship while they drop bullets, wrapping
// from the bottom of the screen back to their places. Bugs are worth double away from the formation, and a diving boss
// is worth 400. Clear the formation for the next stage, where they dive sooner, faster and fire more. Three lives, an
// extra one at 10,000 and every 20,000 after that.
//
// Every flyer steers: a heading that turns at a set rate and a speed, so a path is a short list of straight runs and
// turns, written for the left side and mirrored for the right. Pure logic: the art and draw() are in galaga_art.ts.
import type { SfxId } from '../core/types.ts';
import { createRng, randInt } from '../core/rng.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawGalaga } from './galaga_art.ts';
import { FIELD } from './types.ts';
import type { Cart, CartFactory, CartOpts, Pad } from './types.ts';

/** The ship's center row and how far it slides. */
export const SHIP_Y = 148;
const SHIP_MIN = 6, SHIP_MAX = FIELD - 7, SHIP_SPEED = 1.6, DEAD_ZONE = 0.3;
export const READY_T = 90, DEATH_T = 80, STAGE_T = 100, OVER_T = 120;
/** Held fire shoots every AUTO_GAP ticks; a fresh press shoots at once, if fewer than two shots are up. */
const SHOT_SPEED = 4, AUTO_GAP = 22, MAX_SHOTS = 2, MAX_BULLETS = 10;
const FIRST_LIFE = 10000, EXTRA_LIFE = 20000, MAX_LIVES = 6;
const ENTRY_SPEED = 2.2, HOME_SPEED = 2.2, GROUP_GAP = 150, TRAIN_GAP = 9;
const TAU = Math.PI * 2, DOWN = Math.PI / 2;

/** How hard a stage pushes: ticks between dives, bugs diving at once, dive speed and turn, extra bullets, bullet speed. */
function pace(stage: number): { gap: [number, number]; divers: number; v: number; turn: number; extra: number; vy: number } {
  return {
    gap: [Math.max(16, 90 - stage * 10), Math.max(40, 160 - stage * 15)],
    divers: Math.min(2 + stage, 7),
    v: Math.min(2 + stage * 0.15, 3.2),
    turn: Math.min(0.04 + stage * 0.004, 0.07),
    extra: Math.min(Math.floor((stage - 1) / 2), 2),
    vy: Math.min(2.2 + stage * 0.1, 3.2),
  };
}

export type Kind = 'boss' | 'fly' | 'bee';
/** Points in formation and away from it. */
export const POINTS: Record<Kind, [number, number]> = { bee: [50, 100], fly: [80, 160], boss: [150, 400] };

/** The formation, top to bottom: the kind, how many, the row's y. */
export const FORMATION: { kind: Kind; n: number; y: number }[] = [
  { kind: 'boss', n: 4, y: 20 }, { kind: 'fly', n: 6, y: 32 }, { kind: 'fly', n: 6, y: 43 },
  { kind: 'bee', n: 7, y: 54 }, { kind: 'bee', n: 7, y: 65 },
];
const SLOT_DX = 16;

/** A flight plan written for the left side: where it starts (entries only), its heading, then [ticks, turn per tick]. */
interface Path { x: number; y: number; a: number; legs: [number, number][] }
/** Down the middle, a loop out to the side and up. */
const FROM_TOP: Path = { x: 70, y: -8, a: DOWN, legs: [[26, 0], [32, 0.1], [12, 0.06]] };
/** In low from the side, sweeping up and over in a wide loop. */
const FROM_SIDE: Path = { x: -8, y: 132, a: -0.35, legs: [[22, 0], [30, -0.09]] };
/** Up out of the formation and over, nose down. */
const DIVE: Path = { x: 0, y: 0, a: -DOWN, legs: [[21, -0.15]] };
/** Which way each formation row flies in: its path, and its side (0 for two mirrored trains). */
const ENTRIES: { path: Path; side: number }[] = [
  { path: FROM_TOP, side: 0 }, { path: FROM_SIDE, side: -1 }, { path: FROM_SIDE, side: 1 },
  { path: FROM_TOP, side: 0 }, { path: FROM_SIDE, side: 0 },
];

export type Mode = 'wait' | 'path' | 'home' | 'form' | 'attack';
export interface Foe {
  kind: Kind; hp: number;
  /** Its place in the formation. */
  row: number; col: number;
  /** Center, heading (radians, 0 is right, down is +y) and speed. */
  x: number; y: number; a: number; v: number;
  mode: Mode;
  /** Ticks before it flies in. */
  delay: number;
  path: Path; side: number; leg: number; legT: number; after: 'home' | 'attack';
  /** Bullets left on this dive and ticks to the next, and the x it dives at: where the ship was when it turned down. */
  shots: number; fireT: number; aimX: number;
  homeT: number;
  dead: boolean;
}
export interface Bullet { x: number; y: number; vx: number; vy: number }
export interface Boom { x: number; y: number; t: number }
export interface Popup { x: number; y: number; text: string; t: number }
export interface Star { x: number; y: number; v: number; c: number }

export type Phase = 'ready' | 'play' | 'dying' | 'stage' | 'gameover' | 'done';
export interface GalagaState {
  phase: Phase; timer: number; tick: number;
  score: number; lives: number; stage: number; nextLife: number;
  /** The ship's center x. */
  sx: number;
  shots: { x: number; y: number }[]; cool: number;
  foes: Foe[]; bullets: Bullet[]; booms: Boom[]; popups: Popup[]; stars: Star[];
  diveWait: number;
  heard: Record<string, number>;
}

// ---------------------------------------------------------------- helpers
/** The formation's sway, in px, the same for every slot. */
export const sway = (s: GalagaState): number => Math.round(Math.sin(s.tick / 48) * 12);
export const slotX = (s: GalagaState, f: Foe): number => FIELD / 2 + (f.col - (FORMATION[f.row].n - 1) / 2) * SLOT_DX + sway(s);
export const slotY = (f: Foe): number => FORMATION[f.row].y;
/** Turns heading a toward b by at most `max`. */
function turnToward(a: number, b: number, max: number): number {
  let d = b - a;
  d -= TAU * Math.round(d / TAU);
  return a + Math.max(-max, Math.min(max, d));
}
const fly = (f: Foe, v: number): void => { f.x += Math.cos(f.a) * v; f.y += Math.sin(f.a) * v; };

function sfx(s: GalagaState, out: SfxId[], id: SfxId, gap = 0): void {
  if (out.length >= 3 || out.includes(id) || s.tick - (s.heard[id] ?? -999) < gap) return;
  s.heard[id] = s.tick;
  out.push(id);
}

function addScore(s: GalagaState, n: number, out: SfxId[]): void {
  s.score += n;
  while (s.score >= s.nextLife) {
    s.nextLife += EXTRA_LIFE;
    if (s.lives < MAX_LIVES) { s.lives++; sfx(s, out, 'pickup'); }
  }
}

// ---------------------------------------------------------------- the stage
/** Thirty bugs waiting off screen, a formation row to a group, each group a little after the last. */
export function buildStage(s: GalagaState): void {
  s.foes = [];
  FORMATION.forEach((r, row) => {
    const entry = ENTRIES[row];
    const half = Math.ceil(r.n / 2);
    for (let col = 0; col < r.n; col++) {
      const side = entry.side || (col < half ? -1 : 1);
      const k = entry.side ? col : side < 0 ? col : col - half;
      s.foes.push({
        kind: r.kind, hp: r.kind === 'boss' ? 2 : 1, row, col,
        x: -20, y: -20, a: DOWN, v: ENTRY_SPEED, mode: 'wait', delay: row * GROUP_GAP + k * TRAIN_GAP + 1,
        path: entry.path, side, leg: 0, legT: 0, after: 'home', shots: 0, fireT: 0, aimX: 0, homeT: 0, dead: false,
      });
    }
  });
  s.diveWait = 300;
}

/** Sets a foe on a path, mirrored for side 1. Entries start at the path's point, dives where the foe is. */
function startPath(f: Foe, path: Path, side: number, after: 'home' | 'attack', fromHere: boolean): void {
  f.path = path; f.side = side; f.leg = 0; f.legT = 0; f.after = after; f.mode = 'path';
  if (!fromHere) { f.x = side < 0 ? path.x : FIELD - path.x; f.y = path.y; }
  f.a = side < 0 ? path.a : Math.PI - path.a;
}

// ---------------------------------------------------------------- flying
function followPath(s: GalagaState, f: Foe): void {
  const [ticks, turn] = f.path.legs[f.leg];
  f.a += f.side < 0 ? turn : -turn;
  fly(f, f.v);
  if (++f.legT < ticks) return;
  f.leg++; f.legT = 0;
  if (f.leg < f.path.legs.length) return;
  f.mode = f.after; f.homeT = 0; f.aimX = s.sx;
  f.v = f.after === 'home' ? HOME_SPEED : f.v;
}

/** Back to its slot, which moves with the sway: turn toward it, then glide straight in for the last few px. */
function flyHome(s: GalagaState, f: Foe): void {
  const dx = slotX(s, f) - f.x, dy = slotY(f) - f.y, d = Math.hypot(dx, dy);
  f.homeT++;
  if (d < 2) {
    f.mode = 'form'; f.x = slotX(s, f); f.y = slotY(f); f.a = DOWN;
  } else if (d < 12 || f.homeT > 240) {
    const v = Math.min(HOME_SPEED, d);
    f.x += (dx / d) * v; f.y += (dy / d) * v;
    f.a = turnToward(f.a, DOWN, 0.25);
  } else {
    f.a = turnToward(f.a, Math.atan2(dy, dx), d < 40 ? 0.3 : 0.12);
    fly(f, HOME_SPEED);
  }
}

/** Swerving down at where the ship was when it turned, dropping bullets on the way, then round from the top back to its
 * slot. It doesn't follow the ship, so a ship that moves can slip it. */
function attack(s: GalagaState, f: Foe): void {
  const weave = Math.sin((s.tick + f.col * 37 + f.row * 11) / 18) * 22;
  const tx = f.aimX + weave, ty = Math.max(SHIP_Y + 30, f.y + 40);
  f.a = turnToward(f.a, Math.atan2(ty - f.y, tx - f.x), pace(s.stage).turn);
  fly(f, f.v);
  if (s.phase === 'play' && f.shots > 0 && f.y > 24 && f.y < 100 && --f.fireT <= 0) {
    f.shots--;
    f.fireT = 14;
    if (s.bullets.length < MAX_BULLETS) {
      const vy = pace(s.stage).vy;
      const vx = Math.max(-1, Math.min(1, (s.sx - f.x) / ((SHIP_Y - f.y) / vy)));
      s.bullets.push({ x: f.x, y: f.y + 4, vx, vy });
    }
  }
  if (f.y > FIELD + 8 || f.x < -16 || f.x > FIELD + 16) {
    f.x = slotX(s, f); f.y = -10; f.a = DOWN; f.mode = 'home'; f.homeT = 0;
  }
}

/** Sends a bug from the formation down at the ship: a boss brings up to two butterflies from the row under it. */
function launchDive(s: GalagaState, rng: () => number, out: SfxId[]): void {
  const ready = s.foes.filter((f) => f.mode === 'form');
  const diving = s.foes.filter((f) => f.mode === 'attack' || (f.mode === 'path' && f.after === 'attack')).length;
  const p = pace(s.stage);
  if (!ready.length || diving >= p.divers) return;
  const f = ready[Math.floor(rng() * ready.length)];
  const crew = [f];
  if (f.kind === 'boss') {
    const near = ready.filter((e) => e.row === 1 && Math.abs(slotX(s, e) - slotX(s, f)) <= SLOT_DX * 1.5);
    crew.push(...near.slice(0, 2));
  }
  const side = f.x < FIELD / 2 ? -1 : 1;
  for (const e of crew) {
    startPath(e, DIVE, side, 'attack', true);
    e.v = p.v;
    e.shots = (e.kind === 'boss' ? 2 : 1) + p.extra;
    e.fireT = randInt(rng, 4, 20);
  }
  sfx(s, out, 'alert', 40);
}

function moveFoes(s: GalagaState, rng: () => number, out: SfxId[]): void {
  for (const f of s.foes) {
    if (f.mode === 'wait') {
      if (s.phase === 'play' && --f.delay <= 0) startPath(f, f.path, f.side, 'home', false);
    } else if (f.mode === 'path') followPath(s, f);
    else if (f.mode === 'home') flyHome(s, f);
    else if (f.mode === 'attack') attack(s, f);
    else { f.x = slotX(s, f); f.y = slotY(f); }
  }
  if (s.phase !== 'play' || --s.diveWait > 0) return;
  const [lo, hi] = pace(s.stage).gap;
  s.diveWait = randInt(rng, lo, hi);
  launchDive(s, rng, out);
}

// ---------------------------------------------------------------- hits
function killFoe(s: GalagaState, f: Foe, out: SfxId[]): void {
  if (f.hp > 1) { f.hp--; sfx(s, out, 'hit'); return; }
  const pts = POINTS[f.kind][f.mode === 'form' ? 0 : 1];
  addScore(s, pts, out);
  if (f.kind === 'boss' && f.mode !== 'form') {
    s.popups.push({ x: Math.round(f.x) - 5, y: Math.round(f.y) - 2, text: String(pts), t: 50 });
  }
  s.booms.push({ x: Math.round(f.x), y: Math.round(f.y), t: 0 });
  f.dead = true;
  sfx(s, out, 'kill');
}

function moveShots(s: GalagaState, out: SfxId[]): void {
  for (const shot of s.shots) {
    shot.y -= SHOT_SPEED;
    // The shot swept from y + SHOT_SPEED to y this tick: anything in that strip is hit.
    const hit = s.foes.find((f) => !f.dead && f.mode !== 'wait' && Math.abs(shot.x - f.x) <= 4
      && shot.y <= f.y + 4 && shot.y + 3 + SHOT_SPEED >= f.y - 4);
    if (hit) { killFoe(s, hit, out); shot.y = -99; }
  }
  s.shots = s.shots.filter((shot) => shot.y > 4);
  s.foes = s.foes.filter((f) => !f.dead);
}

/** A bullet or a diving bug on the ship. A bug that rams it dies too. */
function shipHit(s: GalagaState, out: SfxId[]): boolean {
  if (s.bullets.some((b) => Math.abs(b.x - s.sx) <= 3 && Math.abs(b.y - SHIP_Y) <= 4)) return true;
  const ram = s.foes.find((f) => f.mode !== 'wait' && f.mode !== 'form'
    && Math.abs(f.x - s.sx) < 7 && Math.abs(f.y - SHIP_Y) < 7);
  if (!ram) return false;
  ram.hp = 1;
  killFoe(s, ram, out);
  s.foes = s.foes.filter((f) => !f.dead);
  return true;
}

// ---------------------------------------------------------------- a tick
function moveShip(s: GalagaState, pad: Pad): void {
  if (Math.abs(pad.mx) > DEAD_ZONE) s.sx = Math.max(SHIP_MIN, Math.min(SHIP_MAX, s.sx + Math.sign(pad.mx) * SHIP_SPEED));
}

function play(s: GalagaState, pad: Pad, out: SfxId[]): void {
  moveShip(s, pad);
  if (s.cool > 0) s.cool--;
  if (s.shots.length < MAX_SHOTS && (pad.firePressed || (pad.fire && s.cool === 0))) {
    s.shots.push({ x: Math.round(s.sx), y: SHIP_Y - 8 });
    s.cool = AUTO_GAP;
    sfx(s, out, 'rock', 4);
  }
  moveShots(s, out);
  if (shipHit(s, out)) {
    s.phase = 'dying'; s.timer = DEATH_T; s.shots = [];
    sfx(s, out, 'ko');
    return;
  }
  if (!s.foes.length) { s.phase = 'stage'; s.timer = STAGE_T; s.stage++; s.bullets = []; s.shots = []; }
}

function step(s: GalagaState, rng: () => number, pad: Pad): SfxId[] {
  const out: SfxId[] = [];
  if (s.phase === 'done') return out;
  s.tick++;
  for (const st of s.stars) { st.y += st.v; if (st.y >= FIELD) st.y -= FIELD - 7; }
  for (const b of s.booms) b.t++;
  s.booms = s.booms.filter((b) => b.t < 18);
  for (const p of s.popups) p.t--;
  s.popups = s.popups.filter((p) => p.t > 0);
  for (const b of s.bullets) { b.x += b.vx; b.y += b.vy; }
  s.bullets = s.bullets.filter((b) => b.y < FIELD + 4);
  moveFoes(s, rng, out);
  if (s.phase === 'stage') moveShip(s, pad);
  if (s.phase === 'play') play(s, pad, out);
  else if (--s.timer > 0) return out;
  else if (s.phase === 'ready') { s.phase = 'play'; s.bullets = []; }
  else if (s.phase === 'stage') { buildStage(s); s.phase = 'play'; sfx(s, out, 'confirm'); }
  else if (s.phase === 'dying') {
    s.lives--;
    if (s.lives > 0) { s.phase = 'ready'; s.timer = READY_T; s.bullets = []; s.sx = FIELD / 2; }
    else { s.phase = 'gameover'; s.timer = OVER_T; }
  } else s.phase = 'done';
  return out;
}

/** The cart and its live state, for tests that set up a moment by hand. */
export function buildGalaga(opts: CartOpts): { cart: Cart; s: GalagaState } {
  const rng = createRng(opts.seed);
  const s: GalagaState = {
    phase: 'ready', timer: READY_T, tick: 0,
    score: 0, lives: 3, stage: 1, nextLife: FIRST_LIFE,
    sx: FIELD / 2, shots: [], cool: 0,
    foes: [], bullets: [], booms: [], popups: [], stars: [],
    diveWait: 300, heard: {},
  };
  for (let i = 0; i < 36; i++) {
    s.stars.push({ x: randInt(rng, 0, FIELD - 1), y: randInt(rng, 7, FIELD - 1), v: 0.25 + (i % 3) * 0.25, c: i % 3 });
  }
  buildStage(s);
  const cart: Cart = {
    get score() { return s.score; },
    get lives() { return s.lives; },
    get over() { return s.phase === 'done'; },
    step: (pad: Pad) => step(s, rng, pad),
    draw: (ctx: Ctx, ox: number, oy: number) => drawGalaga(ctx, ox, oy, s, opts.best),
  };
  return { cart, s };
}

export const createGalaga: CartFactory = (opts) => buildGalaga(opts).cart;
