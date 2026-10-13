// The basement prologue. Mike runs the game from behind the DM screen. Will rolls a d20 for Fireball, it tumbles across
// the table and lands low, the wizard is gone, the table reacts, the lamp flickers, something growls, and it goes black.
// The words are in prologue_script.ts, played in four parts through the shared dialogue box. No music. Opaque.
import type { Scene } from '../core/scene.ts';
import { skipsDialogue } from '../core/settings.ts';
import type { ActorView, AnimId, Dir } from '../core/types.ts';
import { PAL } from '../gfx/palette.ts';
import { drawActor, drawIcon, drawText } from '../gfx/index.ts';
import { audio } from '../audio/index.ts';
import { createDialogueBox } from '../ui/index.ts';
import {
  DIE_FROM, DIE_REST, SCREEN_H, SCREEN_W, SEATS, drawChairs, drawLamp, drawRoom, drawScreen, drawTable,
} from './basement.ts';
import { prologuePart } from './prologue_script.ts';

type Ctx = CanvasRenderingContext2D;
type KidId = 'mike' | 'dustin' | 'lucas' | 'will';
interface Kid { dir: Dir; anim: AnimId; since: number }
const FACING: Record<KidId, Dir> = { mike: 'down', dustin: 'right', lucas: 'left', will: 'right' };

// ---------------------------------------------------------------- timeline (frames at 60 Hz)
type TimedId = 'fadeIn' | 'roll' | 'beat' | 'flicker' | 'fadeOut';
type Step = { id: TimedId; len: number } | { id: 'talk'; part: number };

/** The die stops here, then sits on the table for a moment before the DM speaks. */
const ROLL_LAND = 84;
const FLICKER_LEN = 120;
const STEPS: readonly Step[] = [
  { id: 'fadeIn', len: 50 },
  { id: 'talk', part: 0 },
  { id: 'roll', len: ROLL_LAND + 50 },
  { id: 'talk', part: 1 },
  { id: 'beat', len: 44 },
  { id: 'talk', part: 2 },
  { id: 'flicker', len: FLICKER_LEN },
  { id: 'talk', part: 3 },
  { id: 'fadeOut', len: 90 },
];

// ---------------------------------------------------------------- the die
/** Each bounce: start frame, end frame, peak height in px. */
const BOUNCES: readonly (readonly [number, number, number])[] = [[0, 24, 30], [24, 44, 16], [44, 58, 8], [58, 68, 4]];
/** Frames where the die clatters: a roll tick and a new number on the face. */
const TICKS = [24, 44, 58, 68, 72, 77, 81];
const FACES = [17, 8, 13, 5, 19, 11, 6];
const FINAL_FACE = 2;
const COS = [1, 0, -1, 0];
const SIN = [0, 1, 0, -1];

interface Die { x: number; y: number; h: number; rot: number; flip: boolean; face: number; scale: number }

function dieAt(t: number): Die {
  const p = Math.min(1, t / 70);
  const e = 1 - Math.pow(1 - p, 1.7);
  let h = 0;
  for (const [a, b, peak] of BOUNCES) {
    if (t >= a && t < b) { const u = (t - a) / (b - a); h = Math.round(4 * peak * u * (1 - u)); }
  }
  const clatters = TICKS.filter((k) => t >= k).length;
  const landed = t >= ROLL_LAND;
  return {
    x: Math.round(DIE_FROM.x + (DIE_REST.x - DIE_FROM.x) * e),
    y: Math.round(DIE_FROM.y + (DIE_REST.y - DIE_FROM.y) * e),
    h,
    // Quarter turns that slow down and end on 12, which is a whole number of full turns.
    rot: Math.floor(12 * (1 - (1 - Math.min(1, t / ROLL_LAND)) ** 2)) & 3,
    flip: h > 0 && (Math.floor(t / 5) & 1) === 1,
    face: landed ? FINAL_FACE : clatters === 0 ? 20 : (FACES[clatters - 1] ?? FINAL_FACE),
    scale: h > 12 ? 4 : 3,
  };
}

/** The 8 by 8 d20 icon, enlarged with whole-number scales and quarter turns so it stays crisp. */
function drawDie(ctx: Ctx, d: Die, landed: boolean, frame: number): void {
  const s = d.scale;
  const cy = d.y - d.h - 4 * s;
  const sw = Math.max(8, 20 - (d.h >> 1));
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(d.x - (sw >> 1), d.y - 1, sw, 2);
  ctx.fillRect(d.x - (sw >> 1) + 2, d.y - 2, sw - 4, 1);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(d.x, cy);
  const sx = d.flip ? -s : s;
  ctx.transform((COS[d.rot] as number) * sx, (SIN[d.rot] as number) * sx, -(SIN[d.rot] as number) * s, (COS[d.rot] as number) * s, 0, 0);
  drawIcon(ctx, 'd20', -4, -4, frame);
  ctx.restore();
  if (landed) {
    ctx.save();
    ctx.translate(d.x, cy);
    ctx.scale(2, 2);
    drawText(ctx, String(d.face), 0, -3, 'red', { align: 'center', shadow: true });
    ctx.restore();
  } else {
    drawText(ctx, String(d.face), d.x, cy - 3, 'ink', { align: 'center' });
  }
}

// ---------------------------------------------------------------- the lamp
/** Strobe switch points: from this frame on the lamp is at this level. The long dark gap holds the growl. */
const STROBE: readonly (readonly [number, number])[] = [[0, 1], [10, 0], [14, 1], [22, 0], [25, 1], [30, 0], [96, 1], [100, 0], [104, 1]];
const GROWL_AT = 46;

