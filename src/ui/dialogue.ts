// The dialogue box: portrait on the left, a name tag, three lines of 32 characters, typewriter text with the speaker's blip.
// A click anywhere does what confirm does, except on the skip label above the box, which skips like the skip key.
import type { Game } from '../core/scene.ts';
import type { CharId, DialogueScript, Speaker } from '../core/types.ts';
import { CHAR_NAMES } from '../core/config.ts';
import { keyText, labelOf } from '../core/bindings.ts';
import { skipsDialogue } from '../core/settings.ts';
import { wrapText } from '../core/text.ts';
import { inRect } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawPanel, drawPortrait, drawText, textWidth } from '../gfx/index.ts';
import type { ColorName } from '../gfx/palette.ts';
import { pagesOf, typeCount, typeFrames, wantsBlip } from './format.ts';
import { blinkOn, box, outline } from './kit.ts';
import type { Ctx } from './kit.ts';

export interface DialogueBox {
  readonly active: boolean;
  /** Starts a script. onDone fires after the last line is dismissed. */
  start(script: DialogueScript, onDone?: () => void): void;
  update(g: Game): void;
  /** True when this tick's click landed on the skip label, which is the mouse's skip key. Only while a script shows. */
  skipClicked(g: Game): boolean;
  draw(ctx: CanvasRenderingContext2D): void;
}

const TAG_COLOR: Record<Speaker, ColorName> = {
  mike: 'sky', dustin: 'amber', lucas: 'leaf', eleven: 'pink', will: 'cream', joyce: 'rose', dm: 'yellow', narrator: 'mist',
};
const PANEL = { x: 8, y: 176, w: 240, h: 40 };
/** Frames at the start of a line where confirm is ignored, so the press that opened it cannot skip it. */
const GRACE = 10;
const LINE_H = 9;

/** The skip label over the box's top right corner, or null with no key bound to skip. */
function skipLabel(): string | null {
  const key = labelOf('skip');
  return key === '--' ? null : `${key} SKIP`;
}
/** The skip label's box, for the mouse. */
function skipBox(text: string): Rect {
  const w = textWidth(text);
  return { x: PANEL.x + PANEL.w - 4 - w - 3, y: PANEL.y - 11, w: w + 6, h: 11 };
}

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
  /** The mouse is over the skip label. */
  let skipHot = false;

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

  const skipClicked = (g: Game): boolean => {
    const label = skipLabel();
    const click = g.input.clicked();
    return live && !!label && !!click && inRect(click, skipBox(label));
  };

  return {
    get active() { return live; },
    skipClicked,
    start(s, onDone) {
      // With "skip story" on, a script is over before it starts and its follow-up runs at once.
      if (!s.lines.length || skipsDialogue()) { onDone?.(); return; }
      script = s; done = onDone; live = true; t = 0;
      load(0);
      audio.sfx('dialogOpen');
    },
    update(g) {
      if (!live || !script) return;
      const i = g.input;
      i.offer('skip');
      const label = skipLabel();
      const ptr = i.hover();
      skipHot = !!label && !!ptr && inRect(ptr, skipBox(label));
      if (skipHot) i.point();
      // The skip key drops the rest of this script, not just the current line.
      if (i.pressed('skip') || skipClicked(g)) { audio.sfx('cancel'); finish(); return; }
      t++; age++;
      const n = typeCount(age, total());
      if (n > shown) {
        shown = n;
        const ch = (pages[page] as string[]).join('')[n - 1] ?? ' ';
        if (wantsBlip(n, ch)) audio.blip((script.lines[idx] as { who: Speaker }).who);
      }
      if (age > GRACE && (i.pressed('confirm') || i.clicked())) {
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
      const skip = skipLabel();
      if (skip) drawText(ctx, skip, x + w - 4, y - 9, skipHot ? 'yellow' : 'bone', { align: 'right', shadow: true });
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
