// The on-screen controls as a virtual controller. Pure: finger positions in CSS px go in, a PadLike comes out,
// and input.ts reads it with the same readPad as a real controller, so the touch buttons get the same actions
// and the stick gets the same menu steps.
import { BTN } from './gamepad.ts';
import type { PadLike } from './gamepad.ts';
import { buttonAt, inside } from './touchlayout.ts';
import type { TouchButton, TouchLayout } from './touchlayout.ts';
import type { Vec2 } from './types.ts';

/** The stick reads full tilt at this share of its radius, so a thumb doesn't have to travel far. */
export const FULL_TILT = 0.7;

/** B is special and back in one button, the way the X key is on a keyboard. */
const PAD_BUTTONS: Record<TouchButton, readonly number[]> = {
  a: [BTN.A], b: [BTN.X, BTN.B], burst: [BTN.Y], swapPrev: [BTN.LB], swapNext: [BTN.RB], skip: [BTN.VIEW], pause: [BTN.MENU],
};
const PAD_SIZE = 17;

/** What a finger grabbed when it went down: a button, the stick, or nothing (a tap on the game or the margin). */
export type Grab = TouchButton | 'stick' | null;

export interface TouchPad {
  setLayout(l: TouchLayout): void;
  /** SKIP is a target only while it is drawn. */
  setSkip(on: boolean): void;
  down(id: number, x: number, y: number): Grab;
  move(id: number, x: number, y: number): void;
  up(id: number): void;
  /** Lets go of everything: a cancelled touch, a lost focus, a hidden page. */
  reset(): void;
  held(): ReadonlySet<TouchButton>;
  /** The stick's base and knob in CSS px while a thumb is on it. */
  stick(): { base: Vec2; knob: Vec2 } | null;
  /** Length up to one. */
  vector(): Vec2;
  pad(): PadLike;
}

export function createTouchPad(layout: TouchLayout): TouchPad {
  let l = layout;
  let skip = false;
  const fingers = new Map<number, TouchButton>();
  let stickId: number | null = null;
  let base: Vec2 = { x: 0, y: 0 };
  let knob: Vec2 = { x: 0, y: 0 };

  const self: TouchPad = {
    setLayout(next) { l = next; },
    setSkip(on) { skip = on; },
    down(id, x, y) {
      const b = buttonAt(l, x, y);
      if (b && (b !== 'skip' || skip)) {
        fingers.set(id, b);
        return b;
      }
      if (stickId === null && inside(l.stickZone, x, y)) {
        stickId = id;
        base = { x, y };
        knob = { x, y };
        return 'stick';
      }
      return null;
    },
    move(id, x, y) {
      if (id !== stickId) return;
      const dx = x - base.x, dy = y - base.y;
      const d = Math.hypot(dx, dy);
      // Past the rim, the base follows the thumb, so pulling back the other way responds at once.
      if (d > l.stickR) {
        const k = (d - l.stickR) / d;
        base = { x: base.x + dx * k, y: base.y + dy * k };
      }
      knob = { x, y };
    },
    up(id) {
      fingers.delete(id);
      if (id === stickId) stickId = null;
    },
    reset() {
      fingers.clear();
      stickId = null;
    },
    held: () => new Set(fingers.values()),
    stick: () => (stickId === null ? null : { base: { ...base }, knob: { ...knob } }),
    vector() {
      if (stickId === null) return { x: 0, y: 0 };
      const full = l.stickR * FULL_TILT;
      let x = (knob.x - base.x) / full, y = (knob.y - base.y) / full;
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      return { x, y };
    },
    pad() {
      const buttons = Array.from({ length: PAD_SIZE }, () => ({ pressed: false, value: 0 }));
      for (const b of fingers.values()) for (const i of PAD_BUTTONS[b]) buttons[i] = { pressed: true, value: 1 };
      const v = self.vector();
      return { buttons, axes: [v.x, v.y], mapping: 'standard', connected: true };
    },
  };
  return self;
}
