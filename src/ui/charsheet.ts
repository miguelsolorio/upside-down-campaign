// The character sheet: one hero per page, with all four heroes as tabs across the top. It shows the stats, the crit
// chance and every move with its damage at the hero's level. Opened by a click on the HUD's name and level, and from
// CHARACTERS in the pause menu. A hero who hasn't joined yet is shown grey, at Lv 1.
// The arrows, the swap keys and the hero keys switch heroes, and so does a click on a tab. Back or pause closes it.
import type { Game, Scene } from '../core/scene.ts';
import { SCREEN_H, SCREEN_W } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { getPromptDevice } from '../core/bindings.ts';
import type { BindAction } from '../core/bindings.ts';
import { inRect } from '../core/pointer.ts';
import type { HeroId } from '../core/types.ts';
import { drawPanel, drawPortrait, drawText, drawTinyText, textWidth } from '../gfx/index.ts';
import { HERO_DEFS, HERO_IDS } from '../heroes/defs.ts';
import { damageLabel, heroSheet } from '../heroes/charsheet.ts';
import type { HeroSheet, SheetMove } from '../heroes/charsheet.ts';
import { MAX_LEVEL } from '../progression/xp.ts';
import type { Stats } from '../progression/xp.ts';
import { bigText, box, clipped, inFrame, outline, toFrame } from './kit.ts';
import type { Ctx } from './kit.ts';
import {
  FOOT_Y, LEFT, MOVES_Y, MOVE_PITCH, NAME_Y, NOTE_DY, PANEL, PORTRAIT_Y, RIGHT, ROLE_Y, RULE_Y, STAT_COLS, STAT_ROWS,
  STAT_VALUE_DX, TEXT_X, backRect, tabAt, tabRect,
} from './charsheetlayout.ts';

/** One hero as the sheet needs them. A hero who hasn't joined comes in at Lv 1 with no bonus. */
export interface CharSheetHero {
  id: HeroId;
  level: number;
  /** XP toward the next level, and what the next level needs. */
  xp: number;
  xpNext: number;
  /** d20 bonus received so far, in stat units. */
  bonus: Stats;
  joined: boolean;
  active: boolean;
}

const KIND_LABEL: Record<SheetMove['kind'], string> = { basic: 'BASIC', special: 'SPECIAL', crit: 'PARTY', talent: 'TALENT' };

function drawTab(ctx: Ctx, h: CharSheetHero, i: number, on: boolean, hot: boolean): void {
  const r = tabRect(i);
  outline(ctx, r.x, r.y, r.w, r.h, on ? 'yellow' : hot ? 'cream' : 'dusk');
  const fx = r.x + 2, fy = r.y + 2;
  outline(ctx, fx, fy, 11, 11, on ? 'amber' : 'slate');
  clipped(ctx, fx + 1, fy + 1, 9, 9, () => drawPortrait(ctx, h.id, 'neutral', fx - 7, fy - 5, !h.joined));
  drawText(ctx, HERO_DEFS[h.id].name, fx + 14, r.y + 4, on ? 'yellow' : h.joined ? 'bone' : 'slate');
}

function drawHeader(ctx: Ctx, h: CharSheetHero, s: HeroSheet): void {
  box(ctx, LEFT, PORTRAIT_Y, 24, 24, 'ink');
  outline(ctx, LEFT - 1, PORTRAIT_Y - 1, 26, 26, h.joined ? 'amber' : 'dusk');
  drawPortrait(ctx, h.id, h.joined ? 'determined' : 'neutral', LEFT, PORTRAIT_Y, !h.joined);
  const nameW = drawText(ctx, s.name, TEXT_X, NAME_Y, 'white');
  drawText(ctx, `LV${s.level}`, TEXT_X + nameW + 6, NAME_Y, 'yellow');
  drawText(ctx, s.role, TEXT_X, ROLE_Y, 'amber');
  if (!h.joined) drawText(ctx, 'NOT IN THE PARTY YET', RIGHT, ROLE_Y, 'mist', { align: 'right' });
  else drawText(ctx, h.level >= MAX_LEVEL ? 'XP MAX' : `XP ${h.xp}/${h.xpNext}`, RIGHT, NAME_Y, 'mist', { align: 'right' });
}

/** HP, MP, ATK on top and DEF, SPD, CRIT under them. A stat the d20 has raised shows the bonus in green. */
function drawStats(ctx: Ctx, s: HeroSheet): void {
  const cells: [string, string, number][] = [
    ['HP', `${s.stats.hp}`, s.bonus.hp], ['MP', `${s.stats.mp}`, s.bonus.mp], ['ATK', `${s.stats.atk}`, s.bonus.atk],
    ['DEF', `${s.stats.def}`, s.bonus.def], ['SPD', `${s.stats.spd}`, s.bonus.spd], ['CRIT', `${Math.round(s.crit * 100)}%`, 0],
  ];
  cells.forEach(([label, value, bonus], i) => {
    const x = STAT_COLS[i % 3] as number, y = STAT_ROWS[(i / 3) | 0] as number;
    drawText(ctx, label, x, y, 'mist');
    const w = drawText(ctx, value, x + STAT_VALUE_DX, y, 'white');
    if (bonus > 0) drawText(ctx, `+${bonus}`, x + STAT_VALUE_DX + w + 4, y, 'leaf');
  });
  box(ctx, LEFT, RULE_Y, RIGHT - LEFT, 1, 'dusk');
}

