// The on-screen controls as a virtual controller. Pure: finger positions in CSS px go in, a PadLike comes out,
// and input.ts reads it with the same readPad as a real controller, so the touch buttons get the same actions
// and the D-pad gets the same menu steps as a stick.
import { BTN } from './gamepad.ts';
import type { PadLike } from './gamepad.ts';
import { buttonAt, inside } from './touchlayout.ts';
import type { TouchButton, TouchLayout } from './touchlayout.ts';
import type { Vec2 } from './types.ts';

/** Inside this share of the arm's length, the thumb is on the D-pad's pivot and pushes nowhere. */
export const DPAD_NUB = 0.18;
/** Within this many degrees of straight up, down, left or right, the D-pad reads exactly that way, like pressing one arm. */
export const DPAD_SNAP = 15;

/** B is special and back in one button, the way the X key is on a keyboard. SELECT skips, START pauses and begins. */
const PAD_BUTTONS: Record<TouchButton, readonly number[]> = {
  a: [BTN.A], b: [BTN.X, BTN.B], burst: [BTN.Y], swap: [BTN.RB], select: [BTN.VIEW], start: [BTN.MENU],
};
const PAD_SIZE = 17;

const DEG = Math.PI / 180;
const QUARTER = Math.PI / 2;

/**
 * Where a thumb `dx, dy` from the D-pad's center pushes, as a vector of length one, or zero on the pivot.
 * Near an arm it is that arm exactly, so a tap on one reads as one button. Between the arms the angle follows the
 * thumb, squeezed into what's left so it runs on smoothly through the diagonals, so a sliding thumb steers like a stick.
 */
export function dpadVector(dx: number, dy: number, r: number): Vec2 {
  if (Math.hypot(dx, dy) < r * DPAD_NUB) return { x: 0, y: 0 };
  const a = Math.atan2(dy, dx);
  const arm = Math.round(a / QUARTER) * QUARTER;
  const off = a - arm;
  const snap = DPAD_SNAP * DEG;
  const half = QUARTER / 2;
  const bent = Math.abs(off) <= snap ? 0 : Math.sign(off) * ((Math.abs(off) - snap) * half) / (half - snap);
  const x = Math.cos(arm + bent), y = Math.sin(arm + bent);
  // Snap the float dust off, so a pressed arm reads exactly 0 and 1.
  const clean = (n: number): number => (Math.abs(n) < 1e-9 ? 0 : Math.abs(Math.abs(n) - 1) < 1e-9 ? Math.sign(n) : n);
  return { x: clean(x), y: clean(y) };
}

/** What a finger grabbed when it went down: a button, the D-pad, or nothing (a tap on the game or the body). */
export type Grab = TouchButton | 'dpad' | null;

export interface TouchPad {
  setLayout(l: TouchLayout): void;
  down(id: number, x: number, y: number): Grab;
  move(id: number, x: number, y: number): void;
  up(id: number): void;
  /** Lets go of everything: a cancelled touch, a lost focus, a hidden page. */
  reset(): void;
  held(): ReadonlySet<TouchButton>;
  /** Where the D-pad pushes while a thumb is on it, else null. Length one, or zero on the pivot. */
  dpad(): Vec2 | null;
  /** Length up to one. */
  vector(): Vec2;
  pad(): PadLike;
}

export function createTouchPad(layout: TouchLayout): TouchPad {
  let l = layout;
  const fingers = new Map<number, TouchButton>();
  let dpadId: number | null = null;
  let thumb: Vec2 = { x: 0, y: 0 };

  const self: TouchPad = {
    setLayout(next) { l = next; },
    down(id, x, y) {
      const b = buttonAt(l, x, y);
      if (b) {
        fingers.set(id, b);
        return b;
      }
      // Anywhere in the zone grabs the D-pad, so a thumb that misses the cross still steers, toward where it landed.
      if (dpadId === null && inside(l.dpadZone, x, y)) {
        dpadId = id;
        thumb = { x, y };
        return 'dpad';
      }
      return null;
    },
    move(id, x, y) {
      if (id === dpadId) thumb = { x, y };
    },
    up(id) {
      fingers.delete(id);
      if (id === dpadId) dpadId = null;
    },
    reset() {
      fingers.clear();
      dpadId = null;
    },
    held: () => new Set(fingers.values()),
    dpad: () => (dpadId === null ? null : dpadVector(thumb.x - l.dpad.x, thumb.y - l.dpad.y, l.dpadR)),
    vector: () => self.dpad() ?? { x: 0, y: 0 },
    pad() {
      const buttons = Array.from({ length: PAD_SIZE }, () => ({ pressed: false, value: 0 }));
      for (const b of fingers.values()) for (const i of PAD_BUTTONS[b]) buttons[i] = { pressed: true, value: 1 };
      const v = self.vector();
      return { buttons, axes: [v.x, v.y], mapping: 'standard', connected: true };
    },
  };
  return self;
}
