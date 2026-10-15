// The touch screen dressed as a Game Boy, drawn with smooth shapes at the screen's own resolution. No DOM at import.
// The overlay sits behind the game and covers the whole viewport, so the body is everywhere but the screen.
// Layout units are CSS px. The parts that never move are drawn once per layout and theme and kept; the keys
// (touchkeys.ts) are drawn on top. The colours are a ShellTheme (touchtheme.ts): the grey Game Boy, or a dark one.
// The name on the body is the game's own. touch-controls.html shows it on phone frames.
import type { Rect, TouchButton, TouchLayout } from '../core/touchlayout.ts';
import type { Vec2 } from '../core/types.ts';
import { drawKeys } from './touchkeys.ts';
import { PILL_TILT, SANS, SLOT_TILT, capsule, center, circle, roundRect } from './touchshapes.ts';
import type { C2D } from './touchshapes.ts';
import { LIGHT, alpha } from './touchtheme.ts';
import type { ShellTheme } from './touchtheme.ts';

export { pressedArms } from './touchkeys.ts';

export interface TouchView {
  layout: TouchLayout;
  held: ReadonlySet<TouchButton>;
  /** Where the D-pad pushes while a thumb is on it, else null. */
  dpad: Vec2 | null;
  /** The d20 key glows gold while the Crit is ready. */
  burstReady: boolean;
  /** The shell's colours. The grey Game Boy when left out. */
  theme?: ShellTheme;
}

/** Text in the shell's print colour, slanted the way the Game Boy prints its labels. */
function label(ctx: C2D, T: ShellTheme, text: string, x: number, y: number, size: number, align: CanvasTextAlign = 'center'): void {
  ctx.font = `italic 700 ${size}px ${SANS}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = T.print;
  ctx.fillText(text, x, y);
}

// ---------------------------------------------------------------- the parts that never move
/** The body: the whole viewport, with the big round corner at the bottom right. */
function bodyPath(ctx: C2D, w: number, h: number, corner: number): void {
  roundRect(ctx, 0, 0, w, h, 0, 0, corner, 0);
}

function drawBody(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const { w, h } = l.viewport;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, T.bodyHi);
  g.addColorStop(0.35, T.body);
  g.addColorStop(1, T.bodyEnd);
  bodyPath(ctx, w, h, l.shell.corner);
  ctx.fillStyle = g;
  ctx.fill();
  if (T.decor) {
    ctx.save();
    bodyPath(ctx, w, h, l.shell.corner);
    ctx.clip();
    T.decor(ctx, l);
    ctx.restore();
  }
}

/** The groove across the top with the OFF·ON switch over it, and the two notches at its ends. */
function drawGroove(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const y = l.shell.groove;
  if (y === null) return;
  const { w } = l.viewport;
  ctx.fillStyle = T.bodyLo;
  ctx.fillRect(0, y, w, 1.5);
  ctx.fillStyle = T.bodyHi;
  ctx.fillRect(0, y + 1.5, w, 1);
  for (const x of [w * 0.07, w * 0.93]) {
    ctx.fillStyle = T.bodyLo;
    ctx.fillRect(x - 0.75, 0, 1.5, y);
    ctx.fillStyle = T.bodyHi;
    ctx.fillRect(x + 0.75, 0, 1, y);
  }
  const size = Math.max(7, Math.min(10, w * 0.022));
  const x = l.shell.bezel.x + l.shell.bezel.w * 0.1;
  ctx.font = `600 ${size}px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const text = 'OFF • ON';
  // Pressed into the plastic: a light edge under a dark one.
  ctx.fillStyle = T.bodyHi;
  ctx.fillText(`◁ ${text} ▷`, x, y - 3);
  ctx.fillStyle = T.bodyDeep;
  ctx.fillText(`◁ ${text} ▷`, x, y - 4);
}

function drawBezel(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const s = l.shell;
  const b = s.bezel;
  const small = Math.max(5, Math.min(10, b.w * 0.02));
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, T.bezelHi);
  g.addColorStop(1, T.bezel);
  roundRect(ctx, b.x, b.y, b.w, b.h, small, small, s.bezelCorner, small);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = T.bezelLo;
  ctx.stroke();

  // The well the screen sits in. The game covers all of it but this thin dark edge.
  const gm = l.game;
  ctx.fillStyle = T.well;
  ctx.fillRect(gm.x - 2, gm.y - 2, gm.w + 4, gm.h + 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(gm.x, gm.y, gm.w, gm.h);

  if (!T.bare) drawStripes(ctx, s.stripes, T);
  drawLed(ctx, l, T);
}

