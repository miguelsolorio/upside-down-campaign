// Drawing for the play scene: the world pass (with the light pools at night, the floor hazards and the camera cones), the
// flash, the scare figure and the small overlays.
// World-space draws assume the caller translated by (-camX, VIEW_TOP - camY); drawWorld does that itself.
import type { ActorView, Floater, HeroId, PropView, SimView, Vec2 } from '../core/types.ts';
import type { Camera } from '../core/camera.ts';
import { SCREEN_H, SCREEN_W, TILE, VIEW_TOP, VIEW_W, VIEW_X } from '../core/config.ts';
import { isSolidTile } from '../core/tiles.ts';
import { controlRows } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { wrapText } from '../core/text.ts';
import { box, clipped } from '../ui/kit.ts';
import { NEXT_DY } from '../ui/hudlayout.ts';
import { clamp01, hpBarColor } from '../ui/format.ts';
import { drawAbyssBg, drawActor, drawAxeJoyce, drawCamCone, drawFx, drawHazard, drawHeroBar, drawIcon, drawItem, drawPool, drawProp, drawSideFade, drawStage, drawText, drawTinyText, drawTowerCone, paintStageGlow, towerPool, textWidth, tinyWidth } from '../gfx/index.ts';
import type { Glow } from '../gfx/index.ts';
import { outlinedText } from '../gfx/outline.ts';
import { PAL } from '../gfx/palette.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { Stage } from './stage.ts';
import type { PuzzleDef } from './types.ts';
import { isNear } from './puzzles.ts';
import { SPARKLES, TALENT_TO, ringRadius, sparkle, talentShowing } from './levelfx.ts';
import type { LevelFx } from './levelfx.ts';
import { MARK_FRAMES } from './mouseplay.ts';
import type { MouseMark } from './mouseplay.ts';
import { BANDS } from './klaxon.ts';
import { drawHeart } from './heart.ts';

type Ctx = CanvasRenderingContext2D;

/** Radius of a pool of light around the active hero, in px. 0 draws none: the night art is readable without one. */
const HERO_POOL_R = 0;
/** Stage lamps paint a pool this much smaller than the radius their data gives. */
const LAMP_POOL = 0.85;
/** How far the puzzle caret lifts off the prop at each step of its bob, 8 frames a step. */
const BOB = [0, 1, 2, 1];
/** Rows the down caret needs over a prop: 7 of caret, a 2 px gap and the full bob. */
const CARET_ROOM = 7 + 2 + 2;
/** Top of the subtitle text, low on the screen like a film subtitle. */
const SUBTITLE_Y = SCREEN_H - 16;
/** How far the line just under the HUD strip sits below it, and the same line when the boss bar (VIEW_TOP + 1 to + 12)
 * is there. */
const TOP_LINE_DY = 4;
const TOP_LINE_BOSS_DY = 15;

export interface WorldOpts {
  /** Draw the foot and hurt boxes (dev panel). */
  hitboxes: boolean;
  /** The dark shape of the scare, feet position in world px. */
  figure: Vec2 | null;
  /** The pools of light at night. level scales them all (the scare stutters them) and flicker adds jitter. */
  light: { level: number; flicker: number };
  /** 0..1, how much of the stage's memory room shows in its Blood red skin while a curse counts (docs/level-11.md). */
  memory?: number;
  /** 0..1, how strong the storm's bolt is over a stage with `storm` (docs/level-12.md, world/storm.ts). */
  flash?: number;
  /** Joyce with her axe, running in at the end of the final fight (world/ending.ts): drawn in the painter's order with the rest. */
  joyce?: ActorView | null;
}

// ---------------------------------------------------------------- the scare figure
/** A tall, thin silhouette with no face. Its eyes are a second pass, drawn over the body. */
function drawFigure(ctx: Ctx, x: number, y: number, t: number, eyes: boolean): void {
  const bx = Math.round(x), by = Math.round(y);
  const sway = Math.round(Math.sin(t / 6));
  const gait = (t >> 3) & 1;
  if (eyes) {
    ctx.fillStyle = PAL.hot;
    ctx.fillRect(bx - 2 + sway, by - 26, 1, 1);
    ctx.fillRect(bx + 1 + sway, by - 26, 1, 1);
    return;
  }
  ctx.fillStyle = PAL.black;
  ctx.fillRect(bx - 3, by - 10, 2, 10 - gait);
  ctx.fillRect(bx + 1, by - 10, 2, 9 + gait);
  ctx.fillRect(bx - 4 + sway, by - 22, 8, 13);
  ctx.fillRect(bx - 7 + sway, by - 22, 2, 17);
  ctx.fillRect(bx + 5 + sway, by - 22, 2, 19);
  ctx.fillRect(bx - 3 + sway, by - 29, 6, 8);
  ctx.fillRect(bx - 5 + sway, by - 27, 2, 1);
  ctx.fillRect(bx + 3 + sway, by - 28, 2, 1);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(bx - 5 + sway, by - 21, 1, 12);
}