/** Kind, name and cost on the first line with the damage at the right, and the note under the name. */
function drawMove(ctx: Ctx, m: SheetMove, y: number): void {
  const dim = !!m.locked;
  drawTinyText(ctx, KIND_LABEL[m.kind], LEFT, y + 1, 'mist');
  const nameW = drawText(ctx, m.name, TEXT_X, y, dim ? 'slate' : 'white');
  if (m.mp > 0) drawText(ctx, `${m.mp} MP`, TEXT_X + nameW + 6, y, 'sky');
  if (m.kind === 'talent') {
    drawText(ctx, m.locked ? `AT LV${m.level}` : 'ON', RIGHT, y, m.locked ? 'slate' : 'leaf', { align: 'right' });
  } else if (m.dmg) {
    const dmg = damageLabel(m);
    drawText(ctx, dmg, RIGHT, y, 'yellow', { align: 'right' });
    drawText(ctx, 'DMG', RIGHT - textWidth(dmg) - 4, y, 'mist', { align: 'right' });
  } else {
    drawText(ctx, 'NO DMG', RIGHT, y, 'slate', { align: 'right' });
  }
  drawText(ctx, m.note, TEXT_X, y + NOTE_DY, dim ? 'slate' : 'mist');
}

export function createCharSheetScene(opts: { heroes: () => CharSheetHero[]; start?: HeroId; onBack(): void }): Scene {
  let heroes: CharSheetHero[] = [];
  let sel = 0;
  let hotTab = -1;
  let hotBack = false;

  const load = (): void => {
    const live = opts.heroes();
    heroes = HERO_IDS.map((id) => live.find((h) => h.id === id)).filter((h): h is CharSheetHero => !!h);
  };
  const pick = (i: number): void => {
    if (i < 0 || i >= heroes.length || i === sel) return;
    sel = i;
    audio.sfx('select');
  };
  const step = (d: number): void => pick((sel + d + heroes.length) % heroes.length);
  const back = (): void => { audio.sfx('cancel'); opts.onBack(); };

  const backLabel = (): string => {
    const device = getPromptDevice();
    return device === 'gamepad' ? 'B BACK' : device === 'touch' ? 'BACK' : 'ESC BACK';
  };
  const switchHint = (): string => {
    const device = getPromptDevice();
    return device === 'gamepad' ? 'LB RB PICK A HERO' : device === 'touch' ? 'TAP A FACE TO PICK' : 'ARROWS PICK A HERO';
  };

  /** The mouse's share of a tick. Returns true when a click was used. The sheet is drawn in the centered frame. */
  const mouse = (g: Game): boolean => {
    const i = g.input;
    const p = toFrame(i.hover());
    hotTab = tabAt(p);
    hotBack = !!p && inRect(p, backRect(backLabel()));
    if ((hotTab >= 0 && hotTab !== sel) || hotBack) i.point();
    const c = toFrame(i.clicked());
    if (!c) return false;
    const at = tabAt(c);
    if (at >= 0) { pick(at); return true; }
    if (inRect(c, backRect(backLabel()))) { back(); return true; }
    return false;
  };

  return {
    opaque: true,
    enter() {
      load();
      const start = opts.start ?? heroes.find((h) => h.active)?.id;
      sel = Math.max(0, heroes.findIndex((h) => h.id === start));
    },
    update(g) {
      if (heroes.length === 0) load();
      const i = g.input;
      if (i.pressed('cancel') || i.pressed('pause')) { back(); return; }
      if (mouse(g)) return;
      if (i.pressed('left') || i.pressed('swapPrev')) step(-1);
      if (i.pressed('right') || i.pressed('swapNext')) step(1);
      for (let n = 0; n < heroes.length; n++) if (i.pressed(`swap${n + 1}` as BindAction)) pick(n);
    },
    draw(ctx) {
      box(ctx, 0, 0, SCREEN_W, SCREEN_H, 'ink');
      inFrame(ctx, () => {
        bigText(ctx, 'CHARACTERS', 128, 4, 'yellow', 2, 'center', true);
        heroes.forEach((h, i) => drawTab(ctx, h, i, i === sel, i === hotTab));
        const h = heroes[sel];
        if (!h) return;
        const s = heroSheet(h.id, h.level, h.bonus);
        drawPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 'menu');
        drawHeader(ctx, h, s);
        drawStats(ctx, s);
        s.moves.forEach((m, i) => drawMove(ctx, m, MOVES_Y + i * MOVE_PITCH));

        drawText(ctx, switchHint(), LEFT, FOOT_Y, 'slate');
        const label = backLabel();
        drawText(ctx, label, RIGHT, FOOT_Y, hotBack ? 'yellow' : 'mist', { align: 'right' });
        if (hotBack) box(ctx, RIGHT - textWidth(label), FOOT_Y + 8, textWidth(label) - 1, 1, 'yellow');
      });
    },
  };
}