/** The line of small text over the screen with a stripe in each colour on each side of it. */
function drawStripes(ctx: C2D, r: Rect, T: ShellTheme): void {
  const text = 'DOT MATRIX WITH STEREO SOUND';
  const cy = r.y + r.h * 0.55;
  let size = Math.max(6, Math.min(12, r.h * 0.36));
  ctx.font = `500 ${size}px ${SANS}`;
  const room = r.w * 0.62;
  let tw = ctx.measureText(text).width * 1.08;
  if (tw > room) {
    size *= room / tw;
    ctx.font = `500 ${size}px ${SANS}`;
    tw = ctx.measureText(text).width * 1.08;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = T.stripeText;
  ctx.fillText(text, r.x + r.w / 2, cy);

  const lw = Math.max(1.25, r.h * 0.07);
  const gap = size * 0.9;
  const inset = r.w * 0.04;
  const spans: [number, number][] = [
    [r.x + inset, r.x + r.w / 2 - tw / 2 - gap],
    [r.x + r.w / 2 + tw / 2 + gap, r.x + r.w - inset],
  ];
  for (const [x0, x1] of spans) {
    if (x1 - x0 < 6) continue;
    ctx.fillStyle = T.stripeA;
    ctx.fillRect(x0, cy - lw * 1.9, x1 - x0, lw);
    ctx.fillStyle = T.stripeB;
    ctx.fillRect(x0, cy + lw * 0.9, x1 - x0, lw);
  }
}

/** The battery light, lit, in the bezel's left margin. Its word sits under it when the margin is wide enough. */
function drawLed(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const { x, y, label: word } = l.shell.led;
  const r = Math.max(2.5, Math.min(6, l.shell.bezel.w * 0.011));
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  glow.addColorStop(0, T.ledGlow);
  glow.addColorStop(1, 'rgba(255, 70, 60, 0)');
  ctx.fillStyle = glow;
  circle(ctx, x, y, r * 3);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, T.ledHi);
  g.addColorStop(0.45, T.led);
  g.addColorStop(1, T.ledLo);
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
  if (word && !T.bare) {
    const size = Math.max(6, Math.min(10, r * 1.6));
    ctx.font = `500 ${size}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = T.stripeText;
    ctx.fillText('BATTERY', x, y + r * 2.2);
  }
}

/** The game's name where the Game Boy prints its own: a small upright word and a big slanted one. */
function drawLogo(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const logo = l.shell.logo;
  if (!logo || T.bare) return;
  const small = `800 ${logo.size * 1.0}px ${SANS}`;
  const big = `italic 800 ${logo.size * 1.42}px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = small;
  const a = '8-bit';
  const aw = ctx.measureText(a).width;
  ctx.font = big;
  const b = 'UPSIDE DOWN';
  const bw = ctx.measureText(b).width;
  const gap = logo.size * 0.35;
  const room = l.shell.bezel.w * 0.8;
  const k = Math.min(1, room / (aw + gap + bw));
  ctx.save();
  ctx.translate(logo.x, logo.y);
  ctx.scale(k, k);
  if (T.logoGlow) {
    ctx.shadowColor = T.logoGlow;
    ctx.shadowBlur = logo.size * 0.6;
  }
  ctx.fillStyle = T.logo;
  ctx.font = small;
  ctx.fillText(a, 0, 0);
  ctx.font = big;
  ctx.fillText(b, aw + gap, 0);
  ctx.restore();
}

/** Six slots cut on a slant, inside the body's round corner. */
function drawGrill(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const g = l.shell.grill;
  if (!g || T.bare) return;
  const { w, h } = l.viewport;
  ctx.save();
  // Keep the slots off the round corner and off the screen's edge.
  bodyPath(ctx, w - 10, h - 10, Math.max(0, l.shell.corner - 10));
  ctx.clip();
  const len = Math.min(g.h * 0.9, g.w * 0.62);
  const thick = Math.max(5, Math.min(10, len * 0.11));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cx = g.x + g.w * (0.08 + t * 0.84);
    const cy = g.y + g.h * (0.58 - t * 0.12);
    capsule(ctx, cx + 0.8, cy + 1.2, len, thick, SLOT_TILT);
    ctx.fillStyle = T.bodyHi;
    ctx.fill();
    capsule(ctx, cx, cy, len, thick, SLOT_TILT);
    ctx.fillStyle = T.bodyDeep;
    ctx.fill();
  }
  ctx.restore();
}

