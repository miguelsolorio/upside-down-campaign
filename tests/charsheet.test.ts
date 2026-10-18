// The character sheet's numbers come from the same data and formulas the sim uses, and every line fits the screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId } from '../src/core/types.ts';
import { BURST_POWER } from '../src/combat/burst.ts';
import { damageRange } from '../src/combat/damage.ts';
import { HERO_DEFS, HERO_IDS, statsAt } from '../src/heroes/defs.ts';
import { SHEET_NOTE_MAX, damageLabel, heroSheet } from '../src/heroes/charsheet.ts';
import type { SheetMove } from '../src/heroes/charsheet.ts';
import { MAX_LEVEL, emptyStats } from '../src/progression/xp.ts';
import { TALENTS } from '../src/progression/talents.ts';
import { GLYPHS } from '../src/gfx/data/font.ts';
import { PANEL, RIGHT, STAT_COLS, STAT_VALUE_DX, TAB_COUNT, TAB_NAME_DX, TAB_NAMES, TAB_W, TEXT_X, backRect, tabAt, tabRect } from '../src/ui/charsheetlayout.ts';

const move = (id: HeroId, level: number, kind: SheetMove['kind']): SheetMove => {
  const m = heroSheet(id, level).moves.find((x) => x.kind === kind);
  assert.ok(m, `${id} has a ${kind} line`);
  return m as SheetMove;
};
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

test('Mike at Lv 1: the bat does 8 to 10, the third swing more, and the DM screen does no damage', () => {
  const s = heroSheet('mike', 1);
  assert.deepEqual(s.stats, { hp: 48, mp: 16, atk: 9, def: 5, spd: 8 });
  assert.deepEqual(move('mike', 1, 'basic').dmg, { min: 8, max: 10 });
  const third = damageRange(HERO_DEFS.mike.basic.x.thirdPower as number, 9, 0);
  assert.match(move('mike', 1, 'basic').note, new RegExp(`${third.min}-${third.max}`));
  const screen = move('mike', 1, 'special');
  assert.equal(screen.dmg, null);
  assert.equal(screen.mp, HERO_DEFS.mike.special.mp);
  assert.equal(damageLabel(screen), '');
});

test('every damage line is the formula at the hero\'s ATK, for every hero and level', () => {
  for (const id of HERO_IDS) {
    const def = HERO_DEFS[id];
    for (const level of LEVELS) {
      const base = statsAt(def, level).atk;
      // Eddie's Metalhead (Lv 3) is +10% ATK on every hit, and the sheet counts it.
      const atk = base * (id === 'eddie' && level >= 3 ? 1.1 : 1);
      const s = heroSheet(id, level);
      assert.equal(s.stats.atk, base);
      const flip = id === 'eleven' && level >= (TALENTS.eleven[0]?.level ?? 3) ? (def.basic.x.flipPower as number) : 1;
      assert.deepEqual(move(id, level, 'basic').dmg, damageRange(def.basic.power * flip, atk, 0), `${id} L${level} basic`);
      if (def.special.power > 0) assert.deepEqual(move(id, level, 'special').dmg, damageRange(def.special.power, atk, 0), `${id} L${level} special`);
      assert.deepEqual(move(id, level, 'crit').dmg, damageRange(BURST_POWER, atk, 0), `${id} L${level} Crit`);
    }
  }
});

test('Flip makes Eleven\'s Push hit harder from Lv 3', () => {
  const before = move('eleven', 2, 'basic').dmg as { max: number };
  const after = move('eleven', 3, 'basic').dmg as { min: number; max: number };
  assert.deepEqual(after, damageRange(HERO_DEFS.eleven.basic.x.flipPower as number, statsAt(HERO_DEFS.eleven, 3).atk, 0));
  assert.ok(after.min > before.max, 'the jump is bigger than one level of ATK');
  assert.match(move('eleven', 3, 'basic').note, /Flip/);
  assert.doesNotMatch(move('eleven', 2, 'basic').note, /Flip/);
});

test('moves that land several hits say how many', () => {
  const triple = move('lucas', 3, 'special');
  assert.equal(triple.hits, HERO_DEFS.lucas.special.x.n);
  assert.match(damageLabel(triple), /x3$/);
  const spray = HERO_DEFS.dustin.special.x;
  assert.equal(move('dustin', 1, 'special').hits, (spray.life as number) / (spray.tick as number));
  assert.equal(move('mike', 1, 'basic').hits, 1);
  assert.doesNotMatch(damageLabel(move('mike', 1, 'basic')), /x/);
});

test('the spray\'s burn is the share of ATK the sim uses', () => {
  for (const level of LEVELS) {
    const atk = statsAt(HERO_DEFS.dustin, level).atk;
    const burn = Math.max(1, Math.round(atk * (HERO_DEFS.dustin.special.x.burnAtk as number)));
    assert.match(move('dustin', level, 'special').note, new RegExp(`^Burns ${burn} `), `L${level}`);
  }
});

test('crit chance: 5 percent, Lucas and Eleven a little more, and Sharp eye adds 15 at Lv 3', () => {
  assert.equal(Math.round(heroSheet('mike', 1).crit * 100), 5);
  assert.equal(Math.round(heroSheet('lucas', 1).crit * 100), 8);
  assert.equal(Math.round(heroSheet('lucas', 3).crit * 100), 23);
  assert.equal(Math.round(heroSheet('eleven', 1).crit * 100), 7);
});

