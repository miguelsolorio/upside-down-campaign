// The touch screen dressed as a Game Boy, drawn with smooth shapes at the screen's own resolution. No DOM at import.
// The overlay sits behind the game and covers the whole viewport, so the body is everywhere but the screen.
// Layout units are CSS px. The parts that never move are drawn once per layout and kept; the keys are drawn on top.
// The colors come off a photo of the original grey Game Boy. The name on the body is the game's own.
// touch-controls.html shows it on phone frames.
import type { Rect, TouchButton, TouchLayout } from '../core/touchlayout.ts';
import type { Vec2 } from '../core/types.ts';
import { PAL } from '../gfx/palette.ts';
import { DIE_HEX, DIE_TRIS } from './die.ts';

export interface TouchView {
  layout: TouchLayout;
  held: ReadonlySet<TouchButton>;
  /** Where the D-pad pushes while a thumb is on it, else null. */
  dpad: Vec2 | null;
  /** The d20 key glows gold while the Crit is ready. */
  burstReady: boolean;
}

type C2D = CanvasRenderingContext2D;

const C = {
  body: '#cdcac6', bodyHi: '#dbd8d4', bodyLo: '#b3b0ab', bodyDeep: '#9e9b97',
  bezel: '#7d7b87', bezelHi: '#8b8995', bezelLo: '#66646f',
  stripeA: '#8f2458', stripeB: '#2d307e', stripeText: '#d6d5dd',
  navy: '#2e3288',
  led: '#ff3b30', ledOff: '#5a1c1c',
  dpad: '#26262b', dpadHi: '#45454c', dpadLo: '#111114',
  ab: '#ad1a5e', abHi: '#d24e8b', abLo: '#6e0d39', abDown: '#8d1450',
  rubber: '#8e8c96', rubberHi: '#a3a1ab', rubberLo: '#6b6974', rubberDown: '#787680',
  ink: '#45434f',
};
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** The d20 on its key: dim like grey plastic, or gold like the HUD die once the Crit is ready. */
const DIE_DIM = { center: '#b3b1bb', top: '#97959f', side: '#7c7a85', low: '#6b6974', line: '#45434f' };
const DIE_READY = { center: PAL.cream, top: PAL.yellow, side: PAL.amber, low: PAL.amber, line: PAL.orange };

// ---------------------------------------------------------------- shapes
function center(r: Rect): Vec2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** A rectangle with its own radius at each corner: top left, top right, bottom right, bottom left. */
function roundRect(ctx: C2D, x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, tl, tr, br, bl);
}