/** The shallow wells the round buttons and the D-pad sit in, and the words printed by the buttons. */
function drawSockets(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  const b = l.buttons;
  if (T.keys === 'plastic') {
    for (const id of ['a', 'b', 'burst', 'swap'] as const) {
      const c = center(b[id]);
      const r = b[id].w / 2;
      const g = ctx.createRadialGradient(c.x, c.y - r * 0.2, r * 0.6, c.x, c.y, r + 4);
      g.addColorStop(0, T.bodyLo);
      g.addColorStop(1, alpha(T.bodyLo, 0));
      ctx.fillStyle = g;
      circle(ctx, c.x, c.y, r + 4);
      ctx.fill();
    }
    // The faint arrows pressed into the body by each arm of the D-pad.
    const { dpad: d, dpadR: r } = l;
    const t = r * 0.16;
    ctx.fillStyle = T.bodyLo;
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate((k * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(r + t * 1.9, 0);
      ctx.lineTo(r + t * 0.9, -t * 0.7);
      ctx.lineTo(r + t * 0.9, t * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  const face = b.a.w;
  const big = Math.max(11, face * 0.24);
  for (const id of ['a', 'b'] as const) {
    const r0 = b[id];
    label(ctx, T, id.toUpperCase(), r0.x + r0.w * 0.72, r0.y + r0.h + big + 2, big);
  }
  const small = Math.max(8, Math.min(11, b.swap.w * 0.2));
  label(ctx, T, 'SWAP', center(b.swap).x, b.swap.y + b.swap.h + small + 2, small);
  label(ctx, T, 'CRIT', center(b.burst).x, b.burst.y + b.burst.h + small + 2, small);
  for (const id of ['select', 'start'] as const) {
    const r0 = b[id];
    const c = center(r0);
    ctx.save();
    ctx.translate(c.x, c.y + r0.h * 0.28);
    ctx.rotate(PILL_TILT);
    label(ctx, T, id.toUpperCase(), 0, small * 0.4, small);
    ctx.restore();
  }
}

function drawShell(ctx: C2D, l: TouchLayout, T: ShellTheme): void {
  drawBody(ctx, l, T);
  if (!T.bare) drawGroove(ctx, l, T);
  drawBezel(ctx, l, T);
  drawLogo(ctx, l, T);
  drawGrill(ctx, l, T);
  drawSockets(ctx, l, T);
}

// ---------------------------------------------------------------- the whole thing
/** The never-moving parts for each layout, already drawn at the overlay's size in one theme. */
const shells = new WeakMap<TouchLayout, { theme: ShellTheme; canvas: HTMLCanvasElement }>();

function shellFor(l: TouchLayout, w: number, h: number, T: ShellTheme): HTMLCanvasElement {
  const have = shells.get(l);
  if (have && have.theme === T && have.canvas.width === w && have.canvas.height === h) return have.canvas;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') as C2D;
  ctx.setTransform(w / l.viewport.w, 0, 0, h / l.viewport.h, 0, 0);
  drawShell(ctx, l, T);
  shells.set(l, { theme: T, canvas: c });
  return c;
}

/** Clears the overlay and draws the whole Game Boy. Transparent only past the body's round corner. */
export function drawTouch(ctx: C2D, v: TouchView): void {
  const l = v.layout;
  const T = v.theme ?? LIGHT;
  const { width: w, height: h } = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(shellFor(l, w, h, T), 0, 0);
  ctx.setTransform(w / l.viewport.w, 0, 0, h / l.viewport.h, 0, 0);
  drawKeys(ctx, v, T);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** The overlay's backing size for a layout: the viewport in device pixels. */
export function overlaySize(l: TouchLayout): { w: number; h: number } {
  return { w: Math.round(l.viewport.w * l.dpr), h: Math.round(l.viewport.h * l.dpr) };
}