function lampLevel(id: string | undefined, t: number, calm: boolean): number {
  if (id !== 'flicker') return 1;
  if (calm) {
    // Reduce flashing: a slow dim and a slow rise, nothing that strobes.
    if (t < 10) return 1;
    if (t < 36) return 1 - 0.75 * ((t - 10) / 26);
    if (t < 90) return 0.25;
    return Math.min(1, 0.25 + 0.75 * ((t - 90) / 30));
  }
  let level = 1;
  for (const [at, v] of STROBE) if (t >= at) level = v;
  return level;
}

// ---------------------------------------------------------------- the scene
export function createPrologueScene(opts: { onDone(): void }): Scene {
  const box = createDialogueBox();
  const kids: Record<KidId, Kid> = {
    mike: { dir: FACING.mike, anim: 'idle', since: 0 },
    dustin: { dir: FACING.dustin, anim: 'idle', since: 0 },
    lucas: { dir: FACING.lucas, anim: 'idle', since: 0 },
    will: { dir: FACING.will, anim: 'idle', since: 0 },
  };
  let idx = 0;
  /** Frames into the current step. */
  let t = 0;
  let frame = 0;
  let rollT = 0;
  let talkDone = false;
  let finished = false;
  let struck = false;
  let tension = false;
  let dieShown = false;

  const pose = (id: KidId, anim: AnimId): void => { kids[id].anim = anim; kids[id].since = frame; };

  function finish(): void {
    if (finished) return;
    finished = true;
    opts.onDone();
  }
  function next(): void {
    idx++;
    t = 0;
    talkDone = false;
    const s: Step | undefined = STEPS[idx];
    if (!s) { finish(); return; }
    // The box may call back at once (an empty script), so only a flag is set here and update() moves on.
    if (s.id === 'talk') box.start(prologuePart(s.part), () => { talkDone = true; });
  }

  /** Sounds and poses that happen on a given frame of a step. */
  function onFrame(id: TimedId, f: number): void {
    if (id === 'roll') {
      rollT = Math.min(f, ROLL_LAND);
      if (f === 0) { pose('will', 'cast'); dieShown = true; }
      TICKS.forEach((k, i) => { if (f === k) audio.sfx('roll', { rate: 0.85 + i * 0.06 }); });
      if (f === ROLL_LAND) { audio.sfx('rollLand'); pose('will', 'hurt'); }
      if (f === ROLL_LAND + 8) pose('dustin', 'hurt');
      if (f === ROLL_LAND + 14) pose('lucas', 'hurt');
      if (f === ROLL_LAND + 22) { pose('will', 'idle'); pose('dustin', 'idle'); }
      if (f === ROLL_LAND + 28) pose('lucas', 'idle');
    } else if (id === 'beat') {
      if (f === 0) { struck = true; pose('will', 'hurt'); }
      if (f === 8) pose('dustin', 'hurt');
      if (f === 20) pose('lucas', 'hurt');
      if (f === 30) { pose('will', 'idle'); pose('dustin', 'idle'); }
      if (f === 36) pose('lucas', 'idle');
    } else if (id === 'flicker') {
      if (f === 0) audio.sfx('flicker');
      if (f === GROWL_AT) audio.sfx('growl');
      if (f === FLICKER_LEN - 1) tension = true;
    }
  }

  function viewOf(id: KidId): ActorView {
    const k = kids[id];
    const p = SEATS[id];
    return {
      kind: 'npc', id, x: p.x, y: p.y, dir: k.dir, anim: k.anim, t: frame - k.since,
      flash: 0, blink: false, strained: false, tint: null, alert: false, z: 0, bar: null,
    };
  }

  return {
    opaque: true,
    enter() { audio.music(null); },
    update(g) {
      frame++;
      // Tab skips the whole prologue, roll and flicker included. So does the skip-story setting.
      if (!finished && (skipsDialogue() || g.input.pressed('skip'))) { finish(); return; }
      const s: Step | undefined = STEPS[idx];
      if (!s || finished) return;
      if (s.id === 'talk') {
        box.update(g);
        if (talkDone) next();
        return;
      }
      onFrame(s.id, t);
      t++;
      if (t >= s.len) next();
    },
    draw(ctx, g) {
      const s: Step | undefined = STEPS[idx];
      ctx.imageSmoothingEnabled = false;
      drawRoom(ctx, struck);
      drawChairs(ctx);
      drawActor(ctx, viewOf('mike'));
      drawTable(ctx);
      drawScreen(ctx);
      for (const id of ['dustin', 'lucas', 'will'] as const) drawActor(ctx, viewOf(id));
      if (dieShown) drawDie(ctx, dieAt(rollT), rollT >= ROLL_LAND, frame);

      // The room is dim; the lamp lights a cone and a pool on the table. When it dies the room goes nearly dark.
      const lamp = lampLevel(s?.id, t, g.settings.reduceFlashing);
      ctx.globalAlpha = (tension ? 0.28 : 0.14) + (1 - lamp) * 0.5;
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.globalAlpha = 1;
      drawLamp(ctx, lamp);
      box.draw(ctx);

      let black = 0;
      if (!s) black = 1;
      else if (s.id === 'fadeIn') black = 1 - t / s.len;
      else if (s.id === 'fadeOut') black = t / s.len;
      if (black > 0) {
        ctx.globalAlpha = Math.min(1, black);
        ctx.fillStyle = PAL.black;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.globalAlpha = 1;
      }
    },
  };
}
