// The parts of the touch screen's Game Boy that press: the D-pad, the round keys and the pills, redrawn when a finger
// moves. A plastic shell draws them with domes and shadows; an outline shell draws thin rings that fill while pressed.
import type { Rect, TouchLayout } from '../core/touchlayout.ts';
import type { Vec2 } from '../core/types.ts';
import { DIE_HEX, DIE_TRIS } from './die.ts';
import type { TouchView } from './touchdraw.ts';
import { PILL_TILT, capsule, center, circle, roundRect, roundRectPath } from './touchshapes.ts';
import type { C2D } from './touchshapes.ts';
import { DIE_READY, alpha } from './touchtheme.ts';
import type { DieColors, ShellTheme } from './touchtheme.ts';

/** The arms a push presses: a diagonal presses two. Right, down, left, up. */
export function pressedArms(v: Vec2 | null): [boolean, boolean, boolean, boolean] {
  const on = 0.38;
  if (!v) return [false, false, false, false];
  return [v.x > on, v.y > on, v.x < -on, v.y < -on];
}

/** Both bars of the cross in one path, so it fills and strokes as one shape. */
function crossPath(ctx: C2D, x: number, y: number, r: number, t: number, corner: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x - r, y - t, r * 2, t * 2, corner, corner, corner, corner);
  roundRectPath(ctx, x - t, y - r, t * 2, r * 2, corner, corner, corner, corner);
}

