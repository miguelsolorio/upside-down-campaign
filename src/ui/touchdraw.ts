// The on-screen touch controls, drawn in the game's own pixels. No DOM at import.
// The overlay canvas has the game's pixel size, so a CSS rect from the layout is divided by the scale.
// Every button is a keycap: a dark top over a darker lip, and pressing slides the top down over the lip.
// touch-controls.html shows them on phone frames.
import type { Rect, TouchButton, TouchLayout } from '../core/touchlayout.ts';
import { TOUCH_BUTTONS } from '../core/touchlayout.ts';
import type { Vec2 } from '../core/types.ts';
import type { ColorName } from '../gfx/palette.ts';
import { discPx, ringPx } from '../gfx/canvas.ts';
import { drawText } from '../gfx/index.ts';
import { DIE_DIM, DIE_GOLD, drawDie } from './die.ts';
import type { DieScheme } from './die.ts';
import { bigText, box, dither } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface TouchView {
  layout: TouchLayout;
  held: ReadonlySet<TouchButton>;
  /** The stick's base and knob in CSS px while a thumb is on it, else null. */
  stick: { base: Vec2; knob: Vec2 } | null;
  /** SKIP is lit only while something can be skipped, and dimmed the rest of the time. */
  skip: boolean;
  burstReady: boolean;
}

/** A button in overlay px: its box and its center. */
interface Box { x: number; y: number; w: number; h: number; cx: number; cy: number }

function toBox(l: TouchLayout, r: Rect): Box {
  const s = l.scale;
  const x = Math.round(r.x / s), y = Math.round(r.y / s);
  const w = Math.round(r.w / s), h = Math.round(r.h / s);
  return { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) };
}

// ---------------------------------------------------------------- what each key shows
/** A solid triangle pointing left or right, `size` px tall. */
function triangle(ctx: Ctx, cx: number, cy: number, size: number, dir: -1 | 1, c: ColorName): void {
  const half = size >> 1;
  for (let j = -half; j <= half; j++) {
    const len = half - Math.abs(j) + 1;
    box(ctx, dir > 0 ? cx - (half >> 1) : cx + (half >> 1) - len + 1, cy + j, len, 1, c);
  }
}

/** The label of one key, centered on its top face. The size follows the face, so a key reads the same on any screen. */
function label(ctx: Ctx, id: TouchButton, f: Box, c: ColorName): void {
  const size = Math.max(5, Math.min(f.w, f.h) >> 1);
  switch (id) {
    case 'a':
    case 'b': {
      const text = id === 'a' ? 'A' : 'B';
      if (Math.min(f.w, f.h) >= 30) bigText(ctx, text, f.cx + 1, f.cy - 6, c, 2, 'center', false);
      else drawText(ctx, text, f.cx + 1, f.cy - 3, c, { align: 'center' });
      return;
    }
    case 'swapPrev':
    case 'swapNext':
      triangle(ctx, f.cx, f.cy, size | 1, id === 'swapPrev' ? -1 : 1, c);
      return;
    case 'pause': {
      const w = Math.max(2, size >> 2);
      box(ctx, f.cx - w - 1, f.cy - (size >> 1), w, size, c);
      box(ctx, f.cx + 1, f.cy - (size >> 1), w, size, c);
      return;
    }
    case 'skip': {
      const s = (size - 2) | 1;
      triangle(ctx, f.cx - (s >> 2) - 1, f.cy, s, 1, c);
      triangle(ctx, f.cx + (s >> 2) + 1, f.cy, s, 1, c);
      return;
    }
    case 'burst':
      return;
  }
}

/** The burst key shows the d20, lit gold like the HUD meter once the burst is ready. */
const DIE_READY: DieScheme = { ...DIE_GOLD, edge: 'orange' };

// ---------------------------------------------------------------- keys and the stick
/** The pixel rounded rectangle: a fill and a one pixel edge with the corners cut. */
function slab(ctx: Ctx, x: number, y: number, w: number, h: number, fill: ColorName, edge: ColorName): void {
  box(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  box(ctx, x + 1, y, w - 2, 1, edge);
  box(ctx, x + 1, y + h - 1, w - 2, 1, edge);
  box(ctx, x, y + 1, 1, h - 2, edge);
  box(ctx, x + w - 1, y + 1, 1, h - 2, edge);
}

function key(ctx: Ctx, id: TouchButton, b: Box, down: boolean, ready: boolean): void {
  // A and B fill their targets. The smaller keys sit a little inside theirs, so neighbours read as separate.
  const n = id === 'a' || id === 'b' ? 1 : 2;
  const d = { x: b.x + n, y: b.y + n, w: b.w - n * 2, h: b.h - n * 2 };
  const lip = Math.max(2, Math.round(d.h * 0.1));
  const sink = down ? lip - 1 : 0;
  // The side of the key, then its top. Pressing slides the top down over the side.
  slab(ctx, d.x, d.y + lip, d.w, d.h - lip, 'night', 'ink');
  slab(ctx, d.x, d.y + sink, d.w, d.h - lip, down ? 'dusk' : 'shadow', down ? 'mist' : 'slate');
  box(ctx, d.x + 2, d.y + sink + 1, d.w - 4, 1, down ? 'slate' : 'dusk');
  // Labels size by the whole target and center on the top face, so they ride down with it.
  const face: Box = { ...b, cy: d.y + sink + ((d.h - lip) >> 1) };
  if (id === 'burst') {
    const r = Math.max(4, Math.round(Math.min(face.w, face.h) * 0.3));
    drawDie(ctx, face.cx, face.cy, r, { scheme: ready ? DIE_READY : DIE_DIM });
    return;
  }
  label(ctx, id, face, down ? 'white' : 'bone');
}

/** A sunken well with a knob in it. The knob follows the thumb while it is held. */
function stick(ctx: Ctx, base: Vec2, knob: Vec2, r: number, live: boolean): void {
  discPx(ctx, base.x, base.y + 2, r, 'ink');
  discPx(ctx, base.x, base.y, r, 'night');
  ringPx(ctx, base.x, base.y, r, live ? 'slate' : 'dusk');
  const kr = Math.max(3, Math.round(r * 0.45));
  discPx(ctx, knob.x, knob.y + 2, kr, 'ink');
  discPx(ctx, knob.x, knob.y, kr, live ? 'dusk' : 'shadow');
  ringPx(ctx, knob.x, knob.y, kr, live ? 'mist' : 'slate');
}

/** Clears the overlay and draws every control. The overlay is transparent wherever there is no control. */
export function drawTouch(ctx: Ctx, v: TouchView): void {
  const l = v.layout;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const s = l.scale;
  const at = (q: Vec2): Vec2 => ({ x: Math.round(q.x / s), y: Math.round(q.y / s) });
  const r = Math.round(l.stickR / s);
  if (v.stick) stick(ctx, at(v.stick.base), at(v.stick.knob), r, true);
  else stick(ctx, at(l.stickRest), at(l.stickRest), r, false);
  for (const id of TOUCH_BUTTONS) {
    const b = toBox(l, l.buttons[id]);
    key(ctx, id, b, v.held.has(id), v.burstReady);
    // Nothing to skip: the key stays put, half dark, so PAUSE never looks alone or moves.
    if (id === 'skip' && !v.skip) dither(ctx, b.x, b.y, b.w, b.h, 'black', 2);
  }
}

/** The overlay's backing size for a layout: the viewport in game pixels. */
export function overlaySize(l: TouchLayout): { w: number; h: number } {
  return { w: Math.ceil(l.viewport.w / l.scale), h: Math.ceil(l.viewport.h / l.scale) };
}