// ---------------------------------------------------------------- world pass
function drawFloater(ctx: Ctx, f: Floater): void {
  if (f.life - f.t < 10 && (f.t & 1) === 1) return;
  const rise = Math.min(f.t, 30) * 0.45 + Math.max(0, f.t - 30) * 0.15;
  const x = Math.round(f.x), y = Math.round(f.y - rise);
  if (f.big) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2, 2);
    outlinedText(ctx, f.text, 0, 0, f.color, 'center');
    ctx.restore();
  } else {
    outlinedText(ctx, f.text, x, y, f.color, 'center');
  }
}

function drawBoxes(ctx: Ctx, view: SimView): void {
  ctx.lineWidth = 1;
  for (const a of view.actors) {
    // A dormant Flayed is a puddle on the floor, not a body: it has no hitbox to show.
    if (a.kind === 'npc' || a.puddle) continue;
    ctx.strokeStyle = PAL.leaf;
    ctx.strokeRect(Math.round(a.x) - 5 + 0.5, Math.round(a.y) - 8 + 0.5, 9, 7);
    ctx.strokeStyle = PAL.hot;
    ctx.strokeRect(Math.round(a.x) - 6 + 0.5, Math.round(a.y) - 14 + 0.5, 11, 13);
  }
  ctx.strokeStyle = PAL.cyan;
  for (const p of view.props) ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
}

/** Solid-tile lookups for the camera cones, one per stage grid, so a cone stops at the first wall it meets. */
const solidLookups = new WeakMap<Stage, (tx: number, ty: number) => boolean>();
function solidAt(stage: Stage): (tx: number, ty: number) => boolean {
  let fn = solidLookups.get(stage);
  if (!fn) {
    const grid = stage.grid;
    fn = (tx, ty) => isSolidTile(grid, tx, ty);
    solidLookups.set(stage, fn);
  }
  return fn;
}

/**
 * Stage, the ground layer (light pools at night, camera cones, floor hazards, goo pools, items), then props and actors in one
 * painter's pass by their bottom edge, then fx and floaters. On a screen wider than the clear band, the world past
 * the band fades to black.
 */
/** The memory room in its own skin over the stage, clipped to the room and faded by k. */
function drawMemory(ctx: Ctx, stage: Stage, camX: number, camY: number, t: number, k: number): void {
  const r = stage.memory as NonNullable<Stage['memory']>;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.tx * TILE, r.ty * TILE, r.w * TILE, r.h * TILE);
  ctx.clip();
  ctx.globalAlpha = k;
  drawStage(ctx, stage.memoryBaked as NonNullable<Stage['memoryBaked']>, camX, camY, t);
  ctx.restore();
}

