// DRAGON'S LAIR, the new laserdisc machine at the Palace: a quick-time game. Dirk the Daring goes through four scenes
// (the drawbridge, the tentacle room, the crumbling ledge and the dragon's lair), 3 to 5 moves each. A move is a beat
// of story (about half a second), then a cue: a flashing yellow arrow at the edge of the screen for a direction, or a
// flashing sword over Dirk for fire. Answer inside the window and Dirk leaps, slashes or ducks, and the points go up.
// The wrong button or a late one and he falls, gets grabbed or burns, a life goes, and the scene starts over.
//
// There's no free movement: Dirk only moves when a cue is answered. So the first scene of a run opens on a how-to (press
// the arrow when it flashes, the fire key for the sword) and holds a while longer, and its retries show it again.
//
// After the dragon the run loops with a bonus, the windows shorter (60 ticks, then 12 fewer a loop, down to 24) and the
// points higher. The second loop plays every scene mirrored, as the laserdisc did, and after that the seed picks.
import { labelOf } from '../core/bindings.ts';
import { createRng } from '../core/rng.ts';
import type { SfxId } from '../core/types.ts';
import { rect } from '../gfx/canvas.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { drawTinyText, tinyWidth } from '../gfx/font.ts';
import { ARROW_TURN, ARROWS, ASH, DIRK, DIRK_LIFE, PAINTERS, pen, SWORDS } from './dragonslair_art.ts';
import type { Phase, SceneView } from './dragonslair_art.ts';
import { drawBanner, drawLives, drawScoreLine } from './sprite.ts';
import type { Sprite, Turn } from './sprite.ts';
import { FIELD } from './types.ts';
import type { Cart, CartFactory, CartOpts, Dir, Pad } from './types.ts';

export type Key = Dir | 'fire';
type Act = 'run' | 'leap' | 'slash' | 'duck';
export type Death = 'fall' | 'grab' | 'burn';
interface Move { key: Key; act: Act; x: number; y: number }
interface Scene { name: string; x: number; y: number; death: Death; moves: Move[] }

const mv = (key: Key, act: Act, x: number, y: number): Move => ({ key, act, x, y });
/** The run, unmirrored. A move's x and y are where Dirk's feet end up. */
export const SCENES: readonly Scene[] = [
  { name: 'THE DRAWBRIDGE', x: 14, y: 116, death: 'fall',
    moves: [mv('right', 'run', 62, 116), mv('up', 'leap', 102, 116), mv('fire', 'slash', 102, 116),
      mv('right', 'run', 136, 116)] },
  { name: 'THE TENTACLE', x: 60, y: 120, death: 'grab',
    moves: [mv('fire', 'slash', 60, 120), mv('up', 'leap', 60, 120), mv('down', 'duck', 60, 120), mv('right', 'run', 148, 120)] },
  { name: 'THE LEDGE', x: 18, y: 104, death: 'fall',
    moves: [mv('right', 'leap', 60, 100), mv('right', 'leap', 100, 96), mv('fire', 'slash', 100, 96),
      mv('up', 'leap', 146, 96)] },
  { name: "THE DRAGON'S LAIR", x: 16, y: 140, death: 'burn',
    moves: [mv('right', 'run', 50, 140), mv('fire', 'slash', 50, 140), mv('left', 'run', 24, 140), mv('up', 'leap', 24, 140),
      mv('fire', 'slash', 80, 140)] },
];