/** The same, added to the current path, always clockwise, so two of them fill as one shape. */
function roundRectPath(ctx: C2D, x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): void {
  // A radius past half the box, or under zero on a window too small to lay out, would throw.
  const most = Math.max(0, Math.min(w, h) / 2);
  const fit = (r: number): number => Math.max(0, Math.min(most, r));
  [tl, tr, br, bl] = [fit(tl), fit(tr), fit(br), fit(bl)];
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function circle(ctx: C2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** Text in the shell's navy, slanted the way the Game Boy prints its labels. */
function label(ctx: C2D, text: string, x: number, y: number, size: number, align: CanvasTextAlign = 'center'): void {
  ctx.font = `italic 700 ${size}px ${SANS}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.navy;
  ctx.fillText(text, x, y);
}

/** A rounded rectangle turned by `angle` about its center, for SELECT and START and the speaker slots. */
function capsule(ctx: C2D, cx: number, cy: number, len: number, thick: number, angle: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  roundRect(ctx, -len / 2, -thick / 2, len, thick, thick / 2, thick / 2, thick / 2, thick / 2);
  ctx.restore();
}

const PILL_TILT = -25 * (Math.PI / 180);
const SLOT_TILT = -60 * (Math.PI / 180);

// ---------------------------------------------------------------- the parts that never move
/** The body: the whole viewport, with the big round corner at the bottom right. */
function bodyPath(ctx: C2D, w: number, h: number, corner: number): void {
  roundRect(ctx, 0, 0, w, h, 0, 0, corner, 0);
}

function drawBody(ctx: C2D, l: TouchLayout): void {
  const { w, h } = l.viewport;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.bodyHi);
  g.addColorStop(0.35, C.body);
  g.addColorStop(1, '#c4c1bd');
  bodyPath(ctx, w, h, l.shell.corner);
  ctx.fillStyle = g;
  ctx.fill();
}

/** The groove across the top with the OFF·ON switch over it, and the two notches at its ends. */
function drawGroove(ctx: C2D, l: TouchLayout): void {
  const y = l.shell.groove;
  if (y === null) return;
  const { w } = l.viewport;
  ctx.fillStyle = C.bodyLo;
  ctx.fillRect(0, y, w, 1.5);
  ctx.fillStyle = C.bodyHi;
  ctx.fillRect(0, y + 1.5, w, 1);
  for (const x of [w * 0.07, w * 0.93]) {
    ctx.fillStyle = C.bodyLo;
    ctx.fillRect(x - 0.75, 0, 1.5, y);
    ctx.fillStyle = C.bodyHi;
    ctx.fillRect(x + 0.75, 0, 1, y);
  }
  const size = Math.max(7, Math.min(10, w * 0.022));
  const x = l.shell.bezel.x + l.shell.bezel.w * 0.1;
  ctx.font = `600 ${size}px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const text = 'OFF • ON';
  // Pressed into the plastic: a light edge under a dark one.
  ctx.fillStyle = C.bodyHi;
  ctx.fillText(`◁ ${text} ▷`, x, y - 3);
  ctx.fillStyle = C.bodyDeep;
  ctx.fillText(`◁ ${text} ▷`, x, y - 4);
}

function drawBezel(ctx: C2D, l: TouchLayout): void {
  const s = l.shell;
  const b = s.bezel;
  const small = Math.max(5, Math.min(10, b.w * 0.02));
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, C.bezelHi);
  g.addColorStop(1, C.bezel);
  roundRect(ctx, b.x, b.y, b.w, b.h, small, small, s.bezelCorner, small);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.bezelLo;
  ctx.stroke();

  // The well the screen sits in. The game covers all of it but this thin dark edge.
  const gm = l.game;
  ctx.fillStyle = '#2a2930';
  ctx.fillRect(gm.x - 2, gm.y - 2, gm.w + 4, gm.h + 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(gm.x, gm.y, gm.w, gm.h);

  drawStripes(ctx, s.stripes);
  drawLed(ctx, l);
}

/** The line of small text over the screen with a magenta and a navy stripe on each side of it. */
function drawStripes(ctx: C2D, r: Rect): void {
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
  ctx.fillStyle = C.stripeText;
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
    ctx.fillStyle = C.stripeA;
    ctx.fillRect(x0, cy - lw * 1.9, x1 - x0, lw);
    ctx.fillStyle = C.stripeB;
    ctx.fillRect(x0, cy + lw * 0.9, x1 - x0, lw);
  }
}

/** The battery light, lit, in the bezel's left margin. Its word sits under it when the margin is wide enough. */
function drawLed(ctx: C2D, l: TouchLayout): void {
  const { x, y, label: word } = l.shell.led;
  const r = Math.max(2.5, Math.min(6, l.shell.bezel.w * 0.011));
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  glow.addColorStop(0, 'rgba(255, 70, 60, 0.55)');
  glow.addColorStop(1, 'rgba(255, 70, 60, 0)');
  ctx.fillStyle = glow;
  circle(ctx, x, y, r * 3);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, '#ffb3a8');
  g.addColorStop(0.45, C.led);
  g.addColorStop(1, '#a01810');
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
  if (word) {
    const size = Math.max(6, Math.min(10, r * 1.6));
    ctx.font = `500 ${size}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.stripeText;
    ctx.fillText('BATTERY', x, y + r * 2.2);
  }
}

/** The game's name where the Game Boy prints its own: a small upright word and a big slanted one. */
function drawLogo(ctx: C2D, l: TouchLayout): void {
  const logo = l.shell.logo;
  if (!logo) return;
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
  ctx.fillStyle = C.navy;
  ctx.font = small;
  ctx.fillText(a, 0, 0);
  ctx.font = big;
  ctx.fillText(b, aw + gap, 0);
  ctx.restore();
}

/** Six slots cut on a slant, inside the body's round corner. */
function drawGrill(ctx: C2D, l: TouchLayout): void {
  const g = l.shell.grill;
  if (!g) return;
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
    ctx.fillStyle = C.bodyHi;
    ctx.fill();
    capsule(ctx, cx, cy, len, thick, SLOT_TILT);
    ctx.fillStyle = C.bodyDeep;
    ctx.fill();
  }
  ctx.restore();
}

/** The shallow wells the round buttons and the D-pad sit in, and the words printed by the buttons. */
function drawSockets(ctx: C2D, l: TouchLayout): void {
  const b = l.buttons;
  for (const id of ['a', 'b', 'burst', 'swap'] as const) {
    const c = center(b[id]);
    const r = b[id].w / 2;
    const g = ctx.createRadialGradient(c.x, c.y - r * 0.2, r * 0.6, c.x, c.y, r + 4);
    g.addColorStop(0, C.bodyLo);
    g.addColorStop(1, 'rgba(179, 176, 171, 0)');
    ctx.fillStyle = g;
    circle(ctx, c.x, c.y, r + 4);
    ctx.fill();
  }
  // The faint arrows pressed into the body by each arm of the D-pad.
  const { dpad: d, dpadR: r } = l;
  const t = r * 0.16;
  ctx.fillStyle = C.bodyLo;
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

  const face = b.a.w;
  const big = Math.max(11, face * 0.24);
  for (const id of ['a', 'b'] as const) {
    const r0 = b[id];
    label(ctx, id.toUpperCase(), r0.x + r0.w * 0.72, r0.y + r0.h + big + 2, big);
  }
  const small = Math.max(8, Math.min(11, b.swap.w * 0.2));
  label(ctx, 'SWAP', center(b.swap).x, b.swap.y + b.swap.h + small + 2, small);
  label(ctx, 'CRIT', center(b.burst).x, b.burst.y + b.burst.h + small + 2, small);
  for (const id of ['select', 'start'] as const) {
    const r0 = b[id];
    const c = center(r0);
    ctx.save();
    ctx.translate(c.x, c.y + r0.h * 0.28);
    ctx.rotate(PILL_TILT);
    label(ctx, id.toUpperCase(), 0, small * 0.4, small);
    ctx.restore();
  }
}

function drawShell(ctx: C2D, l: TouchLayout): void {
  drawBody(ctx, l);
  drawGroove(ctx, l);
  drawBezel(ctx, l);
  drawLogo(ctx, l);
  drawGrill(ctx, l);
  drawSockets(ctx, l);
}

// ---------------------------------------------------------------- the parts that press
/** The arms a push presses: a diagonal presses two. Right, down, left, up. */
export function pressedArms(v: Vec2 | null): [boolean, boolean, boolean, boolean] {
  const on = 0.38;
  if (!v) return [false, false, false, false];
  return [v.x > on, v.y > on, v.x < -on, v.y < -on];
}

/** The cross, rocked toward the arms a thumb presses. */
function drawDpad(ctx: C2D, l: TouchLayout, push: Vec2 | null): void {
  const { dpad: d, dpadR: r } = l;
  const t = r * 0.34;
  const arms = pressedArms(push);
  const tilt = push ? { x: push.x * 1.5, y: push.y * 1.5 } : { x: 0, y: 0 };
  const corner = Math.max(2, r * 0.06);

  ctx.save();
  ctx.shadowColor = 'rgba(40, 30, 30, 0.35)';
  ctx.shadowBlur = r * 0.12;
  ctx.shadowOffsetY = push ? r * 0.025 : r * 0.06;
  ctx.fillStyle = C.dpad;
  // Both bars in one path, so the cross casts one shadow and neither bar shades the other.
  ctx.beginPath();
  roundRectPath(ctx, d.x - r + tilt.x, d.y - t + tilt.y, r * 2, t * 2, corner, corner, corner, corner);
  roundRectPath(ctx, d.x - t + tilt.x, d.y - r + tilt.y, t * 2, r * 2, corner, corner, corner, corner);
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
    ctx.strokeStyle = C.dpadLo;
    ctx.lineWidth = Math.max(1, r * 0.022);
    for (let j = 0; j < 3; j++) {
      const x = r * (0.52 + j * 0.13);
      ctx.beginPath();
      ctx.moveTo(x, -t * 0.62);
      ctx.lineTo(x, t * 0.62);
      ctx.stroke();
      ctx.strokeStyle = C.dpadHi;
      ctx.beginPath();
      ctx.moveTo(x + ctx.lineWidth, -t * 0.62);
      ctx.lineTo(x + ctx.lineWidth, t * 0.62);
      ctx.stroke();
      ctx.strokeStyle = C.dpadLo;
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
  dg.addColorStop(0, C.dpadLo);
  dg.addColorStop(1, C.dpadHi);
  ctx.fillStyle = dg;
  circle(ctx, cx, cy, dr);
  ctx.fill();
}

/** A round button: a shadow under it, a lit dome on top. Pressed, it drops into its well and the shadow goes. */
function roundButton(ctx: C2D, r0: Rect, down: boolean, face: string, hi: string, lo: string, pressed: string): Vec2 {
  const c = center(r0);
  const r = r0.w / 2 - 2;
  const drop = Math.max(2, r * 0.09);
  const y = c.y + (down ? drop * 0.7 : 0);
  if (!down) {
    ctx.fillStyle = lo;
    circle(ctx, c.x, c.y + drop, r);
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(30, 20, 25, 0.3)';
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
function dieIcon(ctx: C2D, x: number, y: number, r: number, scheme: typeof DIE_DIM): void {
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
function pill(ctx: C2D, r0: Rect, down: boolean): void {
  const c = center(r0);
  const len = r0.w * 0.66;
  const thick = Math.max(9, r0.h * 0.26);
  const cy = c.y - r0.h * 0.12;
  ctx.save();
  capsule(ctx, c.x, cy + 1, len + 4, thick + 4, PILL_TILT);
  ctx.fillStyle = C.bodyLo;
  ctx.fill();
  ctx.shadowColor = 'rgba(30, 20, 25, 0.3)';
  ctx.shadowBlur = down ? 1 : 3;
  ctx.shadowOffsetY = down ? 0.5 : 2;
  capsule(ctx, c.x, cy + (down ? 1 : 0), len, thick, PILL_TILT);
  ctx.fillStyle = down ? C.rubberDown : C.rubber;
  ctx.fill();
  ctx.restore();
  if (!down) {
    capsule(ctx, c.x - 0.5, cy - thick * 0.18, len * 0.82, thick * 0.3, PILL_TILT);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
  }
}

function drawKeys(ctx: C2D, v: TouchView): void {
  const b = v.layout.buttons;
  for (const id of ['a', 'b'] as const) roundButton(ctx, b[id], v.held.has(id), C.ab, C.abHi, C.abLo, C.abDown);

  const swapDown = v.held.has('swap');
  const s = roundButton(ctx, b.swap, swapDown, C.rubber, C.rubberHi, C.rubberLo, C.rubberDown);
  cycleIcon(ctx, s.x, s.y, b.swap.w / 2 - 2, swapDown ? '#3a3844' : C.ink);

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
  const d = roundButton(ctx, b.burst, burstDown, C.rubber, C.rubberHi, C.rubberLo, C.rubberDown);
  dieIcon(ctx, d.x, d.y, (b.burst.w / 2 - 2) * 0.62, v.burstReady ? DIE_READY : DIE_DIM);

  for (const id of ['select', 'start'] as const) pill(ctx, b[id], v.held.has(id));
}

// ---------------------------------------------------------------- the whole thing
/** The never-moving parts for each layout, already drawn at the overlay's size. */
const shells = new WeakMap<TouchLayout, HTMLCanvasElement>();

function shellFor(l: TouchLayout, w: number, h: number): HTMLCanvasElement {
  const have = shells.get(l);
  if (have && have.width === w && have.height === h) return have;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') as C2D;
  ctx.setTransform(w / l.viewport.w, 0, 0, h / l.viewport.h, 0, 0);
  drawShell(ctx, l);
  shells.set(l, c);
  return c;
}

/** Clears the overlay and draws the whole Game Boy. Transparent only past the body's round corner. */
export function drawTouch(ctx: C2D, v: TouchView): void {
  const l = v.layout;
  const { width: w, height: h } = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(shellFor(l, w, h), 0, 0);
  ctx.setTransform(w / l.viewport.w, 0, 0, h / l.viewport.h, 0, 0);
  drawDpad(ctx, l, v.dpad);
  drawKeys(ctx, v);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** The overlay's backing size for a layout: the viewport in device pixels. */
export function overlaySize(l: TouchLayout): { w: number; h: number } {
  return { w: Math.round(l.viewport.w * l.dpr), h: Math.round(l.viewport.h * l.dpr) };
}
