// The results screen: time, kills, XP, quarters, level-ups and the party's levels. `final` ends the build with the feedback note.
import type { Scene } from '../core/scene.ts';
import type { HeroSnapshot, RunStats } from '../core/types.ts';
import { CHAR_NAMES, SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { drawIcon, drawPanel, drawPortrait, drawText, textWidth } from '../gfx/index.ts';
import { countUp, formatTime } from './format.ts';
import { bigText, blinkOn, box } from './kit.ts';
import type { Ctx } from './kit.ts';

const KIND_LABEL: Record<string, string> = { agent: 'AGENTS', rat: 'RATS' };
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

  function row(ctx: Ctx, i: number, label: string, value: string, color: 'white' | 'leaf' | 'yellow', icon = false): void {
    if (t < at(i)) return;
    const y = 54 + i * 11;
    drawText(ctx, label, 34, y, 'mist');
    drawText(ctx, value, 222, y, color, { align: 'right' });
    // The coin is 7 px, the same height as the text, so it sits level with it.
    if (icon) drawIcon(ctx, 'quarter', 222 - textWidth(value) - 9, y, t);
  }

  return {
    opaque: true,
    enter() { audio.jingle('clear'); },
    update(g) {
      t++;
      if (!g.input.pressed('confirm')) return;
      if (t < FOOT_AT) { t = FOOT_AT; return; }
      if (t >= READY && !finished) {
        finished = true;
        opts.onContinue();
      }
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      bigText(ctx, final ? `END OF LEVEL ${level}` : `LEVEL ${level} CLEAR`, 128, 12, 'yellow', 2, 'center', true);
      if (final) drawText(ctx, 'This is a feedback build. More soon.', 128, 32, 'cream', { align: 'center' });
      drawPanel(ctx, 24, 46, 208, 70, 'menu');

      row(ctx, 0, 'TIME', formatTime(countUp(stats.frames, t, at(0), COUNT + 10)), 'white');
      const foes = kinds.map(([k, n]) => `${KIND_LABEL[k] ?? `${k.toUpperCase()}S`} x${countUp(n, t, at(1), COUNT)}`).join('  ');
      row(ctx, 1, 'FOES', foes || 'NONE', 'white');
      row(ctx, 2, 'XP EARNED', `+${countUp(stats.xpEarned, t, at(2), COUNT)}`, 'leaf');
      row(ctx, 3, 'QUARTERS', `x${countUp(stats.quarters, t, at(3), COUNT)}`, 'white', true);
      row(ctx, 4, 'LEVEL UPS', String(stats.levelUps.length), stats.levelUps.length ? 'yellow' : 'white');

      if (t >= PARTY_AT) {
        const cell = 56;
        const x0 = Math.round((SCREEN_W - party.length * cell) / 2);
        party.forEach((p, i) => {
          const x = x0 + i * cell, mid = x + cell / 2;
          drawPortrait(ctx, p.id, p.hp <= 0 ? 'hurt' : 'happy', mid - 12, 126);
          drawText(ctx, CHAR_NAMES[p.id], mid, 154, 'white', { align: 'center' });
          const up = gained(p.id);
          const lv = `LV${p.level}`;
          const x1 = mid - ((lv.length + (up ? 3 : 0)) * 6) / 2;
          drawText(ctx, lv, x1, 163, 'yellow');
          if (up) drawText(ctx, `+${up}`, x1 + lv.length * 6 + 6, 163, 'leaf');
        });
      }

      if (t >= FOOT_AT && blinkOn(t, 60, 42)) {
        const label = final ? 'BACK TO TITLE' : 'CONTINUE';
        drawIcon(ctx, 'arrow', 128 - textWidth(label) / 2 - 12, 196, t);
        drawText(ctx, label, 128, 197, 'white', { align: 'center' });
      }
    },
  };
}