test('each talent line is locked until its level, Lv 3, Lv 6 then Lv 9', () => {
  const talentRows = (id: HeroId, level: number): SheetMove[] => heroSheet(id, level).moves.filter((m) => m.kind === 'talent');
  for (const id of HERO_IDS) {
    TALENTS[id].forEach((t, i) => {
      const below = talentRows(id, t.level - 1)[i] as SheetMove, at = talentRows(id, t.level)[i] as SheetMove;
      assert.equal(below.locked, true, `${id} ${t.name} below`);
      assert.equal(at.locked, false, `${id} ${t.name} at`);
      assert.equal(at.name, t.name);
      assert.equal(at.note, t.text);
      assert.equal(at.level, t.level);
    });
    assert.equal(talentRows(id, 1).length, 3, `${id} shows all three talents from Lv 1`);
  }
});

test('d20 bonus points raise the stats and the damage', () => {
  const bonus = { ...emptyStats(), atk: 4, hp: 6 };
  const plain = heroSheet('mike', 3), boosted = heroSheet('mike', 3, bonus);
  assert.equal(boosted.stats.atk, plain.stats.atk + 4);
  assert.equal(boosted.stats.hp, plain.stats.hp + 6);
  assert.deepEqual(boosted.bonus, bonus);
  assert.ok((boosted.moves[0]?.dmg?.min ?? 0) > (plain.moves[0]?.dmg?.min ?? 0));
  bonus.atk = 99;
  assert.equal(boosted.bonus.atk, 4, 'the sheet keeps its own copy');
});

test('every line fits the panel and the font, for every hero and level', () => {
  const glyphs = new Set([...Object.keys(GLYPHS), ' ', 'x']);
  const fits = (text: string): void => {
    for (const ch of text.toUpperCase()) assert.ok(glyphs.has(ch) || glyphs.has(ch.toLowerCase()), `the font has "${ch}" in "${text}"`);
  };
  for (const id of HERO_IDS) {
    for (const level of LEVELS) {
      // A big d20 bonus, so the widest numbers are checked too.
      const s = heroSheet(id, level, { hp: 30, mp: 20, atk: 20, def: 20, spd: 20 });
      for (const m of s.moves) {
        assert.ok(m.note.length <= SHEET_NOTE_MAX, `${id} ${m.name}: "${m.note}" is ${m.note.length} long`);
        assert.ok(TEXT_X + m.note.length * 6 - 1 <= RIGHT, `${id} ${m.name}: the note runs past the panel`);
        fits(m.note);
        fits(m.name);
        // The name and cost on the left, "DMG" and the damage on the right, with room between.
        const left = TEXT_X + m.name.length * 6 + (m.mp > 0 ? 6 + `${m.mp} MP`.length * 6 : 0);
        const dmg = damageLabel(m);
        const right = m.kind === 'talent' ? `AT LV${m.level}`.length * 6 : dmg ? (dmg.length + 4) * 6 + 4 : 'NO DMG'.length * 6;
        assert.ok(left + 6 <= RIGHT - right, `${id} L${level} ${m.name}: "${m.name}" and "${dmg}" collide`);
      }
      // Each stat cell is a label, its value and any bonus, and ends before the next column.
      const cells = [`${s.stats.hp} +30`, `${s.stats.mp} +20`, `${s.stats.atk} +20`];
      cells.forEach((v, i) => {
        const end = (STAT_COLS[i] as number) + STAT_VALUE_DX + v.length * 6 + 4;
        const next = i < 2 ? (STAT_COLS[i + 1] as number) : RIGHT + 1;
        assert.ok(end <= next, `${id} L${level}: "${v}" runs into the next column`);
      });
    }
    // The tab holds a face and the name in the tiny font, 4 px a letter, or the face alone once the names don't fit.
    if (TAB_NAMES) assert.ok(TAB_NAME_DX + HERO_DEFS[id].name.length * 4 - 1 <= TAB_W - 2, `${id}'s name fits its tab`);
    else assert.ok(TAB_W >= 11 + 4, `${id}'s face fits its tab`);
  }
});

test('there is a tab for every hero, side by side over the panel, and a point picks at most one', () => {
  assert.equal(TAB_COUNT, HERO_IDS.length);
  for (let i = 0; i < TAB_COUNT; i++) {
    const r = tabRect(i);
    assert.ok(r.x >= PANEL.x && r.x + r.w <= PANEL.x + PANEL.w, `tab ${i} sits over the panel`);
    assert.equal(tabAt({ x: r.x + r.w / 2, y: r.y + r.h / 2 }), i);
    if (i > 0) {
      const prev = tabRect(i - 1);
      assert.ok(prev.x + prev.w < r.x, 'a gap between tabs');
    }
  }
  assert.equal(tabAt(null), -1);
  assert.equal(tabAt({ x: 128, y: PANEL.y + 20 }), -1, 'the panel is not a tab');
  const back = backRect('ESC BACK');
  assert.ok(back.x + back.w <= 256 && back.x > 128, 'the back button sits at the bottom right');
});