export const INTRO_T = 70, RETRY_T = 50, BEAT_T = 30, ACT_T = 32, DEATH_T = 72, CLEAR_T = 50, BONUS_T = 150, GAMEOVER_T = 120;
/** The first scene's intro with the how-to on it: long enough to read the first time, shorter on a retry. */
export const HOWTO_T = 180, HOWTO_RETRY_T = 110;
/** Ticks to answer a cue: 60 on the first scene, 3 fewer each scene and 12 fewer each loop, never under 24. */
export const windowFor = (loop: number, scene = 0): number => Math.max(24, 60 - 12 * loop - 3 * scene);
/** The how-to shows on the first scene of the first loop. */
const howTo = (s: DLState): boolean => s.loop === 0 && s.scene === 0;
const introFor = (s: DLState): number => (howTo(s) ? (s.retry ? HOWTO_RETRY_T : HOWTO_T) : s.retry ? RETRY_T : INTRO_T);
/** Points for a move: 250, 25 more a scene and 50 more a loop. */
export const pointsFor = (scene: number, loop: number): number => 250 + 25 * scene + 50 * loop;
/** The bonus for finishing a loop. */
export const bonusFor = (loop: number): number => 1000 * (loop + 1);

export interface DLState {
  score: number; lives: number; loop: number; scene: number; move: number;
  phase: Phase; t: number; clock: number; mirror: boolean;
  /** The scene is starting over after a death, so the intro is shorter. */
  retry: boolean;
  /** Dirk's feet before the move being acted out, and where he is now (both unmirrored). */
  fromX: number; fromY: number; x: number; y: number;
  /** The last points scored and how long to show them. */
  pop: number; popT: number;
}

const flipKey = (k: Key, m: boolean): Key => (!m ? k : k === 'left' ? 'right' : k === 'right' ? 'left' : k);
/** The input the current cue wants, on screen (mirrored scenes swap left and right). */
export function expectedKey(s: DLState): Key {
  return flipKey((SCENES[s.scene] as Scene).moves[s.move]?.key ?? 'fire', s.mirror);
}

function setPhase(s: DLState, phase: Phase): void { s.phase = phase; s.t = 0; }

function startScene(s: DLState, rng: () => number, retry: boolean): void {
  const sc = SCENES[s.scene] as Scene;
  if (!retry) s.mirror = s.loop === 0 ? false : s.loop === 1 ? true : rng() < 0.5;
  s.move = 0; s.x = s.fromX = sc.x; s.y = s.fromY = sc.y; s.retry = retry;
  setPhase(s, 'intro');
}

function step(s: DLState, pad: Pad, rng: () => number): SfxId[] {
  const out: SfxId[] = [];
  if (s.phase === 'over') return out;
  s.t++; s.clock++;
  if (s.popT > 0) s.popT--;
  const sc = SCENES[s.scene] as Scene;
  const m = sc.moves[s.move];
  switch (s.phase) {
    case 'intro':
      if (s.t === 1) out.push('confirm');
      if (s.t >= introFor(s)) setPhase(s, 'beat');
      break;
    case 'beat':
      if (s.t >= BEAT_T) { setPhase(s, 'cue'); out.push('select'); }
      break;
    case 'cue': {
      const want = expectedKey(s);
      const pressed: Key | null = pad.firePressed ? 'fire' : pad.dirPressed;
      if (pressed && pressed === want && m) {
        const pts = pointsFor(s.scene, s.loop);
        s.score += pts; s.pop = pts; s.popT = 40;
        s.fromX = s.x; s.fromY = s.y;
        setPhase(s, 'act');
        out.push('kill');
        if (m.act === 'slash') out.push('swing');
      } else if (pressed || s.t >= windowFor(s.loop, s.scene)) {
        s.lives--;
        s.fromX = s.x; s.fromY = s.y;
        setPhase(s, 'death');
        out.push('ko', sc.death === 'burn' ? 'flame' : sc.death === 'fall' ? 'thud' : 'growl');
      }
      break;
    }
    case 'act': {
      if (!m) break;
      // A slash closes the distance in the first half, so the blow lands at the end of the lunge.
      const k = Math.min(1, s.t / (m.act === 'slash' ? ACT_T / 2 : ACT_T));
      s.x = s.fromX + (m.x - s.fromX) * k; s.y = s.fromY + (m.y - s.fromY) * k;
      if (s.t >= ACT_T) {
        s.x = m.x; s.y = m.y; s.move++;
        setPhase(s, s.move < sc.moves.length ? 'beat' : 'clear');
      }
      break;
    }
    case 'clear':
      if (s.t >= CLEAR_T) {
        if (s.scene + 1 < SCENES.length) { s.scene++; startScene(s, rng, false); } else {
          setPhase(s, 'bonus');
          s.score += bonusFor(s.loop); s.pop = bonusFor(s.loop); s.popT = 0;
          out.push('levelUp');
        }
      }
      break;
    case 'bonus':
      if (s.t >= BONUS_T) { s.loop++; s.scene = 0; startScene(s, rng, false); }
      break;
    case 'death':
      if (sc.death === 'grab') {
        // The tentacle drags Dirk back to its hole.
        const k = Math.min(1, Math.max(0, (s.t - 12) / 40));
        s.x = s.fromX + (8 - s.fromX) * k * k; s.y = s.fromY - Math.round(k * 12);
      } else if (sc.death === 'fall') s.y = s.fromY + (s.t < 8 ? 0 : (s.t - 8) ** 2 * 0.06);
      if (s.t >= DEATH_T) {
        if (s.lives > 0) startScene(s, rng, true); else setPhase(s, 'gameover');
      }
      break;
    case 'gameover':
      if (s.t >= GAMEOVER_T) setPhase(s, 'over');
      break;
  }
  return out.slice(0, 3);
}

