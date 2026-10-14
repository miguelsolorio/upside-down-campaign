// Drawing for the play scene: the world pass (with the light pools at night), the flash, the scare figure and the small overlays.
// World-space draws assume the caller translated by (-camX, VIEW_TOP - camY); drawWorld does that itself.
import type { ActorView, Floater, HeroId, PropView, SimView, Vec2 } from '../core/types.ts';
import type { Camera } from '../core/camera.ts';
import { SCREEN_H, SCREEN_W, VIEW_TOP } from '../core/config.ts';
import { levelHintLines } from '../core/bindings.ts';
import { settings } from '../core/settings.ts';
import { wrapText } from '../core/text.ts';
import { box, clipped, dither } from '../ui/kit.ts';
import { drawActor, drawFx, drawItem, drawProp, drawStage, drawText, paintGlow, textWidth } from '../gfx/index.ts';
import type { Glow } from '../gfx/index.ts';
import { PAL } from '../gfx/palette.ts';
import type { ColorName } from '../gfx/palette.ts';
import type { Stage } from './stage.ts';
import { SPARKLES, TALENT_TO, ringRadius, sparkle, talentShowing } from './levelfx.ts';
import type { LevelFx } from './levelfx.ts';

type Ctx = CanvasRenderingContext2D;

/** Radius of a pool of light around the active hero, in px. 0 draws none: the night art is readable without one. */
const HERO_POOL_R = 0;
/** Stage lamps paint a pool this much smaller than the radius their data gives. */
const LAMP_POOL = 0.85;
/** How far the puzzle brackets sit off the prop at each step of their breathing, 8 frames a step. */
const BREATH = [0, 1, 2, 3, 2, 1];

export interface WorldOpts {
  /** Draw the foot and hurt boxes (dev panel). */
  hitboxes: boolean;
  /** The dark shape of the scare, feet position in world px. */
  figure: Vec2 | null;
  /** The pools of light at night. level scales them all (the scare stutters them) and flicker adds jitter. */
  light: { level: number; flicker: number };
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
    drawText(ctx, f.text, 0, 0, f.color, { align: 'center', shadow: true });
    ctx.restore();
  } else {
    drawText(ctx, f.text, x, y, f.color, { align: 'center', shadow: true });
  }
}

function drawBoxes(ctx: Ctx, view: SimView): void {
  ctx.lineWidth = 1;
  for (const a of view.actors) {
    if (a.kind === 'npc') continue;
    ctx.strokeStyle = PAL.leaf;
    ctx.strokeRect(Math.round(a.x) - 5 + 0.5, Math.round(a.y) - 8 + 0.5, 9, 7);
    ctx.strokeStyle = PAL.hot;
    ctx.strokeRect(Math.round(a.x) - 6 + 0.5, Math.round(a.y) - 14 + 0.5, 11, 13);
  }
  ctx.strokeStyle = PAL.cyan;
  for (const p of view.props) ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
}

/** Stage, ground items, then props and actors in one painter's pass by their bottom edge, then fx and floaters. */
export function drawWorld(ctx: Ctx, stage: Stage, view: SimView, cam: Camera, t: number, o: WorldOpts): void {
  ctx.save();
  // Nothing in the world may draw into the HUD strip, whatever the camera does.
  ctx.beginPath();
  ctx.rect(0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP);
  ctx.clip();
  ctx.translate(-cam.x + view.shake.x, VIEW_TOP - cam.y + view.shake.y);
  drawStage(ctx, stage.baked, cam.x - view.shake.x, cam.y - view.shake.y, t);
  const night = stage.time === 'night';
  // The pools go on the ground, under everything that moves, so the party is never tinted by them.
  if (night) paintGlow(ctx, glowLights(stage, view, cam, o.light.flicker), t, o.light.level);
  for (const it of view.items) drawItem(ctx, it);
  const order: { y: number; actor?: ActorView; prop?: PropView }[] = [];
  for (const p of view.props) order.push({ y: p.y + p.h, prop: p });
  for (const a of view.actors) order.push({ y: a.y, actor: a });
  order.sort((l, r) => l.y - r.y);
  for (const e of order) {
    if (e.prop) drawProp(ctx, e.prop, night);
    else if (e.actor) drawActor(ctx, e.actor);
  }
  if (o.figure) { drawFigure(ctx, o.figure.x, o.figure.y, t, false); drawFigure(ctx, o.figure.x, o.figure.y, t, true); }
  for (const f of view.fx) drawFx(ctx, f);
  for (const f of view.floaters) drawFloater(ctx, f);
  if (o.hitboxes) drawBoxes(ctx, view);
  ctx.restore();
}

