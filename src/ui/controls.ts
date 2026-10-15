// The controls screen: every action with its two keys, and rebinding. Reached from the options on the title
// screen and from the pause menu. Enter on a slot waits for the next key; a key already in use is swapped.
// A second page, GAMEPAD, does the same for a controller's face buttons, bumpers and triggers. It opens first while a
// controller is the input in use, and the last row of each page leads to the other.
// With a mouse, the row and key slot under it take the selection, a click on a slot rebinds it, and the wheel or the
// arrows scroll the list. A click while it waits for a key cancels.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { inRect } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import type { Vec2 } from '../core/types.ts';
import { BIND_ROWS, SLOTS, clearBinding, getBinding, getPromptDevice, keyLabel, resetBindings, setBinding } from '../core/bindings.ts';
import type { BindAction, BindResult } from '../core/bindings.ts';
import { PAD_ROWS, PAD_SLOTS, clearPadBinding, getPadBinding, padLabel, resetPadBindings, setPadBinding } from '../core/padmap.ts';
import type { PadAction } from '../core/padmap.ts';
import { drawIcon, drawText } from '../gfx/index.ts';
import { bigText, blinkOn, box, inFrame, outline, toFrame } from './kit.ts';
import type { Ctx } from './kit.ts';

type Page = 'keys' | 'pad';
/** `action` names a BindAction on the keys page and a PadAction on the pad page. 'page' switches to the other page. */
interface Entry { label: string; kind: 'key' | 'reset' | 'page' | 'back'; action?: string }

const ENTRIES: Record<Page, Entry[]> = {
  keys: [
    ...BIND_ROWS.map((r): Entry => ({ label: r.label, kind: 'key', action: r.action })),
    { label: 'RESET ALL', kind: 'reset' },
    { label: 'GAMEPAD', kind: 'page' },
    { label: 'BACK', kind: 'back' },
  ],
  pad: [
    ...PAD_ROWS.map((r): Entry => ({ label: r.label, kind: 'key', action: r.action })),
    { label: 'RESET ALL', kind: 'reset' },
    { label: 'KEYBOARD', kind: 'page' },
    { label: 'BACK', kind: 'back' },
  ],
};

/** The slot's text on a page, and whether it holds anything. */
function cell(page: Page, action: string, s: number): { text: string; empty: boolean } {
  if (page === 'pad') {
    const b = getPadBinding(action as PadAction)[s] ?? null;
    return { text: padLabel(b), empty: b === null };
  }
  const code = getBinding(action as BindAction)[s] ?? null;
  return { text: keyLabel(code), empty: code === null };
}
const slotsOf = (page: Page): number => (page === 'pad' ? PAD_SLOTS : SLOTS);

const VISIBLE = 12;
const ROW_H = 11;
const LIST_Y = 36;
const CELL_W = 46;
const CELL_X = [146, 198];
const NOTICE_FRAMES = 220;
/** The rows' boxes for the mouse run from the cursor to the end of the second key cell. The arrows sit past that. */
const ROWS_X = 10;
const ROWS_END = (CELL_X[1] as number) + CELL_W;
const UP_BOX: Rect = { x: ROWS_END + 1, y: LIST_Y - 3, w: 11, h: 10 };
const DOWN_BOX: Rect = { x: ROWS_END + 1, y: LIST_Y + (VISIBLE - 1) * ROW_H - 1, w: 11, h: 10 };