// ---------------------------------------------------------------- drawing
/** Dirk's sprite, the offset of his feet, and a turn, for this moment. Null when he's out of the picture. */
function dirkLook(s: DLState): { sp: Sprite; x: number; y: number; turn: Turn } | null {
  const sc = SCENES[s.scene] as Scene;
  const m = sc.moves[s.move];
  const runFrame = DIRK.run[(s.t >> 2) & 1] as Sprite;
  if (s.phase === 'act' && m) {
    const k = s.t / ACT_T;
    if (m.act === 'leap') return { sp: DIRK.leap, x: s.x, y: s.y - Math.round(Math.sin(Math.PI * Math.min(1, k)) * 16), turn: 0 };
    if (m.act === 'slash') return { sp: s.t < 22 ? DIRK.slash : DIRK.stand, x: s.x, y: s.y, turn: 0 };
    if (m.act === 'duck') return { sp: s.t < 26 ? DIRK.duck : DIRK.stand, x: s.x, y: s.y, turn: 0 };
    return { sp: s.x === m.x ? DIRK.stand : runFrame, x: s.x, y: s.y, turn: 0 };
  }
  if (s.phase === 'death') {
    if (sc.death === 'burn') return { sp: s.t < 24 ? DIRK.stand : ASH, x: s.x, y: s.y, turn: 0 };
    if (sc.death === 'grab') return s.t >= 52 ? null : { sp: DIRK.fall, x: s.x, y: s.y, turn: 0 };
    return s.y > 190 ? null : { sp: DIRK.fall, x: s.x, y: s.y, turn: (s.t < 8 ? 0 : ((s.t >> 3) & 3)) as Turn };
  }
  if (s.phase === 'clear' && s.scene < SCENES.length - 1) return { sp: runFrame, x: s.x + s.t * 1.5, y: s.y, turn: 0 };
  const won = (s.phase === 'clear' || s.phase === 'bonus') && s.scene === SCENES.length - 1;
  if (won) return { sp: DIRK.leap, x: s.x, y: s.y, turn: 0 };
  return { sp: DIRK.stand, x: s.x, y: s.y, turn: 0 };
}

function view(s: DLState): SceneView {
  return { move: s.move, phase: s.phase, t: s.t, clock: s.clock, dx: s.x, dy: s.y };
}