/** The cross, rocked toward the arms a thumb presses. */
function drawDpad(ctx: C2D, l: TouchLayout, push: Vec2 | null, T: ShellTheme): void {
  const { dpad: d, dpadR: r } = l;
  const t = r * 0.34;
  const arms = pressedArms(push);
  const tilt = push ? { x: push.x * 1.5, y: push.y * 1.5 } : { x: 0, y: 0 };
  const corner = Math.max(2, r * 0.06);

  ctx.save();
  ctx.shadowColor = T.shade;
  ctx.shadowBlur = r * 0.12;
  ctx.shadowOffsetY = push ? r * 0.025 : r * 0.06;
  ctx.fillStyle = T.dpad;
  crossPath(ctx, d.x + tilt.x, d.y + tilt.y, r, t, corner);
  ctx.fill();
  ctx.restore();

  const cx = d.x + tilt.x, cy = d.y + tilt.y;
  // Light from the top left: a soft sheen over the cross.
  ctx.save();
  roundRect(ctx, cx - r, cy - t, r * 2, t * 2, corner, corner, corner, corner);
  ctx.clip();
  const sheenH = ctx.createLinearGradient(0, cy - t, 0, cy + t);
  sheenH.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheenH.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = sheenH;
  ctx.fillRect(cx - r, cy - t, r * 2, t * 2);
  ctx.restore();
  ctx.save();
  roundRect(ctx, cx - t, cy - r, t * 2, r * 2, corner, corner, corner, corner);
  ctx.clip();
  const sheenV = ctx.createLinearGradient(cx - t, 0, cx + t, 0);
  sheenV.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheenV.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.fillStyle = sheenV;
  ctx.fillRect(cx - t, cy - r, t * 2, r * 2);
  ctx.restore();

  // Each arm: three ridges near its tip, and a shade that deepens toward the tip when it is pressed.
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((k * Math.PI) / 2);
    ctx.strokeStyle = T.dpadLo;
    ctx.lineWidth = Math.max(1, r * 0.022);
    for (let j = 0; j < 3; j++) {
      const x = r * (0.52 + j * 0.13);
      ctx.beginPath();
      ctx.moveTo(x, -t * 0.62);
      ctx.lineTo(x, t * 0.62);
      ctx.stroke();
      ctx.strokeStyle = T.dpadHi;
      ctx.beginPath();
      ctx.moveTo(x + ctx.lineWidth, -t * 0.62);
      ctx.lineTo(x + ctx.lineWidth, t * 0.62);
      ctx.stroke();
      ctx.strokeStyle = T.dpadLo;
    }
    // A pressed arm goes dark toward its tip, and the arm across from it catches the light as it rises.
    const lit = arms[(k + 2) % 4] && !arms[k];
    if (arms[k] || lit) {
      const g = ctx.createLinearGradient(t, 0, r, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, arms[k] ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.14)');
      ctx.fillStyle = g;
      roundRect(ctx, t, -t, r - t, t * 2, 0, corner, corner, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  // The dimple in the middle.
  const dr = t * 0.55;
  const dg = ctx.createRadialGradient(cx - dr * 0.3, cy - dr * 0.3, 0, cx, cy, dr);
  dg.addColorStop(0, T.dpadLo);
  dg.addColorStop(1, T.dpadHi);
  ctx.fillStyle = dg;
  circle(ctx, cx, cy, dr);
  ctx.fill();
}

/** The outline cross: a thin ring around the whole shape, a chevron in each arm, and a lit arm wherever it's pressed. */
function outlineDpad(ctx: C2D, l: TouchLayout, push: Vec2 | null, T: ShellTheme): void {
  const { dpad: d, dpadR: r } = l;
  const t = r * 0.34;
  const arms = pressedArms(push);
  const corner = Math.max(2, r * 0.08);
  const lw = Math.max(1.5, r * 0.035);
  // Stroke both bars, then fill them, so only the outer edge of the cross is left.
  crossPath(ctx, d.x, d.y, r, t, corner);
  ctx.strokeStyle = T.rubber;
  ctx.lineWidth = lw * 2;
  ctx.stroke();
  ctx.fillStyle = T.dpad;
  ctx.fill();
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate((k * Math.PI) / 2);
    if (arms[k]) {
      ctx.save();
      ctx.shadowColor = T.abHi;
      ctx.shadowBlur = r * 0.3;
      const g = ctx.createLinearGradient(t * 0.4, 0, r, 0);
      g.addColorStop(0, alpha(T.ab, 0));
      g.addColorStop(1, T.ab);
      ctx.fillStyle = g;
      roundRect(ctx, t * 0.4, -t + lw, r - t * 0.4 - lw, t * 2 - lw * 2, 0, corner, corner, 0);
      ctx.fill();
      ctx.restore();
    }
    const x = r * 0.68, s = t * 0.42;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, -s);
    ctx.lineTo(x + s * 0.5, 0);
    ctx.lineTo(x - s * 0.5, s);
    ctx.strokeStyle = arms[k] ? T.abHi : T.rubberLo;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

/** A round button: a shadow under it, a lit dome on top. Pressed, it drops into its well and the shadow goes. */
function roundButton(ctx: C2D, r0: Rect, down: boolean, T: ShellTheme, face: string, hi: string, lo: string, pressed: string): Vec2 {
  const c = center(r0);
  const r = r0.w / 2 - 2;
  if (T.keys === 'outline') {
    ctx.save();
    circle(ctx, c.x, c.y, r - 1);
    if (down) {
      ctx.shadowColor = hi;
      ctx.shadowBlur = r * 0.6;
      ctx.fillStyle = face;
      ctx.fill();
    } else {
      ctx.fillStyle = T.dpad;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = down ? hi : lo;
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.stroke();
    ctx.restore();
    return c;
  }
  const drop = Math.max(2, r * 0.09);
  const y = c.y + (down ? drop * 0.7 : 0);
  if (!down) {
    ctx.fillStyle = lo;
    circle(ctx, c.x, c.y + drop, r);
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = T.shade;
  ctx.shadowBlur = down ? r * 0.08 : r * 0.25;
  ctx.shadowOffsetY = down ? 1 : r * 0.12;
  const g = ctx.createRadialGradient(c.x - r * 0.35, y - r * 0.4, r * 0.1, c.x, y, r);
  g.addColorStop(0, down ? face : hi);
  g.addColorStop(0.55, down ? pressed : face);
  g.addColorStop(1, down ? lo : pressed);
  ctx.fillStyle = g;
  circle(ctx, c.x, y, r);
  ctx.fill();
  ctx.restore();
  return { x: c.x, y };
}

/** One bold circular arrow, for the key that cycles to the next hero. */
function cycleIcon(ctx: C2D, x: number, y: number, r: number, color: string): void {
  const w = r * 0.3;
  const start = -Math.PI * 0.35;
  const end = Math.PI * 1.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, start, end);
  ctx.stroke();
  // The head, at the end of the arc, pointing along it.
  const hx = x + Math.cos(start) * r * 0.62, hy = y + Math.sin(start) * r * 0.62;
  const tx = -Math.sin(start), ty = Math.cos(start);
  const nx = Math.cos(start), ny = Math.sin(start);
  const len = w * 1.7, half = w * 1.35;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(hx - tx * len, hy - ty * len);
  ctx.lineTo(hx + nx * half + tx * w * 0.2, hy + ny * half + ty * w * 0.2);
  ctx.lineTo(hx - nx * half + tx * w * 0.2, hy - ny * half + ty * w * 0.2);
  ctx.closePath();
  ctx.fill();
}

/** The d20, face on, with the same facets as the pixel die in the HUD. */
function dieIcon(ctx: C2D, x: number, y: number, r: number, scheme: DieColors): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  for (const f of DIE_TRIS) {
    ctx.beginPath();
    ctx.moveTo(f.pts[0][0] * r, f.pts[0][1] * r);
    ctx.lineTo(f.pts[1][0] * r, f.pts[1][1] * r);
    ctx.lineTo(f.pts[2][0] * r, f.pts[2][1] * r);
    ctx.closePath();
    ctx.fillStyle = scheme[f.tier];
    ctx.fill();
    ctx.strokeStyle = scheme.line;
    ctx.lineWidth = Math.max(0.75, r * 0.06);
    ctx.stroke();
  }
  ctx.beginPath();
  DIE_HEX.forEach(([u, v], i) => (i === 0 ? ctx.moveTo(u * r, v * r) : ctx.lineTo(u * r, v * r)));
  ctx.closePath();
  ctx.strokeStyle = scheme.line;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** SELECT or START: a slanted rubber pill that darkens and sinks when pressed. */
function pill(ctx: C2D, r0: Rect, down: boolean, T: ShellTheme): void {
  const c = center(r0);
  const len = r0.w * 0.66;
  const thick = Math.max(9, r0.h * 0.26);
  const cy = c.y - r0.h * 0.12;
  if (T.keys === 'outline') {
    ctx.save();
    capsule(ctx, c.x, cy, len, thick, PILL_TILT);
    if (down) {
      ctx.shadowColor = T.rubberHi;
      ctx.shadowBlur = thick;
      ctx.fillStyle = T.rubberHi;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.strokeStyle = down ? T.rubberHi : T.rubberLo;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.save();
  capsule(ctx, c.x, cy + 1, len + 4, thick + 4, PILL_TILT);
  ctx.fillStyle = T.bodyLo;
  ctx.fill();
  ctx.shadowColor = T.shade;
  ctx.shadowBlur = down ? 1 : 3;
  ctx.shadowOffsetY = down ? 0.5 : 2;
  capsule(ctx, c.x, cy + (down ? 1 : 0), len, thick, PILL_TILT);
  ctx.fillStyle = down ? T.rubberDown : T.rubber;
  ctx.fill();
  ctx.restore();
  if (!down) {
    capsule(ctx, c.x - 0.5, cy - thick * 0.18, len * 0.82, thick * 0.3, PILL_TILT);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
  }
}

export function drawKeys(ctx: C2D, v: TouchView, T: ShellTheme): void {
  const l = v.layout;
  const b = l.buttons;
  if (T.keys === 'outline') outlineDpad(ctx, l, v.dpad, T);
  else drawDpad(ctx, l, v.dpad, T);
  for (const id of ['a', 'b'] as const) roundButton(ctx, b[id], v.held.has(id), T, T.ab, T.abHi, T.abLo, T.abDown);

  const swapDown = v.held.has('swap');
  const s = roundButton(ctx, b.swap, swapDown, T, T.rubber, T.rubberHi, T.rubberLo, T.rubberDown);
  cycleIcon(ctx, s.x, s.y, b.swap.w / 2 - 2, swapDown ? T.iconDown : T.icon);

  const burstDown = v.held.has('burst');
  if (v.burstReady) {
    const c = center(b.burst);
    const r = b.burst.w / 2 + 6;
    const glow = ctx.createRadialGradient(c.x, c.y, r * 0.5, c.x, c.y, r + 6);
    glow.addColorStop(0, 'rgba(255, 184, 48, 0.75)');
    glow.addColorStop(1, 'rgba(255, 184, 48, 0)');
    ctx.fillStyle = glow;
    circle(ctx, c.x, c.y, r + 6);
    ctx.fill();
  }
  const d = roundButton(ctx, b.burst, burstDown, T, T.rubber, T.rubberHi, T.rubberLo, T.rubberDown);
  dieIcon(ctx, d.x, d.y, (b.burst.w / 2 - 2) * 0.62, v.burstReady ? DIE_READY : T.die);

  for (const id of ['select', 'start'] as const) pill(ctx, b[id], v.held.has(id), T);
}
