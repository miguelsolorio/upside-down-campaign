// The controls screen: every action with its two keys, and rebinding. Reached from the options on the title
// screen and from the pause menu. Enter on a slot waits for the next key; a key already in use is swapped.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { BIND_ROWS, SLOTS, clearBinding, getBinding, getPromptDevice, keyLabel, resetBindings, setBinding } from '../core/bindings.ts';
import type { BindAction } from '../core/bindings.ts';
import { drawIcon, drawText } from '../gfx/index.ts';
import { bigText, blinkOn, box, outline } from './kit.ts';
import type { Ctx } from './kit.ts';

interface Entry { label: string; kind: 'key' | 'reset' | 'pad' | 'back'; action?: BindAction }

const ENTRIES: Entry[] = [
  ...BIND_ROWS.map((r): Entry => ({ label: r.label, kind: 'key', action: r.action })),
  { label: 'RESET ALL', kind: 'reset' },
  { label: 'GAMEPAD', kind: 'pad' },
  { label: 'BACK', kind: 'back' },
];

const VISIBLE = 12;
const ROW_H = 11;
const LIST_Y = 36;
const CELL_W = 46;
const CELL_X = [146, 198];
const NOTICE_FRAMES = 220;

const PAD_LINES: [string, string][] = [
  ['A', 'ATTACK, CONFIRM, TALK'], ['X', 'SPECIAL'], ['B', 'DASH AND BACK'], ['LB RB', 'SWAP HERO'],
  ['Y', 'PARTY BURST'], ['START', 'PAUSE, OR BEGIN'], ['VIEW', 'SKIP DIALOGUE'], ['STICK', 'MOVE, D-PAD TOO'],
  ['RT LT', 'ATTACK, DASH TOO'],
];

function drawPad(ctx: Ctx): void {
  PAD_LINES.forEach(([button, what], i) => {
    const y = 34 + i * 12;
    drawText(ctx, button, 24, y, 'amber');
    drawText(ctx, what, 100, y, 'white');
  });
  drawText(ctx, "GAMEPAD BUTTONS CAN'T BE CHANGED YET.", 128, 152, 'mist', { align: 'center' });
  drawText(ctx, 'PRESS ENTER OR A TO GO BACK.', 128, 172, 'slate', { align: 'center' });
}