export function drawWorld(ctx: Ctx, stage: Stage, view: SimView, cam: Camera, t: number, o: WorldOpts): void {
  ctx.save();
  // Nothing in the world may draw into the HUD strip, whatever the camera does.
  ctx.beginPath();
  ctx.rect(0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP);
  ctx.clip();
  // The Abyss's void, in screen px behind the tiles, which are clear over it (docs/level-15.md).
  if (stage.backdrop === 'abyss') drawAbyssBg(ctx, t, cam.x, cam.y);
  ctx.translate(-cam.x + view.shake.x, VIEW_TOP - cam.y + view.shake.y);
  const camX = cam.x - view.shake.x, camY = cam.y - view.shake.y;
  drawStage(ctx, stage.baked, camX, camY, t);
  if (stage.memory && stage.memoryBaked && (o.memory ?? 0) > 0) drawMemory(ctx, stage, camX, camY, t, o.memory as number);
  if (stage.flashBaked && (o.flash ?? 0) > 0) {
    ctx.save();
    ctx.globalAlpha = o.flash as number;
    drawStage(ctx, stage.flashBaked, camX, camY, t);
    ctx.restore();
  }
  // The heart (5.3): its marks on the floor and its glow over the tiles.
  if (stage.finale) drawHeart(ctx, stage.finale, view, camX, camY, t);
  const night = stage.time === 'night';
  // The pools go on the ground, under everything that moves, so the party is never tinted by them.
  if (night) paintStageGlow(ctx, stage.baked, camX, camY, glowLights(stage, view, cam, o.light.flicker), t, o.light.level);
  // Cones and hazards lie on the floor too: after the tiles and the pools, before anything that stands on them.
  for (const p of view.props) {
    // A cone is a few hundred rays, so one whose reach cannot touch the screen is skipped.
    if (!p.cam || p.x + p.w + p.cam.range < camX || p.x - p.cam.range > camX + SCREEN_W) continue;
    if (p.y + p.h + p.cam.range < camY || p.y - p.cam.range > camY + SCREEN_H - VIEW_TOP) continue;
    drawCamCone(ctx, p, solidAt(stage), camX, camY, t);
  }
  // A floodlight tower's cone lifts the ground it falls on (stage 5.1).
  for (const p of view.props) if (p.kind === 'tower') drawTowerCone(ctx, p, camX, camY, settings.reduceFlashing);
  for (const h of view.hazards) drawHazard(ctx, h, camX, camY, t);
  // The Mind Flayer's goo lies on the floor with them.
  for (const p of view.pools) drawPool(ctx, p);
  for (const it of view.items) drawItem(ctx, it);
  const order: { y: number; actor?: ActorView; prop?: PropView; joyce?: ActorView }[] = [];
  for (const p of view.props) order.push({ y: p.y + p.h, prop: p });
  for (const a of view.actors) order.push({ y: a.y, actor: a });
  if (o.joyce) order.push({ y: o.joyce.y, joyce: o.joyce });
  order.sort((l, r) => l.y - r.y);
  for (const e of order) {
    if (e.prop) drawProp(ctx, e.prop, night);
    else if (e.actor) drawActor(ctx, e.actor);
    else if (e.joyce) drawAxeJoyce(ctx, e.joyce);
  }
  // The heroes' HP bars go over everything that stands, so an enemy in front of a hero never hides his.
  for (const a of view.actors) {
    if (a.kind === 'hero' && a.bar) drawHeroBar(ctx, a, hpBarColor(a.bar.hp, a.bar.hpMax, t, settings.reduceFlashing));
  }
  if (o.figure) { drawFigure(ctx, o.figure.x, o.figure.y, t, false); drawFigure(ctx, o.figure.x, o.figure.y, t, true); }
  for (const f of view.fx) drawFx(ctx, f);
  for (const f of view.floaters) drawFloater(ctx, f);
  if (o.hitboxes) drawBoxes(ctx, view);
  ctx.restore();
  if (VIEW_W < SCREEN_W) drawSideFade(ctx, VIEW_X, VIEW_X + VIEW_W, VIEW_TOP, SCREEN_H - VIEW_TOP);
}

/** Key and word colors from bright to faded. The last step is mist, dim enough to ignore and still over 4.5:1 on a night floor (slate was 2 to 3:1 and hard to read). */
const CORNER_STEPS: [ColorName, ColorName][] = [['amber', 'bone'], ['bone', 'mist'], ['mist', 'mist']];

/**
 * The controls stacked tight in the bottom left corner of the clear band. `fade` runs 0 to 1: keys in amber and words
 * in bone at 0, a neutral grey at 1, in palette steps rather than alpha.
 */
export function drawControlsCorner(ctx: Ctx, fade = 0, alone = false): void {
  const [keyColor, wordColor] = CORNER_STEPS[Math.min(CORNER_STEPS.length - 1, Math.floor(clamp01(fade) * CORNER_STEPS.length))] as [ColorName, ColorName];
  // A hero alone (Hopper in 4.1) has nobody to swap to, so the corner leaves the swap out.
  const rows = controlRows().filter((r) => !alone || r.what !== 'SWAP');
  rows.forEach((r, i) => {
    const x = VIEW_X + 4, y = SCREEN_H - 9 - (rows.length - 1 - i) * 8;
    const w = outlinedText(ctx, r.keys, x, y, keyColor);
    outlinedText(ctx, r.what, x + w + 4, y, wordColor);
  });
}