export function createControlsScene(opts: { onBack(): void }): Scene {
  let t = 0;
  let page: Page = 'keys';
  let sel = 0;
  let slot = 0;
  let top = 0;
  let mode: 'browse' | 'listen' = 'browse';
  let notice: { text: string; ok: boolean; ttl: number } | null = null;
  let stopListening: (() => void) | null = null;

  const say = (text: string, ok = true): void => { notice = { text, ok, ttl: NOTICE_FRAMES }; };
  const list = (): Entry[] => ENTRIES[page];
  const entry = (): Entry => list()[sel] as Entry;
  const done = (r: BindResult): void => { say(r.note, r.ok); audio.sfx(r.ok ? 'confirm' : 'cancel'); };

  const move = (d: number): void => {
    sel = (sel + d + list().length) % list().length;
    if (sel < top) top = sel;
    if (sel >= top + VISIBLE) top = sel - VISIBLE + 1;
  };

  /** Scrolls the list without wrapping, and keeps the selection on a row that's showing. */
  const scroll = (d: number): boolean => {
    const next = Math.max(0, Math.min(list().length - VISIBLE, top + d));
    if (next === top) return false;
    top = next;
    sel = Math.max(top, Math.min(top + VISIBLE - 1, sel));
    return true;
  };

  /** The entry and key slot under a point in the list. The slot is -1 off the two key cells. Null off the list. */
  const cellAt = (p: Vec2 | null): { idx: number; slot: number } | null => {
    if (!p || p.x < ROWS_X || p.x >= ROWS_END) return null;
    const r = Math.floor((p.y - (LIST_Y - 2)) / ROW_H);
    const idx = top + r;
    if (r < 0 || r >= VISIBLE || idx >= list().length) return null;
    const e = list()[idx] as Entry;
    const s = e.kind === 'key' ? CELL_X.findIndex((x) => p.x >= x && p.x < x + CELL_W) : -1;
    return { idx, slot: s };
  };
  const upShown = (): boolean => top > 0;
  const downShown = (): boolean => top + VISIBLE < list().length;

  /** Waits for the next key (or controller button, on the pad page) and puts it on the selected slot. On the keys page
   * Escape cancels and Backspace clears. On the pad page Start cancels and View clears (see update). */
  const listen = (g: Game): void => {
    const action = entry().action;
    if (!action) return;
    mode = 'listen';
    notice = null;
    if (page === 'pad') {
      stopListening = g.input.capturePad((b) => {
        stopListening = null;
        mode = 'browse';
        done(setPadBinding(action as PadAction, slot, b));
      });
      return;
    }
    stopListening = g.input.capture((code) => {
      stopListening = null;
      mode = 'browse';
      if (code === 'Escape') { say('CANCELLED'); audio.sfx('cancel'); return; }
      done(code === 'Backspace' || code === 'Delete' ? clearBinding(action as BindAction, slot) : setBinding(action as BindAction, slot, code));
    });
  };

  const stopWaiting = (): void => {
    stopListening?.();
    stopListening = null;
    mode = 'browse';
  };

  const switchPage = (): void => {
    page = page === 'keys' ? 'pad' : 'keys';
    sel = 0; slot = 0; top = 0; notice = null;
    audio.sfx('confirm');
  };

  const activate = (g: Game): void => {
    const e = entry();
    if (e.kind === 'key') { audio.sfx('select'); listen(g); return; }
    if (e.kind === 'reset') {
      if (page === 'pad') resetPadBindings(); else resetBindings();
      say('DEFAULTS RESTORED');
      audio.sfx('confirm');
      return;
    }
    if (e.kind === 'page') { switchPage(); return; }
    audio.sfx('cancel');
    opts.onBack();
  };

  /** The mouse while browsing. Returns true when a click was used, so the keys sit out that tick. The list is drawn in
   * the centered frame, so the mouse is measured from there. */
  const mouse = (g: Game): boolean => {
    const i = g.input;
    const w = i.wheel();
    const scrolled = w !== 0 && scroll(w);
    const p = toFrame(i.hover());
    const over = cellAt(p);
    if (over && (i.moved() || scrolled)) {
      const s = over.slot >= 0 ? over.slot : slot;
      if (over.idx !== sel || s !== slot) audio.sfx('select');
      sel = over.idx;
      slot = s;
    }
    const onArrow = (q: Vec2): boolean => (upShown() && inRect(q, UP_BOX)) || (downShown() && inRect(q, DOWN_BOX));
    // A key row's name isn't a button. Its two cells are, and so are the rows below the keys.
    if (over ? over.slot >= 0 || (list()[over.idx] as Entry).kind !== 'key' : p && onArrow(p)) i.point();

    const c = toFrame(i.clicked());
    if (!c) return false;
    if (upShown() && inRect(c, UP_BOX)) { scroll(-1); audio.sfx('select'); return true; }
    if (downShown() && inRect(c, DOWN_BOX)) { scroll(1); audio.sfx('select'); return true; }
    const at = cellAt(c);
    if (!at) return false;
    sel = at.idx;
    if (entry().kind === 'key') {
      if (at.slot < 0) return true;
      slot = at.slot;
    }
    activate(g);
    return true;
  };

  return {
    opaque: true,
    // A player on a controller wants the controller's page first.
    enter(g) { if (g.input.device() === 'gamepad') page = 'pad'; },
    exit() { stopListening?.(); },
    update(g) {
      t++;
      if (notice && --notice.ttl <= 0) notice = null;
      const i = g.input;
      if (mode === 'listen') {
        // Waiting on a controller button: the face, bumper and trigger buttons are all taken by the rebind, so View clears
        // the slot. Start (or Esc) backs out, and so does a click. A keyboard Escape never gets here on the keys page:
        // the capture takes it first, and B backs out of that one.
        if (page === 'pad' && i.pressed('skip')) {
          stopWaiting();
          done(clearPadBinding(entry().action as PadAction, slot));
          return;
        }
        if (i.pressed('cancel') || i.pressed('pause') || i.clicked()) {
          stopWaiting();
          say('CANCELLED');
          audio.sfx('cancel');
        }
        return;
      }
      if (mouse(g)) return;
      if (i.pressed('up')) { move(-1); audio.sfx('select'); }
      if (i.pressed('down')) { move(1); audio.sfx('select'); }
      if (entry().kind === 'key') {
        if (i.pressed('left') && slot > 0) { slot--; audio.sfx('select'); }
        if (i.pressed('right') && slot < slotsOf(page) - 1) { slot++; audio.sfx('select'); }
      }
      if (i.pressed('confirm')) activate(g);
      else if (i.pressed('cancel') || i.pressed('pause')) { audio.sfx('cancel'); opts.onBack(); }
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      inFrame(ctx, () => {
        bigText(ctx, page === 'pad' ? 'GAMEPAD' : 'CONTROLS', 128, 6, 'yellow', 2, 'center', true);

        const noun = page === 'pad' ? 'BTN' : 'KEY';
        drawText(ctx, 'ACTION', 24, 25, 'slate');
        drawText(ctx, `${noun} 1`, (CELL_X[0] as number) + CELL_W / 2, 25, 'slate', { align: 'center' });
        drawText(ctx, `${noun} 2`, (CELL_X[1] as number) + CELL_W / 2, 25, 'slate', { align: 'center' });

        for (let r = 0; r < VISIBLE; r++) {
          const idx = top + r;
          const e = list()[idx];
          if (!e) break;
          const y = LIST_Y + r * ROW_H;
          const on = idx === sel;
          if (on) drawIcon(ctx, 'cursor', 12, y - 1, t);
          drawText(ctx, e.label, 24, y, on ? 'yellow' : 'bone');
          if (e.kind === 'key' && e.action) {
            for (let s = 0; s < slotsOf(page); s++) {
              const x = CELL_X[s] as number;
              const picked = on && slot === s;
              const waiting = picked && mode === 'listen';
              box(ctx, x, y - 1, CELL_W, 10, waiting ? 'blood0' : 'night');
              outline(ctx, x, y - 1, CELL_W, 10, picked ? 'yellow' : 'shadow');
              if (waiting) {
                if (blinkOn(t, 30, 20)) drawText(ctx, 'PRESS', x + CELL_W / 2, y, 'white', { align: 'center' });
              } else {
                const c = cell(page, e.action, s);
                drawText(ctx, c.text, x + CELL_W / 2, y, c.empty ? 'slate' : on ? 'white' : 'bone', { align: 'center' });
              }
            }
          } else if (e.kind === 'page') {
            drawText(ctx, 'VIEW', 244, y, on ? 'white' : 'mist', { align: 'right' });
          }
        }
        if (upShown()) {
          ctx.save();
          ctx.translate(0, LIST_Y - 2 + 8);
          ctx.scale(1, -1);
          drawIcon(ctx, 'arrow', 246, 0, t);
          ctx.restore();
        }
        if (downShown()) drawIcon(ctx, 'arrow', 246, LIST_Y + (VISIBLE - 1) * ROW_H, t);

        box(ctx, 8, 170, 240, 1, 'shadow');
        if (mode === 'listen') {
          const pad = page === 'pad';
          const cancel = pad ? 'START' : getPromptDevice() === 'gamepad' ? 'B' : 'ESC';
          drawText(ctx, `PRESS THE NEW ${pad ? 'BUTTON' : 'KEY'}. ${cancel} CANCELS.`, 128, 175, 'amber', { align: 'center' });
          drawText(ctx, pad ? 'VIEW CLEARS THIS SLOT.' : 'BKSP CLEARS THIS SLOT.', 128, 184, 'mist', { align: 'center' });
        } else {
          const pad = page === 'pad';
          const rebind = pad ? 'A REBINDS' : 'ENTER REBINDS';
          const choose = pad ? 'A TO CHOOSE. B GOES BACK.' : 'ENTER TO CHOOSE. ESC GOES BACK.';
          const hint = entry().kind === 'key' ? `${rebind}. LEFT RIGHT PICKS A SLOT.` : choose;
          drawText(ctx, hint, 128, 175, 'mist', { align: 'center' });
          if (notice) drawText(ctx, notice.text, 128, 184, notice.ok ? 'leaf' : 'hot', { align: 'center' });
        }
        if (page === 'pad') {
          drawText(ctx, 'ALWAYS ON: A CONFIRMS AND USES, B BACKS', 128, 198, 'slate', { align: 'center' });
          drawText(ctx, 'STICK, D-PAD, VIEW AND START STAY PUT', 128, 207, 'slate', { align: 'center' });
        } else {
          drawText(ctx, 'ALWAYS ON: ARROWS, ENTER, ESC', 128, 198, 'slate', { align: 'center' });
          drawText(ctx, 'ATTACK AND TALK KEYS ALSO CONFIRM', 128, 207, 'slate', { align: 'center' });
        }
      });
    },
  };
}