/** The cue: the arrow at the screen edge it points to, or the sword over Dirk, and a bar for the time left. */
function drawCue(s: DLState, ctx: Ctx, ox: number, oy: number): void {
  const key = expectedKey(s);
  const flash = (s.t >> 2) & 1;
  if (key === 'fire') {
    const sx = s.mirror ? FIELD - Math.round(s.x) : Math.round(s.x);
    SWORDS[flash]?.draw(ctx, ox + sx - 6, oy + Math.round(s.y) - 34);
  } else {
    const at: Record<Dir, [number, number]> = { right: [FIELD - 16, 74], left: [3, 74], up: [77, 11], down: [77, 144] };
    const [x, y] = at[key];
    ARROWS[flash]?.draw(ctx, ox + x, oy + y, ARROW_TURN[key]);
  }
  const left = Math.max(0, 1 - s.t / windowFor(s.loop, s.scene));
  rect(ctx, ox, oy + 8, Math.round(FIELD * left), 2, left < 0.34 ? 'hot' : 'yellow');
}

function drawDL(s: DLState, best: number, ctx: Ctx, ox: number, oy: number): void {
  rect(ctx, ox, oy, FIELD, FIELD, 'black');
  const v = view(s);
  const p = pen(ctx, ox, oy, s.mirror);
  const paint = PAINTERS[s.scene];
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy + 8, FIELD, 152);
  ctx.clip();
  paint?.(p, v, 'back');
  const d = dirkLook(s);
  if (d) p.s(d.sp, Math.round(d.x) - 4, Math.round(d.y) - d.sp.h, false, d.turn);
  paint?.(p, v, 'front');
  if (s.popT > 0) {
    const text = String(s.pop), px = s.mirror ? FIELD - Math.round(s.x) : Math.round(s.x);
    drawTinyText(ctx, text, ox + px - Math.floor(tinyWidth(text) / 2), oy + Math.round(s.y) - 26 - (40 - s.popT) / 4, 'white');
  }
  ctx.restore();
  if (s.phase === 'cue') drawCue(s, ctx, ox, oy);
  if (s.phase === 'intro') drawBanner(ctx, ox, oy, 14, (SCENES[s.scene] as Scene).name, 'amber');
  if (s.phase === 'intro' && s.loop > 0 && s.scene === 0 && !s.retry) drawBanner(ctx, ox, oy, 28, `LOOP ${s.loop + 1}`, 'yellow');
  if (s.phase === 'intro' && howTo(s)) {
    drawBanner(ctx, ox, oy, 40, 'PRESS THE ARROW', 'white');
    drawBanner(ctx, ox, oy, 52, 'WHEN IT FLASHES', 'white');
    drawBanner(ctx, ox, oy, 68, `${labelOf('interact')} FOR THE SWORD`, 'yellow');
  }
  if (s.phase === 'bonus') {
    drawBanner(ctx, ox, oy, 66, 'THE DRAGON IS SLAIN', 'yellow');
    drawBanner(ctx, ox, oy, 82, `BONUS ${s.pop}`, 'white');
  }
  if (s.phase === 'gameover' || s.phase === 'over') drawBanner(ctx, ox, oy, 74, 'GAME OVER', 'hot');
  drawScoreLine(ctx, ox, oy, s.score, best);
  const spare = s.phase === 'death' || s.phase === 'gameover' || s.phase === 'over' ? s.lives : s.lives - 1;
  drawLives(ctx, ox, oy, Math.max(0, spare), DIRK_LIFE);
}

// ---------------------------------------------------------------- the cart
/** A Dragon's Lair cart and its state, for tests that look inside. */
export function buildDragonsLair(opts: CartOpts): { cart: Cart; s: DLState } {
  const rng = createRng(opts.seed);
  const s: DLState = {
    score: 0, lives: 3, loop: 0, scene: 0, move: 0, phase: 'intro', t: 0, clock: 0, mirror: false, retry: false,
    fromX: 0, fromY: 0, x: 0, y: 0, pop: 0, popT: 0,
  };
  startScene(s, rng, false);
  const cart: Cart = {
    get score() { return s.score; },
    get lives() { return s.lives; },
    get over() { return s.phase === 'over'; },
    step: (pad) => step(s, pad, rng),
    draw: (ctx, ox, oy) => drawDL(s, opts.best, ctx, ox, oy),
  };
  return { cart, s };
}

export const createDragonsLair: CartFactory = (opts) => buildDragonsLair(opts).cart;