// ---------------------------------------------------------------- night light and flash
/** Every pool of light in view, in screen px: stage lamps, lit windows, lit Christmas lights, floodlights, the lantern, a lit fire-door box and burning vines. */
function glowLights(stage: Stage, view: SimView, cam: Camera, flicker: number): Glow[] {
  const sx = (wx: number): number => wx - cam.x + view.shake.x;
  const sy = (wy: number): number => wy - cam.y + VIEW_TOP + view.shake.y;
  const out: Glow[] = [];
  if (HERO_POOL_R > 0) out.push({ x: sx(view.focus.x), y: sy(view.focus.y - 7), r: HERO_POOL_R, flicker: 0.15 + flicker });
  for (const l of stage.lights) out.push({ x: sx(l.x), y: sy(l.y), r: l.r * LAMP_POOL, flicker: (l.flicker ?? 0) + flicker * 0.6 });
  for (const w of stage.baked.windows) out.push({ x: sx(w.x), y: sy(w.y), r: 30, k: 1.1 });
  for (const p of view.props) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const on = p.state === 'lit' || p.state === 'open';
    if (p.kind === 'lights' && on) out.push({ x: sx(cx), y: sy(cy), r: 40, flicker: 0.4 + flicker * 0.6 });
    else if (p.kind === 'floodlight' && p.state !== 'off') out.push({ x: sx(cx), y: sy(cy - 6), r: 64, k: 1.15, flicker: 0.1 + flicker * 0.4 });
    else if (p.kind === 'tower' && p.state !== 'off') out.push({ x: sx(towerPool(p).x), y: sy(towerPool(p).y), r: 36, k: 0.8, flicker: 0.1 + flicker * 0.4 });
    else if (p.kind === 'target') out.push({ x: sx(cx), y: sy(cy), r: on ? 34 : 22, flicker: 0.3 });
    // The fire-door box glows once it is lit, and vines throw a flickering light while they burn.
    else if (p.kind === 'firebox' && on) out.push({ x: sx(cx), y: sy(cy), r: 30, k: 1.1, flicker: 0.5 + flicker * 0.6 });
    else if (p.kind === 'vines' && p.state === 'lit') out.push({ x: sx(cx), y: sy(cy), r: 36, k: 1.2, flicker: 0.8 + flicker * 0.5 });
  }
  return out;
}

/** The prop is inside the camera's clear band, so a caret over it can be seen. */
export const inView = (p: PropView, cam: { x: number; y: number }): boolean =>
  p.x + p.w > cam.x + VIEW_X && p.x < cam.x + VIEW_X + VIEW_W && p.y + p.h > cam.y && p.y < cam.y + SCREEN_H - VIEW_TOP;

/**
 * The hint the party sees: the prop its caret points at and the words under the screen, or null. A hint from trying a gate or door is shown where
 * the party stands, which can be far from the puzzle's own prop (the sensor, the lantern): it shows near either one, and the caret goes on the
 * puzzle's prop when it is in view, else on the gate or door that was tried. `watched` are the props the puzzle reads, `tried` the id of that gate.
 */
export function puzzleHint(stuck: PuzzleDef | null, watched: readonly PropView[], tried: string | null, hero: Vec2, cam: Camera): { prop: PropView; text: string } | null {
  const stuckProp = stuck && watched.find((p) => p.id === stuck.prop);
  const triedProp = tried ? watched.find((p) => p.id === tried) : undefined;
  const atHint = stuckProp && (isNear(stuckProp, hero) || (triedProp && isNear(triedProp, hero)));
  const caretOn = stuckProp && (triedProp && !inView(stuckProp, cam) ? triedProp : stuckProp);
  return stuck && caretOn && atHint ? { prop: caretOn, text: stuck.hint } : null;
}

/** The klaxon's glow: bands of red stepping in from the edge of the world view, each one fainter than the one before. `level`
 * is Klaxon.level(), 0 to 1. Nothing here blinks, so a steady level (Reduce flashing) is a steady picture. */
export function drawKlaxon(ctx: Ctx, level: number): void {
  if (level <= 0.01) return;
  const y0 = VIEW_TOP, h = SCREEN_H - VIEW_TOP;
  ctx.fillStyle = PAL.red;
  for (const b of BANDS) {
    ctx.globalAlpha = Math.min(1, level * b.a);
    ctx.fillRect(0, y0, SCREEN_W, b.w);
    ctx.fillRect(0, y0 + h - b.w, SCREEN_W, b.w);
    ctx.fillRect(0, y0 + b.w, b.w, h - 2 * b.w);
    ctx.fillRect(SCREEN_W - b.w, y0 + b.w, b.w, h - 2 * b.w);
  }
  ctx.globalAlpha = 1;
}