export function createControlsScene(opts: { onBack(): void }): Scene {
  let t = 0;
  let sel = 0;
  let slot = 0;
  let top = 0;
  let mode: 'browse' | 'listen' | 'pad' = 'browse';
  let notice: { text: string; ok: boolean; ttl: number } | null = null;
  let stopListening: (() => void) | null = null;

  const say = (text: string, ok = true): void => { notice = { text, ok, ttl: NOTICE_FRAMES }; };
  const entry = (): Entry => ENTRIES[sel] as Entry;

  const move = (d: number): void => {
    sel = (sel + d + ENTRIES.length) % ENTRIES.length;
    if (sel < top) top = sel;
    if (sel >= top + VISIBLE) top = sel - VISIBLE + 1;
  };

  /** Waits for the next key press and puts it on the selected slot. Escape cancels, Backspace clears. */
  const listen = (g: Game): void => {
    const action = entry().action;
    if (!action) return;
    mode = 'listen';
    notice = null;
    stopListening = g.input.capture((code) => {
      stopListening = null;
      mode = 'browse';
      if (code === 'Escape') { say('CANCELLED'); audio.sfx('cancel'); return; }
      const r = code === 'Backspace' || code === 'Delete' ? clearBinding(action, slot) : setBinding(action, slot, code);
      say(r.note, r.ok);
      audio.sfx(r.ok ? 'confirm' : 'cancel');
    });
  };

  const activate = (g: Game): void => {
    const e = entry();
    if (e.kind === 'key') { audio.sfx('select'); listen(g); return; }
    if (e.kind === 'reset') { resetBindings(); say('DEFAULTS RESTORED'); audio.sfx('confirm'); return; }
    if (e.kind === 'pad') { mode = 'pad'; audio.sfx('confirm'); return; }
    audio.sfx('cancel');
    opts.onBack();
  };

  return {
    opaque: true,
    exit() { stopListening?.(); },
    update(g) {
      t++;
      if (notice && --notice.ttl <= 0) notice = null;
      const i = g.input;
      if (mode === 'listen') {
        // Waiting on a key, which a controller can't give. B or Start backs out. A keyboard Escape never gets here:
        // the capture takes it first.
        if (i.pressed('cancel') || i.pressed('pause')) {
          stopListening?.();
          stopListening = null;
          mode = 'browse';
          say('CANCELLED');
          audio.sfx('cancel');
        }
        return;
      }
      if (mode === 'pad') {
        if (i.pressed('confirm') || i.pressed('cancel') || i.pressed('pause')) { mode = 'browse'; audio.sfx('cancel'); }
        return;
      }
      if (i.pressed('up')) { move(-1); audio.sfx('select'); }
      if (i.pressed('down')) { move(1); audio.sfx('select'); }
      if (entry().kind === 'key') {
        if (i.pressed('left') && slot > 0) { slot--; audio.sfx('select'); }
        if (i.pressed('right') && slot < SLOTS - 1) { slot++; audio.sfx('select'); }
      }
      if (i.pressed('confirm')) activate(g);
      else if (i.pressed('cancel') || i.pressed('pause')) { audio.sfx('cancel'); opts.onBack(); }
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      bigText(ctx, mode === 'pad' ? 'GAMEPAD' : 'CONTROLS', 128, 6, 'yellow', 2, 'center', true);
      if (mode === 'pad') { drawPad(ctx); return; }

      drawText(ctx, 'ACTION', 24, 25, 'slate');
      drawText(ctx, 'KEY 1', (CELL_X[0] as number) + CELL_W / 2, 25, 'slate', { align: 'center' });
      drawText(ctx, 'KEY 2', (CELL_X[1] as number) + CELL_W / 2, 25, 'slate', { align: 'center' });

      for (let r = 0; r < VISIBLE; r++) {
        const idx = top + r;
        const e = ENTRIES[idx];
        if (!e) break;
        const y = LIST_Y + r * ROW_H;
        const on = idx === sel;
        if (on) drawIcon(ctx, 'cursor', 12, y - 1, t);
        drawText(ctx, e.label, 24, y, on ? 'yellow' : 'bone');
        if (e.kind === 'key' && e.action) {
          const keys = getBinding(e.action);
          for (let s = 0; s < SLOTS; s++) {
            const x = CELL_X[s] as number;
            const picked = on && slot === s;
            const waiting = picked && mode === 'listen';
            box(ctx, x, y - 1, CELL_W, 10, waiting ? 'blood0' : 'night');
            outline(ctx, x, y - 1, CELL_W, 10, picked ? 'yellow' : 'shadow');
            if (waiting) {
              if (blinkOn(t, 30, 20)) drawText(ctx, 'PRESS', x + CELL_W / 2, y, 'white', { align: 'center' });
            } else {
              const code = keys[s] ?? null;
              drawText(ctx, keyLabel(code), x + CELL_W / 2, y, code ? (on ? 'white' : 'bone') : 'slate', { align: 'center' });
            }
          }
        } else if (e.kind === 'pad') {
          drawText(ctx, 'VIEW', 244, y, on ? 'white' : 'mist', { align: 'right' });
        }
      }
      if (top > 0) {
        ctx.save();
        ctx.translate(0, LIST_Y - 2 + 8);
        ctx.scale(1, -1);
        drawIcon(ctx, 'arrow', 246, 0, t);
        ctx.restore();
      }
      if (top + VISIBLE < ENTRIES.length) drawIcon(ctx, 'arrow', 246, LIST_Y + (VISIBLE - 1) * ROW_H, t);

      box(ctx, 8, 170, 240, 1, 'shadow');
      if (mode === 'listen') {
        drawText(ctx, `PRESS THE NEW KEY. ${getPromptDevice() === 'gamepad' ? 'B' : 'ESC'} CANCELS.`, 128, 175, 'amber', { align: 'center' });
        drawText(ctx, 'BKSP CLEARS THIS SLOT.', 128, 184, 'mist', { align: 'center' });
      } else {
        const hint = entry().kind === 'key' ? 'ENTER REBINDS. LEFT RIGHT PICKS A SLOT.' : 'ENTER TO CHOOSE. ESC GOES BACK.';
        drawText(ctx, hint, 128, 175, 'mist', { align: 'center' });
        if (notice) drawText(ctx, notice.text, 128, 184, notice.ok ? 'leaf' : 'hot', { align: 'center' });
      }
      drawText(ctx, 'ALWAYS ON: ARROWS, ENTER, ESC', 128, 198, 'slate', { align: 'center' });
      drawText(ctx, 'ATTACK AND TALK KEYS ALSO CONFIRM', 128, 207, 'slate', { align: 'center' });
    },
  };
}
