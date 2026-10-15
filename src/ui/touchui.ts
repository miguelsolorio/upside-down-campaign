// The touch screen's controls on the page: the Game Boy overlay, the finger listeners and the layout. The shell is grey
// or black by the GAME BOY setting, which on AUTO follows the phone's light or dark mode, even mid-game.
// It touches the DOM, so main.ts mounts it once at boot. The overlay sits behind the game and never takes a pointer
// itself, so a tap on the game still reaches the game canvas, and the listeners here only claim fingers that land on a
// control.
import type { PadLike } from '../core/gamepad.ts';
import type { InputState } from '../core/input.ts';
import { settings } from '../core/settings.ts';
import { layoutTouch } from '../core/touchlayout.ts';
import type { TouchButton, TouchLayout } from '../core/touchlayout.ts';
import { createTouchPad } from '../core/touchpad.ts';
import { drawTouch, overlaySize, pressedArms } from './touchdraw.ts';
import { shellTheme } from './touchtheme.ts';

export interface TouchUi {
  /** For createInput: the virtual controller while the controls show, else null. */
  pad(): PadLike | null;
  /** Once a frame: lays out again if the screen changed and redraws if anything moved. The layout while shown, else null. */
  frame(input: InputState): TouchLayout | null;
}

export function mountTouchUi(): TouchUi {
  const canvas = document.createElement('canvas');
  canvas.id = 'pad';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  // An invisible box inset by the safe area. Its rect is the one place JS can read env(safe-area-inset-*).
  const dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const probe = document.createElement('div');
  probe.id = 'safe';
  document.body.append(canvas, probe);

  const vp = (): { w: number; h: number; dpr: number } => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1 });
  let layout = measure();
  const pad = createTouchPad(layout);
  let shown = false;
  let layoutKey = '';
  let drawn = '';
  let feltHeld: ReadonlySet<TouchButton> = new Set();
  let feltArms = '0000';

  function measure(): TouchLayout {
    const v = vp();
    const r = probe.getBoundingClientRect();
    return layoutTouch({ ...v, safe: { t: r.top, l: r.left, r: Math.max(0, v.w - r.right), b: Math.max(0, v.h - r.bottom) } });
  }

  addEventListener('pointerdown', (e) => {
    if (!shown) return;
    if (pad.down(e.pointerId, e.clientX, e.clientY)) e.preventDefault();
  });
  addEventListener('pointermove', (e) => { if (shown) pad.move(e.pointerId, e.clientX, e.clientY); });
  addEventListener('pointerup', (e) => pad.up(e.pointerId));
  addEventListener('pointercancel', (e) => pad.up(e.pointerId));
  addEventListener('blur', () => pad.reset());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') pad.reset(); });
  // touch-action covers panning and pinching. iOS still zooms on a double tap, offers a callout on a long press, and
  // raises its text selection bubble under a thumb held on the stick unless the touch itself is cancelled. The input
  // reads pointer events and sound unlocks on touchend, so neither needs the touch's default. The dev panel's buttons
  // and fields keep theirs, so they still take a tap.
  const native = (t: EventTarget | null): boolean => t instanceof Element && !!t.closest('button, input, select, textarea');
  document.addEventListener('touchstart', (e) => { if (shown && !native(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', (e) => { if (shown) e.preventDefault(); }, { passive: false });
  // Nothing in the game is text to select.
  document.addEventListener('selectstart', (e) => { if (!native(e.target)) e.preventDefault(); });
  document.addEventListener('dblclick', (e) => { if (shown) e.preventDefault(); });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (shown) e.preventDefault(); });

  /** A short buzz when a button goes down or the D-pad rocks onto other arms, where the phone can (iOS can't). */
  function feel(held: ReadonlySet<TouchButton>, arms: string): void {
    const fresh = [...held].some((b) => !feltHeld.has(b)) || (arms !== feltArms && arms !== '0000');
    feltHeld = held;
    feltArms = arms;
    if (fresh && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8);
  }

  return {
    pad: () => (shown ? pad.pad() : null),
    frame(input) {
      const want = input.device() === 'touch';
      if (want !== shown) {
        shown = want;
        canvas.style.display = shown ? 'block' : 'none';
        pad.reset();
        drawn = '';
      }
      if (!shown) return null;

      const v = vp();
      const r = probe.getBoundingClientRect();
      const key = `${v.w}x${v.h}@${v.dpr} ${r.left},${r.top},${r.right},${r.bottom}`;
      if (key !== layoutKey) {
        layoutKey = key;
        layout = measure();
        pad.setLayout(layout);
        const size = overlaySize(layout);
        canvas.width = size.w;
        canvas.height = size.h;
        canvas.style.width = `${layout.viewport.w}px`;
        canvas.style.height = `${layout.viewport.h}px`;
        drawn = '';
      }

      const theme = shellTheme(settings.shell, !!dark?.matches);
      const burstReady = input.offered('burst');
      const held = pad.held();
      const dpad = pad.dpad();
      // Only what shows: which buttons are down and which arms the D-pad leans on, not the thumb's exact angle.
      const arms = pressedArms(dpad).map(Number).join('');
      feel(held, arms);
      const state = `${layoutKey}|${theme.name}|${[...held].sort().join()}|${arms}|${burstReady}`;
      if (state !== drawn) {
        drawn = state;
        drawTouch(ctx, { layout, held, dpad, burstReady, theme });
      }
      return layout;
    },
  };
}