/** The white flash over the world, for a big hit or a crit. */
export function drawFlash(ctx: Ctx, flash: number): void {
  if (flash <= 0.01) return;
  ctx.globalAlpha = Math.min(1, flash);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- small overlays
/** A short line over a point in world space, on a dark strip so it reads on any ground. It wraps at `cols` characters
 * and stays inside the clear band. */
export function drawCallout(ctx: Ctx, text: string, wx: number, wy: number, cam: Camera, color: ColorName = 'white', cols = 26): void {
  const lines = wrapText(text, cols);
  const w = Math.max(...lines.map((l) => textWidth(l)));
  const h = lines.length * 9;
  const x = Math.max(VIEW_X + 2, Math.min(VIEW_X + VIEW_W - w - 4, Math.round(wx - cam.x - w / 2)));
  const y = Math.max(VIEW_TOP + 2, Math.round(wy - cam.y + VIEW_TOP - h - 2));
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 3);
  lines.forEach((l, i) => drawText(ctx, l, x, y + i * 9, color));
}

/** The title screen's yellow caret, turned to point down at the prop and bobbing over it: where to look when the party
 * is stuck. A prop at the top of the view has no room above it, so the caret sits under it and points up. It stays in
 * the clear band either way, so a prop just out of view still gets a caret at the edge facing it. Holds still when Reduce
 * flashing is on. Draw it after the world so nothing covers it. */
export function drawPuzzleCaret(ctx: Ctx, r: { x: number; y: number; w: number; h: number }, cam: Camera, t: number): void {
  const bob = settings.reduceFlashing ? 0 : BOB[(t >> 3) % BOB.length] as number;
  const top = Math.round(r.y - cam.y + VIEW_TOP), bottom = top + r.h;
  const up = top - CARET_ROOM < VIEW_TOP;
  // The tip is the caret's fourth column. It is the seventh row of the down caret and the second row of the up one.
  const x = Math.max(VIEW_X + 1, Math.min(VIEW_X + VIEW_W - 8, Math.round(r.x + r.w / 2 - cam.x) - 3));
  const y = up ? Math.max(VIEW_TOP + 1, bottom + 1 + bob) : Math.min(SUBTITLE_Y - 12, top - 9 - bob);
  drawIcon(ctx, up ? 'cursorUp' : 'cursorDown', x, y, t);
}

/** Ticks between the two sizes of a live mouse mark. */
const MARK_PULSE = 8;
/** The mouse marks, one string per row, X for a pixel: the walk ring is 9 by 5 and lies flat on the ground, the attack reticle is the four ends of a 13 by 7 ellipse. Each has a smaller twin for the pulse. */
const RING = ['..XXXXX..', '.X.....X.', 'X.......X', '.X.....X.', '..XXXXX..'];
const RING_SMALL = ['.XXXXX.', 'X.....X', '.XXXXX.'];
const RETICLE = ['......X......', '......X......', '.............', 'XX.........XX', '.............', '......X......', '......X......'];
const RETICLE_SMALL = ['.....X.....', '.....X.....', 'XX.......XX', '.....X.....', '.....X.....'];

/** The mouse's mark: a small ring on the spot a click sent the hero to, or a reticle under the foe it sent him at (world/mouseplay.ts MouseMark). It pulses while the goal is live and blinks out over MARK_FRAMES after it ends. */
export function drawClickMark(ctx: Ctx, m: MouseMark, cam: Camera, _t: number): void {
  // After the goal ends the mark blinks out, shown for four ticks and hidden for four, and is gone at MARK_FRAMES.
  if (!m.live && (m.age >= MARK_FRAMES || ((m.age >> 2) & 1) !== 0)) return;
  // The pulse is the same mark one pixel smaller on every other beat. Reduce flashing keeps it steady.
  const small = m.live && !settings.reduceFlashing && Math.floor(m.age / MARK_PULSE) % 2 === 1;
  const walk = m.kind === 'walk';
  const rows = walk ? (small ? RING_SMALL : RING) : (small ? RETICLE_SMALL : RETICLE);
  const x0 = Math.round(m.x - cam.x) - ((rows[0] as string).length >> 1), y0 = Math.round(m.y - cam.y + VIEW_TOP) - (rows.length >> 1);
  clipped(ctx, VIEW_X, VIEW_TOP, VIEW_W, SCREEN_H - VIEW_TOP, () => {
    ctx.fillStyle = walk ? PAL.leaf : PAL.hot;
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) if (row[dx] === 'X') ctx.fillRect(x0 + dx, y0 + dy, 1, 1);
    });
  });
}

