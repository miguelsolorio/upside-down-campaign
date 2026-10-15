// The results screen: time, kills, XP, quarters, level-ups and the party's levels. `final` ends the build with the feedback note.
// A click anywhere does what confirm does. The mouse over CONTINUE stops its blink and lights it.
import type { Scene } from '../core/scene.ts';
import type { HeroSnapshot, RunStats } from '../core/types.ts';
import { BASE_W, CHAR_NAMES, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { inRect } from '../core/pointer.ts';
import type { Rect } from '../core/pointer.ts';
import { drawIcon, drawPanel, drawPortrait, drawText, textWidth } from '../gfx/index.ts';
import { countUp, foeLines, formatTime } from './format.ts';
import { bigText, blinkOn, box, inFrame, toFrame } from './kit.ts';
import type { Ctx } from './kit.ts';

/** The foes text starts 8 px right of its label and ends at the panel's value edge, so it holds this many characters a line. */
const FOE_CHARS = 26;
const FOE_LINE = 9;
/** Row i appears at ROW_AT + i * ROW_GAP and its number counts up over COUNT frames. */
const ROW_AT = 18;
const ROW_GAP = 14;
const COUNT = 30;
const PARTY_AT = ROW_AT + 5 * ROW_GAP;
const FOOT_AT = PARTY_AT + 24;
/** Confirm waits this long after everything is showing. */
const READY = FOOT_AT + 12;

export function createResultsScene(opts: { stats: RunStats; party: HeroSnapshot[]; level?: number; final?: boolean; onContinue(): void }): Scene {
  const { stats, party } = opts;
  const final = !!opts.final;
  const level = opts.level ?? 1;
  let t = 0;
  let finished = false;
  const kinds = Object.entries(stats.killsByKind).filter(([, n]) => (n ?? 0) > 0) as [string, number][];
  const gained = (id: string): number => stats.levelUps.filter((u) => u.hero === id).reduce((n, u) => n + (u.to - u.from), 0);
  const at = (row: number): number => ROW_AT + row * ROW_GAP;
  // A long mix of foes wraps onto more lines; everything under that row, and the panel, moves down to make room.
  const foeRows = Math.max(1, foeLines(kinds, FOE_CHARS).length);
  const extra = (foeRows - 1) * FOE_LINE;
  // The last stage of the build leads to the map too, since that is where the campaign lives now.
  const label = final ? 'TO THE MAP' : 'CONTINUE';
  /** The prompt and its arrow, for the mouse. */
  const prompt: Rect = { x: 128 - textWidth(label) / 2 - 14, y: 194, w: textWidth(label) + 28, h: 12 };
  /** The mouse is over the prompt. */
  let hot = false;

  function row(ctx: Ctx, i: number, label: string, value: string | string[], color: 'white' | 'leaf' | 'yellow', icon = false): void {
    if (t < at(i)) return;
    const y = 54 + i * 11 + (i > 1 ? extra : 0);
    const lines = typeof value === 'string' ? [value] : value;
    drawText(ctx, label, 34, y, 'mist');
    lines.forEach((line, k) => drawText(ctx, line, 222, y + k * FOE_LINE, color, { align: 'right' }));
    // The coin is 7 px, the same height as the text, so it sits level with it.
    if (icon) drawIcon(ctx, 'quarter', 222 - textWidth(lines[0] as string) - 9, y, t);
  }

  function drawCard(ctx: Ctx): void {
    bigText(ctx, final ? `END OF LEVEL ${level}` : `LEVEL ${level} CLEAR`, 128, 12, 'yellow', 2, 'center', true);
    if (final) drawText(ctx, 'This is a feedback build. More soon.', 128, 32, 'cream', { align: 'center' });
    drawPanel(ctx, 24, 46, 208, 70 + extra, 'menu');

    row(ctx, 0, 'TIME', formatTime(countUp(stats.frames, t, at(0), COUNT + 10)), 'white');
    const foes = foeLines(kinds, FOE_CHARS, 3, (n) => countUp(n, t, at(1), COUNT));
    row(ctx, 1, 'FOES', foes.length ? foes : 'NONE', 'white');
    row(ctx, 2, 'XP EARNED', `+${countUp(stats.xpEarned, t, at(2), COUNT)}`, 'leaf');
    row(ctx, 3, 'QUARTERS', `x${countUp(stats.quarters, t, at(3), COUNT)}`, 'white', true);
    row(ctx, 4, 'LEVEL UPS', String(stats.levelUps.length), stats.levelUps.length ? 'yellow' : 'white');

    if (t >= PARTY_AT) {
      const cell = 56;
      const x0 = Math.round((BASE_W - party.length * cell) / 2);
      party.forEach((p, i) => {
        const x = x0 + i * cell, mid = x + cell / 2;
        drawPortrait(ctx, p.id, p.hp <= 0 ? 'hurt' : 'happy', mid - 12, 126 + extra);
        drawText(ctx, CHAR_NAMES[p.id], mid, 154 + extra, 'white', { align: 'center' });
        const up = gained(p.id);
        const lv = `LV${p.level}`;
        const x1 = mid - ((lv.length + (up ? 3 : 0)) * 6) / 2;
        drawText(ctx, lv, x1, 163 + extra, 'yellow');
        if (up) drawText(ctx, `+${up}`, x1 + lv.length * 6 + 6, 163 + extra, 'leaf');
      });
    }

    if (t >= FOOT_AT && (hot || blinkOn(t, 60, 42))) {
      drawIcon(ctx, 'arrow', 128 - textWidth(label) / 2 - 12, 196, t);
      drawText(ctx, label, 128, 197, hot ? 'yellow' : 'white', { align: 'center' });
    }
  }

  return {
    opaque: true,
    enter() { audio.jingle('clear'); },
    update(g) {
      t++;
      const ptr = toFrame(g.input.hover());
      hot = t >= FOOT_AT && !!ptr && inRect(ptr, prompt);
      if (hot) g.input.point();
      if (!g.input.pressed('confirm') && !g.input.clicked()) return;
      if (t < FOOT_AT) { t = FOOT_AT; return; }
      if (t >= READY && !finished) {
        finished = true;
        opts.onContinue();
      }
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      inFrame(ctx, () => drawCard(ctx));
    },
  };
}
