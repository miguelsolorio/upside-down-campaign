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
  let thumb: Vec2 = { x: 0, y: 0 };

  /** The ring never moves. The knob follows the thumb and stops at the rim. */
  function knob(): Vec2 {
    const base = l.stickRest;
    const dx = thumb.x - base.x, dy = thumb.y - base.y;
    const d = Math.hypot(dx, dy);
    const k = d > l.stickR ? l.stickR / d : 1;
    return { x: base.x + dx * k, y: base.y + dy * k };
  }

  const self: TouchPad = {
    setLayout(next) { l = next; },
    setSkip(on) { skip = on; },
    down(id, x, y) {
      const b = buttonAt(l, x, y);
      if (b && (b !== 'skip' || skip)) {
        fingers.set(id, b);
        return b;
      }
      // Anywhere in the zone grabs the stick, so a thumb that misses the ring still steers, toward where it landed.
      if (stickId === null && inside(l.stickZone, x, y)) {
        stickId = id;
        thumb = { x, y };
        return 'stick';
      }
      return null;
    },
    move(id, x, y) {
      if (id === stickId) thumb = { x, y };
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
    stick: () => (stickId === null ? null : { base: { ...l.stickRest }, knob: knob() }),
    vector() {
      if (stickId === null) return { x: 0, y: 0 };
      const full = l.stickR * FULL_TILT;
      const k = knob();
      let x = (k.x - l.stickRest.x) / full, y = (k.y - l.stickRest.y) / full;
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
