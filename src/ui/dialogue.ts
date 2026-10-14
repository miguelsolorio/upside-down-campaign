// The dialogue box: portrait on the left, a name tag, three lines of 32 characters, typewriter text with the speaker's blip.
import type { Game } from '../core/scene.ts';
import type { CharId, DialogueScript, Speaker } from '../core/types.ts';
import { CHAR_NAMES } from '../core/config.ts';
import { keyText, labelOf } from '../core/bindings.ts';
import { skipsDialogue } from '../core/settings.ts';
import { wrapText } from '../core/text.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawPanel, drawPortrait, drawText } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import { pagesOf, typeCount, typeFrames, wantsBlip } from './format.ts';
import { blinkOn, box, outline } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface DialogueBox {
  readonly active: boolean;
  /** Starts a script. onDone fires after the last line is dismissed. */
  start(script: DialogueScript, onDone?: () => void): void;
  update(g: Game): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

const TAG_COLOR: Record<Speaker, ColorName> = {
  mike: 'sky', dustin: 'amber', lucas: 'leaf', eleven: 'pink', will: 'cream', joyce: 'rose', max: 'red', dm: 'yellow', narrator: 'mist',
};
const PANEL = { x: 8, y: 176, w: 240, h: 40 };
/** Frames at the start of a line where confirm is ignored, so the press that opened it cannot skip it. */
const GRACE = 10;
const LINE_H = 9;

function speakerName(who: Speaker): string {
  if (who === 'narrator') return '';
  if (who === 'dm') return 'DM';
  return CHAR_NAMES[who];
}

export function createDialogueBox(): DialogueBox {
  let script: DialogueScript | null = null;
  let idx = 0;
  let pages: string[][] = [['']];
  let page = 0;
  /** Frames since this page began, and how many of its characters are showing. */
  let age = 0;
  let shown = 0;
  let t = 0;
  let live = false;
  let done: (() => void) | undefined;

  const total = (): number => (pages[page] as string[]).reduce((n, l) => n + l.length, 0);
  const load = (i: number): void => {
    idx = i; page = 0; age = 0; shown = 0;
    // Lines name keys as {attack}, {move} and so on, so the tutorial stays true after a rebind.
    pages = pagesOf(wrapText(keyText((script as DialogueScript).lines[i]?.text ?? '')));
  };
  const finish = (): void => {
    live = false;
    script = null;
    const cb = done;
    done = undefined;
    cb?.();
  };
  const advance = (): void => {
    if (page + 1 < pages.length) { page++; age = 0; shown = 0; return; }
    if (script && idx + 1 < script.lines.length) { load(idx + 1); return; }
    finish();
  };

  return {
    get active() { return live; },
    start(s, onDone) {
      // With "skip story" on, a script is over before it starts and its follow-up runs at once.
      if (!s.lines.length || skipsDialogue()) { onDone?.(); return; }
      script = s; done = onDone; live = true; t = 0;
      load(0);
      audio.sfx('dialogOpen');
    },
    update(g) {
      if (!live || !script) return;
      // The skip key drops the rest of this script, not just the current line.
      if (g.input.pressed('skip')) { audio.sfx('cancel'); finish(); return; }
      t++; age++;
      const n = typeCount(age, total());
      if (n > shown) {
        shown = n;
        const ch = (pages[page] as string[]).join('')[n - 1] ?? ' ';
        if (wantsBlip(n, ch)) audio.blip((script.lines[idx] as { who: Speaker }).who);
      }
      if (age > GRACE && g.input.pressed('confirm')) {
        if (shown < total()) { age = typeFrames(total()); shown = total(); } else advance();
      }
    },
    draw(ctx: Ctx) {
      if (!live || !script) return;
      const line = script.lines[idx];
      const who = line.who;
      const face = who !== 'narrator';
      const portrait = (who === 'dm' ? 'mike' : who) as CharId;
      const { x, y, w, h } = PANEL;
      drawPanel(ctx, x, y, w, h, 'dialog');
      const skipKey = labelOf('skip');
      if (skipKey !== '--') drawText(ctx, `${skipKey} SKIP`, x + w - 4, y - 9, 'bone', { align: 'right', shadow: true });
      if (face) drawPortrait(ctx, portrait, line.expr ?? 'neutral', x + 6, y + 7);
      const name = speakerName(who);
      if (name) {
        const tw = name.length * 6 + 8, tx = x + 6, ty = y - 7;
        box(ctx, tx - 1, ty - 1, tw + 2, 13, 'ink');
        box(ctx, tx, ty, tw, 11, 'shadow');
        outline(ctx, tx, ty, tw, 11, 'mist');
        drawText(ctx, name, tx + 4, ty + 2, TAG_COLOR[who]);
      }
      const textX = face ? x + 36 : 32;
      let left = shown;
      (pages[page] as string[]).forEach((text, k) => {
        const vis = Math.max(0, Math.min(text.length, left));
        left -= text.length;
        if (vis > 0) drawText(ctx, text.slice(0, vis), textX, y + 7 + k * LINE_H, 'white');
      });
      if (shown >= total() && blinkOn(t, 48, 34)) drawIcon(ctx, 'arrow', x + w - 14, y + h - 13, t);
    },
  };
}