/** One line centered low on the screen on a dark strip, like a film subtitle. It stays put while the camera moves. */
export function drawSubtitle(ctx: Ctx, text: string): void {
  const w = textWidth(text);
  const x = Math.round((SCREEN_W - w) / 2);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x - 4, SUBTITLE_Y - 3, w + 8, 13);
  drawText(ctx, text, x, SUBTITLE_Y, 'white');
}

/** One line in the 3x5 font centered just under the HUD strip, with a 1 px ink outline and no strip behind it, so it
 * reads on the dark yard and the white Lab walls alike without covering the world. It stays put while the camera moves,
 * and drops under the boss bar while one shows, and a row more under the channelers' bars (hudlayout.ts). */
export function drawTopLine(ctx: Ctx, text: string, color: ColorName, underBoss = false, channel = false): void {
  const x = Math.round((SCREEN_W - tinyWidth(text)) / 2), y = VIEW_TOP + (underBoss ? TOP_LINE_BOSS_DY : TOP_LINE_DY) + (channel ? NEXT_DY : 0);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]] as const) drawTinyText(ctx, text, x + dx, y + dy, 'ink');
  drawTinyText(ctx, text, x, y, color);
}

/** The level-up effect around each hero who just gained a level: a ring at the feet, sparkles circling up and, for a
 * talent or a Nat 20, a callout. It follows the hero, so it keeps playing while they run, and the game never stops for it.
 * Draw it after the world and before the HUD. */
export function drawLevelFx(ctx: Ctx, fx: readonly LevelFx[], view: SimView, cam: Camera): void {
  // Callouts per hero, so two level-ups in one tick stack up the screen and never share a spot.
  const calls = new Map<HeroId, { text: string; color: ColorName }[]>();
  const say = (hero: HeroId, text: string, color: ColorName): void => {
    const list = calls.get(hero) ?? [];
    if (!list.some((c) => c.text === text)) list.push({ text, color });
    calls.set(hero, list);
  };
  for (const f of fx) {
    const a = view.actors.find((m) => m.kind === 'hero' && m.id === f.hero);
    if (!a) continue;
    const sx = Math.round(a.x - cam.x + view.shake.x), sy = Math.round(a.y - cam.y + VIEW_TOP + view.shake.y);
    const main: ColorName = f.nat20 ? 'orange' : 'yellow';
    clipped(ctx, 0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP, () => {
      const r = ringRadius(f.t, f.nat20 ? 30 : 22);
      if (r > 0) {
        const n = Math.max(16, r * 2);
        // Squashed to half height so the ring lies flat on the ground.
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2;
          box(ctx, sx + Math.cos(ang) * r, sy + Math.sin(ang) * r * 0.5, 1, 1, main);
        }
      }
      for (let i = 0; i < SPARKLES; i++) {
        const p = sparkle(f.t, i);
        if (!p) continue;
        const lit = p.bright || settings.reduceFlashing;
        box(ctx, sx + p.dx, sy + p.dy, lit ? 2 : 1, lit ? 2 : 1, lit ? 'white' : main);
      }
    });
    if (f.nat20 && f.t >= 4 && f.t < TALENT_TO) say(f.hero, 'NAT 20!', 'yellow');
    if (f.talent && talentShowing(f.t)) say(f.hero, `NEW TALENT: ${f.talent}`, 'cyan');
  }
  for (const [hero, list] of calls) {
    const a = view.actors.find((m) => m.kind === 'hero' && m.id === hero);
    if (!a) continue;
    list.forEach((c, k) => drawCallout(ctx, c.text, a.x, a.y - 40 - k * 12, cam, c.color));
  }
}

export function drawFade(ctx: Ctx, amount: number): void {
  if (amount <= 0) return;
  ctx.globalAlpha = Math.min(1, amount);
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.globalAlpha = 1;
}