/** A two-line controls reminder at the bottom of the screen, for a few seconds when the story is skipped. */
export function drawControlsHint(ctx: Ctx, t: number, total: number): void {
  if (t > total - 60 && Math.floor(t / 4) % 2 === 0) return;
  const lines = levelHintLines();
  lines.forEach((line, k) => {
    drawText(ctx, line, SCREEN_W / 2, 209 - (lines.length - 1 - k) * 9, k === 0 ? 'bone' : 'mist', { align: 'center', shadow: true });
  });
}

// ---------------------------------------------------------------- night light and flash
/** Every pool of light in view, in screen px: stage lamps, lit windows, lit Christmas lights, floodlights and the lantern. */
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
    else if (p.kind === 'target') out.push({ x: sx(cx), y: sy(cy), r: on ? 34 : 22, flicker: 0.3 });
  }
  return out;
}

/** The white flash over the world, for a big hit or a crit. */
export function drawFlash(ctx: Ctx, view: SimView): void {
  if (view.flash <= 0.01) return;
  ctx.globalAlpha = Math.min(1, view.flash);
  ctx.fillStyle = PAL.white;
  ctx.fillRect(0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- small overlays
/** A short line over a point in world space, on a dark strip so it reads on any ground. */
export function drawCallout(ctx: Ctx, text: string, wx: number, wy: number, cam: Camera, color: ColorName = 'white'): void {
  const lines = wrapText(text, 26);
  const w = Math.max(...lines.map((l) => textWidth(l)));
  const h = lines.length * 9;
  const x = Math.max(2, Math.min(SCREEN_W - w - 4, Math.round(wx - cam.x - w / 2)));
  const y = Math.max(VIEW_TOP + 2, Math.round(wy - cam.y + VIEW_TOP - h - 2));
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 3);
  lines.forEach((l, i) => drawText(ctx, l, x, y + i * 9, color));
}

/** Corner brackets that breathe in and out and a light dither over the prop: where to look when the party is stuck.
 * An optional label sits above it. Holds still when Reduce flashing is on. Draw it after the world so nothing covers it. */
export function drawPuzzleHighlight(ctx: Ctx, r: { x: number; y: number; w: number; h: number }, cam: Camera, t: number, label?: string): void {
  const gap = settings.reduceFlashing ? 2 : 1 + (BREATH[(t >> 3) % BREATH.length] as number);
  const x0 = Math.round(r.x - cam.x) - gap, y0 = Math.round(r.y - cam.y + VIEW_TOP) - gap;
  const w = r.w + gap * 2, h = r.h + gap * 2;
  if (x0 + w < 0 || x0 > SCREEN_W || y0 + h < VIEW_TOP || y0 > SCREEN_H) return;
  clipped(ctx, 0, VIEW_TOP, SCREEN_W, SCREEN_H - VIEW_TOP, () => {
    dither(ctx, x0, y0, w, h, 'yellow', 4);
    const arm = Math.min(6, w >> 1, h >> 1);
    for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]] as const) {
      box(ctx, dx > 0 ? cx : cx - arm, dy > 0 ? cy : cy - 2, arm, 2, 'yellow');
      box(ctx, dx > 0 ? cx : cx - 2, dy > 0 ? cy : cy - arm, 2, arm, 'yellow');
    }
  });
  if (label) drawCallout(ctx, label, r.x + r.w / 2, r.y - gap - 1, cam, 'yellow');
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
