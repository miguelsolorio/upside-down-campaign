// The UI of chapter 4 (docs/level-10.md, docs/level-11.md, docs/map-screen.md): the picks panel with ten and eleven heroes, the HUD with
// one hero, the curse's pips and Max's Walkman on their slots, the character sheet's eleven tabs, and the chapter four card and the 4.2
// results title. The layouts are checked as rectangles (nothing overlaps, everything is inside the frame) and the pieces by the pixels
// they put down on the software canvas, so import canvas-helpers first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCanvas, cols, ctxOf, rows, screen } from './canvas-helpers.ts';
import type { Rect } from '../src/core/pointer.ts';
import type { HeroId, HudView, PartyHud } from '../src/core/types.ts';
import type { Game } from '../src/core/scene.ts';
import { CHAR_NAMES, STRIP_H } from '../src/core/config.ts';
import { CHAPTERS, STAGE_ORDER, chapterOf, closesChapter, levelNumber, nextStage } from '../src/core/campaign.ts';
import { hasEmDash } from '../src/core/text.ts';
import { px32 } from '../src/gfx/canvas.ts';
import type { ColorName } from '../src/gfx/palette.ts';
import { GLYPHS, TINY_GLYPHS } from '../src/gfx/data/font.ts';
import { textWidth, tinyWidth } from '../src/gfx/index.ts';
import { BAND_Y, TOP_H } from '../src/gfx/map_geo.ts';
import { HERO_DEFS, HERO_IDS } from '../src/heroes/defs.ts';
import { BONDS } from '../src/heroes/bonds.ts';
import { SHEET_NOTE_MAX, heroSheet } from '../src/heroes/charsheet.ts';
import { emptyStats, xpToNext } from '../src/progression/index.ts';
import { MAX_LEVEL } from '../src/progression/xp.ts';
import { createPicksPanel } from '../src/ui/picks.ts';
import { createPicks, rowOf } from '../src/ui/picks_logic.ts';
import { COLS_WIDE, LOCK_W, MAX_POOL, bondTag, cardRect, cellRect, markRect, markWidth, picksLayout } from '../src/ui/picks_layout.ts';
import type { PicksLayout } from '../src/ui/picks_layout.ts';
import { drawHud } from '../src/ui/hud.ts';
import { ACTIVE_KEY_X, BENCH_FACE_DX, BENCH_START, CURSE_H, CURSE_PIPS, CURSE_PIP_GAP, CURSE_PIP_H, CURSE_PIP_W, FACE_Y, KEY_DX, LEFT_X, TAPE_ACTIVE_Y, TAPE_BENCH_Y, TAPE_H, TAPE_MARK_DY, TAPE_W, XP_Y, cursePipsDx, showsKeys, slotAt, slotRects, tapeSpot } from '../src/ui/hudlayout.ts';
import { CURSE_FRAME, PIP_SOUNDED, PIP_WAITING, cursePips, tapeLook, tapePixels } from '../src/ui/hudcurse.ts';
import { createCharSheetScene } from '../src/ui/charsheet.ts';
import type { CharSheetHero } from '../src/ui/charsheet.ts';
import { FOOT_Y, MOVES_Y, MOVE_PITCH, NOTE_DY, PANEL, TAB_COUNT, TAB_W, tabAt, tabRect } from '../src/ui/charsheetlayout.ts';
import { createChapterCard } from '../src/ui/cards.ts';
import { createResultsScene } from '../src/ui/results.ts';
import { TITLE_SCALE, foeLines, foeName, resultsTitle, titleSpan } from '../src/ui/format.ts';

// The fake canvas has no clip, which the portraits in the strip and the sheet's tabs use, so give it one: a rectangle that later fills stay inside.
interface ClipCtx { sc: number; tx: number; ty: number; clipRect?: number[]; pathRect?: number[]; clipStack?: (number[] | undefined)[]; raw(x: number, y: number, v: number): void; save(): void; restore(): void }
const proto = Object.getPrototypeOf(ctxOf(screen(1, 1))) as Record<string, unknown> & ClipCtx;
const rawFill = proto.raw, rawSave = proto.save, rawRestore = proto.restore;
Object.assign(proto, {
  beginPath(this: ClipCtx) { this.pathRect = undefined; },
  rect(this: ClipCtx, x: number, y: number, w: number, h: number) { this.pathRect = [x * this.sc + this.tx, y * this.sc + this.ty, w * this.sc, h * this.sc]; },
  clip(this: ClipCtx) { this.clipRect = this.pathRect; },
  raw(this: ClipCtx, x: number, y: number, v: number) {
    const c = this.clipRect;
    if (c && (x < (c[0] as number) || y < (c[1] as number) || x >= (c[0] as number) + (c[2] as number) || y >= (c[1] as number) + (c[3] as number))) return;
    rawFill.call(this, x, y, v);
  },
  save(this: ClipCtx) { (this.clipStack ??= []).push(this.clipRect); rawSave.call(this); },
  restore(this: ClipCtx) { rawRestore.call(this); this.clipRect = (this.clipStack ??= []).pop(); },
});

const rectIn = (r: Rect, outer: Rect): boolean => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
const touches = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const FRAME: Rect = { x: 0, y: 0, w: 256, h: 224 };
const pixel = (c: FakeCanvas, x: number, y: number): number => c.px[y * c.w + x] as number;
const isColor = (c: FakeCanvas, x: number, y: number, color: ColorName): boolean => pixel(c, x, y) === px32(color);
const bbox = (c: FakeCanvas): Rect => { const [x0, x1] = cols(c), [y0, y1] = rows(c); return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
/** The box round every pixel that isn't the screen's own background, for a screen that paints one. */
function inkBox(c: FakeCanvas, bg: ColorName): Rect {
  const lo = [c.w, c.h], hi = [-1, -1];
  c.px.forEach((v, i) => {
    if (v === 0 || v === px32(bg)) return;
    const p = [i % c.w, (i / c.w) | 0];
    for (const k of [0, 1]) { lo[k] = Math.min(lo[k] as number, p[k] as number); hi[k] = Math.max(hi[k] as number, p[k] as number); }
  });
  return { x: lo[0] as number, y: lo[1] as number, w: (hi[0] as number) - (lo[0] as number) + 1, h: (hi[1] as number) - (lo[1] as number) + 1 };
}
const idle = { input: { pressed: () => false, clicked: () => null, hover: () => null, moved: () => false, point() {}, offer() {}, device: () => 'keyboard' } } as unknown as Game;

// ---------------------------------------------------------------- picks: ten, eleven and twelve heroes
/** The parts of a card as the rectangles they cover, from the card's top left, for the widest thing each can say. */
function parts(l: PicksLayout, id: HeroId, o: { slot: number; locked: boolean; gate: string; bond: string }): Record<string, Rect> {
  const k = l.card;
  const out: Record<string, Rect> = {
    face: { x: k.face.x, y: k.face.y, w: 24, h: 24 },
    name: { x: k.name.x, y: k.name.y, w: textWidth(CHAR_NAMES[id].toUpperCase()), h: 7 },
    level: { x: k.level.x, y: k.level.y, w: textWidth(`LV${MAX_LEVEL}`), h: 7 },
  };
  if (o.gate) out.gate = { x: k.gate.x, y: k.gate.y, w: tinyWidth(o.gate), h: 5 };
  if (o.slot > 0) out.mark = { x: k.mark.x, y: k.mark.y - (o.locked ? 1 : 0), w: markWidth(o.slot, o.locked), h: o.locked ? 6 : 5 };
  const tag = bondTag(l, o);
  if (tag) out.bond = { x: k.bond.x - tinyWidth(tag), y: k.bond.y, w: tinyWidth(tag), h: 5 };
  return out;
}

test('ten, eleven and twelve are four across and three down, on narrow cards, inside the panel and clear of the strip and the band', () => {
  assert.equal(MAX_POOL, 12);
  assert.equal(COLS_WIDE, 4);
  for (const n of [10, 11, 12]) {
    const l = picksLayout(n);
    assert.equal(l.cols, 4, `${n} heroes`);
    assert.equal(l.rows, 3);
    assert.ok(l.panel.y >= TOP_H + 2 && l.panel.y + l.panel.h <= BAND_Y - 2, `${n}: the panel runs ${l.panel.y} to ${l.panel.y + l.panel.h}, with a margin under the strip and over the band`);
    assert.ok(rectIn(l.panel, FRAME));
    assert.ok(rectIn(l.start, l.panel));
    // Four cards and the gaps between them fill the panel's width with the same margin either side, give or take a pixel.
    const first = cardRect(l, 0), last = cardRect(l, 3);
    const left = first.x - l.panel.x, right = l.panel.x + l.panel.w - (last.x + last.w);
    assert.ok(Math.abs(left - right) <= 1 && left >= 6, `${n}: margins ${left} and ${right}`);
    for (let i = 0; i < n; i++) {
      const c = cardRect(l, i);
      assert.ok(rectIn({ x: c.x - 3, y: c.y - 3, w: c.w + 6, h: c.h + 6 }, { x: l.panel.x + 1, y: l.panel.y + 13, w: l.panel.w - 2, h: l.start.y - l.panel.y - 13 }), `card ${i} and its cursor corners sit between the heading and START`);
      for (let j = i + 1; j < n; j++) assert.ok(!touches(c, cardRect(l, j)), `cards ${i} and ${j} do not overlap`);
    }
  }
});

test('on every card layout the face, name, level, gate word, mark and bond tag sit inside the card and never touch, for every hero', () => {
  const tags = [...BONDS.map((b) => b.tag), '2 BONDS', '3 BONDS'];
  for (const n of [6, 9, 10, 11, 12]) {
    const l = picksLayout(n);
    const card: Rect = { x: 1, y: 1, w: l.cw - 2, h: l.ch - 2 };
    for (const id of HERO_IDS) {
      for (const gate of ['', 'DASH', 'SMASH', 'RIFF', 'SHOOT', 'SHOOT BURN']) {
        for (const [slot, locked] of [[0, false], [1, false], [2, true], [4, true]] as const) {
          for (const bond of ['', ...tags]) {
            const found = parts(l, id, { slot, locked, gate, bond: slot > 0 ? bond : '' });
            const names = Object.keys(found);
            for (const a of names) {
              assert.ok(rectIn(found[a] as Rect, card), `${n} heroes, ${id} ${gate} ${bond}: the ${a} runs out of the card`);
              for (const b of names) if (a < b) assert.ok(!touches(found[a] as Rect, found[b] as Rect), `${n} heroes, ${id} ${gate} ${slot} ${bond}: the ${a} and the ${b} meet`);
            }
          }
        }
      }
    }
  }
});

test('the mark cell of a card is inside it and clear of the face, so a click on a face picks and a click on the mark leads', () => {
  for (const n of [6, 9, 10, 11]) {
    const l = picksLayout(n);
    for (let i = 0; i < n; i++) {
      const c = cardRect(l, i), m = markRect(l, i);
      assert.ok(rectIn(m, c), `${n}: card ${i}'s mark cell is inside it`);
      const face: Rect = { x: c.x + l.card.face.x, y: c.y + l.card.face.y, w: 24, h: 24 };
      assert.ok(!touches(m, { x: face.x + 2, y: face.y + 2, w: 20, h: 20 }), `${n}: the mark cell stays off the face`);
    }
  }
});

test('four across the mouse still lands on one card, the cells meet, and START is below them all', () => {
  for (const n of [10, 11, 12]) {
    const l = picksLayout(n);
    const cells = Array.from({ length: n }, (_, i) => cellRect(l, i));
    for (let i = 0; i < n; i++) {
      const c = cardRect(l, i);
      const hits = cells.map((r, k) => (c.x + c.w / 2 >= r.x && c.x + c.w / 2 < r.x + r.w && c.y + c.h / 2 >= r.y && c.y + c.h / 2 < r.y + r.h ? k : -1)).filter((k) => k >= 0);
      assert.deepEqual(hits, [i], `${n}: the middle of card ${i}`);
    }
    for (let i = 0; i + 1 < n; i++) {
      if ((i + 1) % 4 === 0) continue;
      const a = cellRect(l, i), b = cellRect(l, i + 1);
      assert.equal(a.x + a.w, b.x, 'neighbours meet with no gap');
    }
    assert.ok(cells.every((r) => r.y + r.h <= l.start.y + 3), 'no cell reaches into START');
  }
});

/** Draws the panel for the first `n` of the 4.2 pool and Hopper onto an empty frame: six, nine, ten (with Eddie) or eleven. */
function drawPicks(n: number): { c: FakeCanvas; l: PicksLayout } {
  const ids: HeroId[] = ['mike', 'dustin', 'lucas', 'will', 'eleven', 'max', 'steve', 'robin', 'nancy', 'eddie', 'hopper'];
  const heroes = ids.slice(0, n).map((id, i) => ({ id, level: 4 + (i % 9) }));
  const panel = createPicksPanel({ pool: heroes, locked: ['eddie'], seed: ['mike', 'dustin', 'robin', 'eddie'], onStart() {}, onBack() {} });
  const c = screen(256, 224);
  panel.draw(ctxOf(c));
  return { c, l: picksLayout(n) };
}

test('the picks panel draws inside its own box for six, nine, ten and eleven, between the map\'s strip and its party band', () => {
  for (const n of [6, 9, 10, 11]) {
    const { c, l } = drawPicks(n);
    const b = bbox(c);
    assert.ok(rectIn(b, l.panel), `${n}: the ink covers ${JSON.stringify(b)}, past the panel ${JSON.stringify(l.panel)}`);
    assert.ok(b.y >= TOP_H && b.y + b.h <= BAND_Y);
    assert.deepEqual(b, l.panel, `${n}: and the panel's own edge is the most it covers`);
  }
});

test('Eddie\'s card says RIFF and a padlock, Hopper\'s SMASH, and the four-across card prints the level beside the face', () => {
  const s = createPicks([{ id: 'mike', level: 8 }, { id: 'eddie', level: 5 }, { id: 'hopper', level: 6 }], ['eddie'], ['mike', 'eddie']);
  assert.equal(rowOf(s, 1).gate, 'RIFF');
  assert.equal(rowOf(s, 1).locked, true);
  assert.equal(rowOf(s, 2).gate, 'SMASH');
  const l = picksLayout(10);
  assert.ok(l.card.level.x >= l.card.face.x + 24 + 2, 'the level starts right of the face');
  assert.ok(l.card.name.y >= l.card.face.y + 24, 'the name sits under the face');
  assert.ok(l.card.gate.y >= l.card.name.y + 7, 'and the gate word under the name');
  assert.ok(LOCK_W === 5 && markWidth(2, true) === tinyWidth('2') + 3 + LOCK_W);
});

// ---------------------------------------------------------------- the HUD with one hero
const hero = (id: HeroId, o: Partial<PartyHud> = {}): PartyHud => ({
  id, name: CHAR_NAMES[id].toUpperCase(), level: 6, hp: 50, hpMax: 60, mp: 10, mpMax: 14, mpCost: 8, xp: 20, xpNext: 60, ko: false, active: false, ...o,
});
const hudOf = (party: PartyHud[], walkman: HudView['walkman'] = null): HudView => ({
  party, burst: 0.3, burstReady: false, quarters: 12, inspiration: 0, swapReady: 1, boss: null, ward: null, stash: { eggo: 0, coke: 0 }, solo: null, walkman,
});
const strip = (hud: HudView, device: 'keyboard' | 'gamepad' = 'keyboard'): FakeCanvas => {
  const c = screen(256, 24);
  drawHud(ctxOf(c), hud, 0, { device });
  return c;
};
/** True when every pixel of the box is the strip's own ink. */
const clear = (c: FakeCanvas, r: Rect): boolean => {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!isColor(c, x, y, 'ink')) return false;
  return true;
};

test('a hero alone has his portrait, name, level and bars, no bench and no swap key, and nothing to click', () => {
  const lone = [hero('hopper', { active: true })];
  assert.deepEqual(slotRects(lone).map((r) => r.active), [true]);
  assert.equal(showsKeys(lone), false, 'no key: nobody to swap to');
  assert.equal(showsKeys(lone, 'gamepad'), false);
  assert.equal(showsKeys([hero('hopper', { active: true }), hero('mike')]), true, 'two heroes have keys on a keyboard');
  assert.equal(showsKeys([hero('hopper', { active: true }), hero('mike')], 'touch'), false, 'and none on a touch screen');
  for (const [x, y] of [[5, 5], [30, 5], [BENCH_START + 5, 8], [200, 8], [250, 8]] as const) assert.equal(slotAt(lone, x, y), -1);
  const c = strip(hudOf(lone));
  // The key's place beside the portrait, and the whole bench's, are bare strip.
  assert.ok(clear(c, { x: ACTIVE_KEY_X, y: 0, w: LEFT_X - ACTIVE_KEY_X - 1, h: 9 }), 'no key by the portrait');
  assert.ok(clear(c, { x: BENCH_START - 4, y: 0, w: 256 - BENCH_START + 4, h: STRIP_H - 2 }), 'nothing where the bench goes');
  // He is there: the amber frame, and ink-free pixels in the name row and the XP row.
  assert.ok(isColor(c, 1, 5, 'amber'), 'the active frame');
  assert.ok(!clear(c, { x: LEFT_X, y: 1, w: 40, h: 7 }), 'his name');
  assert.ok(!clear(c, { x: LEFT_X, y: XP_Y, w: 60, h: 5 }), 'his XP notches');
});

test('with company the key is there again, on the active hero and on each bench slot', () => {
  const party = [hero('mike', { active: true }), hero('dustin'), hero('lucas')];
  const c = strip(hudOf(party));
  assert.ok(!clear(c, { x: ACTIVE_KEY_X, y: 1, w: 5, h: 7 }), 'the active key');
  for (const r of slotRects(party).filter((s) => !s.active)) assert.ok(!clear(c, { x: r.x + KEY_DX, y: FACE_Y + 3, w: 3, h: 5 }), `slot ${r.n}'s key`);
  const pad = strip(hudOf(party), 'gamepad');
  assert.ok(clear(pad, { x: ACTIVE_KEY_X, y: 1, w: 5, h: 7 }), 'a controller prints no keys');
});

// ---------------------------------------------------------------- the curse on the HUD
test('a cursed hero has four pips, the chimes sounded lit and the rest dim, and none when not cursed', () => {
  assert.equal(cursePips(undefined), null);
  assert.equal(cursePips(0), null);
  assert.deepEqual(cursePips(1), [true, false, false, false]);
  assert.deepEqual(cursePips(2), [true, true, false, false]);
  assert.deepEqual(cursePips(3), [true, true, true, false]);
  assert.deepEqual(cursePips(4), [true, true, true, true], 'the fourth chime is the KO, but a late read still draws four');
  assert.deepEqual(cursePips(9), [true, true, true, true]);
  assert.equal(cursePips(Number.NaN), null);
  assert.equal(CURSE_PIPS, 4);
});

test('the pips are a column as tall as the face, in the key\'s place, clear of the face on a bench slot and of the name on the active one', () => {
  assert.equal(CURSE_H, 11, 'as tall as the 11 px face');
  assert.equal(CURSE_H, CURSE_PIPS * CURSE_PIP_H + (CURSE_PIPS - 1) * CURSE_PIP_GAP);
  assert.ok(KEY_DX + CURSE_PIP_W + 2 <= BENCH_FACE_DX, 'two px between the pips and the face');
  assert.ok(ACTIVE_KEY_X + CURSE_PIP_W < LEFT_X, 'and between the active pips and the name');
  assert.ok(ACTIVE_KEY_X > 17, 'clear of the portrait frame');
  assert.equal(cursePipsDx(false), KEY_DX);
  assert.equal(cursePipsDx(true), ACTIVE_KEY_X);
  assert.ok(FACE_Y + CURSE_H <= STRIP_H - 2, 'inside the strip');
});

test('a cursed bench slot: the face is framed red, the sounded pips are red, the rest dim, and nobody can swap to it', () => {
  const party = [hero('mike', { active: true }), hero('dustin', { curse: 2 }), hero('lucas'), hero('will', { curse: 3 })];
  const c = strip(hudOf(party));
  const rects = slotRects(party);
  const dustin = rects.find((r) => r.index === 1) as (typeof rects)[number];
  assert.equal(dustin.cursed, true);
  assert.equal(rects.find((r) => r.index === 2)?.cursed, false);
  const x = dustin.x + KEY_DX;
  for (let i = 0; i < CURSE_PIPS; i++) {
    const y = FACE_Y + i * (CURSE_PIP_H + CURSE_PIP_GAP), want: ColorName = i < 2 ? PIP_SOUNDED : PIP_WAITING;
    for (let dy = 0; dy < CURSE_PIP_H; dy++) for (let dx = 0; dx < CURSE_PIP_W; dx++) assert.ok(isColor(c, x + dx, y + dy, want), `dustin's pip ${i} at ${dx},${dy}`);
    if (i > 0) assert.ok(isColor(c, x + 1, y - 1, 'ink'), 'a pixel of strip between pips');
  }
  assert.ok(isColor(c, dustin.px, FACE_Y + 5, CURSE_FRAME), 'the red frame');
  assert.ok(isColor(c, dustin.px + 10, FACE_Y + 5, CURSE_FRAME));
  // The slot of a hero with three chimes sounded has three lit pips.
  const will = rects.find((r) => r.index === 3) as (typeof rects)[number];
  assert.ok(isColor(c, will.x + KEY_DX, FACE_Y + 2 * 3, PIP_SOUNDED) && isColor(c, will.x + KEY_DX, FACE_Y + 3 * 3, PIP_WAITING));
  // A cursed hero can't be swapped to, however it is clicked or hovered.
  for (const r of [dustin, will]) assert.equal(slotAt(party, r.x + 5, 8), -1);
  assert.equal(slotAt(party, (rects.find((r) => r.index === 2) as (typeof rects)[number]).x + 5, 8), 2, 'a clean bench slot still is');
});

test('a cursed active hero shows the pips where the key was, and no key', () => {
  const party = [hero('dustin', { active: true, curse: 1 }), hero('mike'), hero('lucas')];
  const c = strip(hudOf(party));
  assert.equal(slotRects(party)[0]?.cursed, true);
  assert.ok(isColor(c, 1, 5, CURSE_FRAME), 'the portrait is framed red, not amber');
  assert.ok(isColor(c, ACTIVE_KEY_X + 1, FACE_Y, PIP_SOUNDED), 'one chime sounded');
  assert.ok(isColor(c, ACTIVE_KEY_X + 1, FACE_Y + 3, PIP_WAITING));
  assert.ok(clear(c, { x: ACTIVE_KEY_X + CURSE_PIP_W, y: 0, w: LEFT_X - ACTIVE_KEY_X - CURSE_PIP_W - 1, h: 9 }), 'nothing between the pips and the name');
});

// ---------------------------------------------------------------- Max's Walkman
test('the tape reads dim while it recharges, lit once ready, and carries a mark while it protects', () => {
  const dim = tapeLook({ ready: 0.4, on: 0 });
  assert.deepEqual(dim, { ready: false, fill: 1, on: false, dead: false });
  assert.equal(tapeLook({ ready: 0.999, on: 0 }).ready, false, 'under 1 is still recharging');
  assert.equal(tapeLook({ ready: 0.999, on: 0 }).fill, 3, 'and its label is not quite full');
  assert.deepEqual(tapeLook({ ready: 1, on: 0 }), { ready: true, fill: 3, on: false, dead: false });
  assert.equal(tapeLook({ ready: 0, on: 1 }).on, true, 'on above 0 is protecting, even a frame from the end');
  assert.equal(tapeLook({ ready: 1, on: 0 }).on, false);
  assert.equal(tapeLook({ ready: Number.NaN, on: 0 }).ready, false);
  const fills = [0, 0.1, 0.3, 0.5, 0.74, 0.76, 0.9].map((ready) => tapeLook({ ready, on: 0 }).fill);
  assert.deepEqual(fills, [...fills].sort(), 'the label fills as it recharges');
  const px = (k: Parameters<typeof tapePixels>[0]): (ColorName | null)[][] => tapePixels(k);
  for (const look of [dim, tapeLook({ ready: 1, on: 0 }), tapeLook({ ready: 0, on: 5 }), tapeLook({ ready: 1, on: 0 }, true)]) {
    const rowsOf = px(look);
    assert.equal(rowsOf.length, TAPE_H);
    for (const r of rowsOf) assert.equal(r.length, TAPE_W);
  }
  const lit = px(tapeLook({ ready: 1, on: 0 })), off = px(dim), on = px(tapeLook({ ready: 0.2, on: 100 })), dead = px(tapeLook({ ready: 1, on: 0 }, true));
  assert.equal(lit[0]?.[0], 'bone');
  assert.equal(off[0]?.[0], 'slate');
  assert.equal(lit[1]?.[1], 'yellow');
  assert.deepEqual(off[1]?.slice(1, 5), ['mist', 'dusk', 'dusk', 'dusk'], 'a quarter of the label is filled at 0.4');
  assert.deepEqual(on[1]?.slice(1, 5), ['leaf', 'leaf', 'leaf', 'leaf'], 'protecting turns the label green');
  assert.equal(dead[0]?.[0], 'dusk', 'Max down: grey');
  assert.ok(off.flat().every((c) => c !== 'bone' && c !== 'yellow'), 'dim has none of the lit colors');
});

test('the tape sits in free room: under the key beside the face on the bench, under the key level with the XP notches on the active slot', () => {
  const bench = tapeSpot(false), act = tapeSpot(true);
  assert.deepEqual(bench, { dx: 0, y: TAPE_BENCH_Y });
  assert.deepEqual(act, { dx: ACTIVE_KEY_X, y: TAPE_ACTIVE_Y });
  const tape = (s: { dx: number; y: number }): Rect => ({ x: s.dx, y: s.y, w: TAPE_W, h: TAPE_H });
  const mark = (s: { dx: number; y: number }): Rect => ({ x: s.dx, y: s.y + TAPE_MARK_DY, w: TAPE_W, h: 1 });
  // Bench: the 3 by 5 key at KEY_DX, FACE_Y + 3, and the 11 px face frame at BENCH_FACE_DX.
  const key: Rect = { x: KEY_DX, y: FACE_Y + 3, w: 3, h: 5 }, face: Rect = { x: BENCH_FACE_DX, y: FACE_Y, w: 11, h: 11 };
  for (const part of [key, face]) assert.ok(!touches(tape(bench), part) && !touches(mark(bench), part), 'the bench tape clears the key and the face');
  assert.ok(tape(bench).y >= key.y + key.h + 1, 'with a pixel under the key');
  assert.ok(tape(bench).x + TAPE_W < face.x, 'and a pixel before the face');
  assert.ok(tape(bench).x >= 0, 'inside its own slot, and clear of the slot before it');
  // Active: the 5 by 7 key at ACTIVE_KEY_X, row 1, the portrait frame (1 to 16), and the XP notches from LEFT_X.
  const akey: Rect = { x: ACTIVE_KEY_X, y: 1, w: 5, h: 7 }, portrait: Rect = { x: 1, y: 0, w: 16, h: 16 }, xp: Rect = { x: LEFT_X, y: XP_Y, w: 62, h: 5 };
  for (const part of [akey, portrait, xp]) assert.ok(!touches(tape(act), part) && !touches(mark(act), part), 'the active tape clears the key, the portrait and the notches');
  assert.ok(tape(act).x + TAPE_W < LEFT_X, 'a pixel before the notches');
  // Both fit in the strip's 18 rows above its border.
  assert.ok(mark(bench).y + 1 <= STRIP_H - 2 && mark(act).y + 1 <= STRIP_H - 2);
});

test('Max\'s slot carries the tape in its state, and nobody else\'s does', () => {
  const party = (walk: HudView['walkman']): [HudView, ReturnType<typeof slotRects>] => {
    const p = [hero('mike', { active: true }), hero('max'), hero('dustin'), hero('eddie')];
    return [hudOf(p, walk), slotRects(p)];
  };
  const read = (walk: HudView['walkman'], who: HeroId): { body: boolean; label: boolean; mark: boolean; ink: boolean } => {
    const [hud, rects] = party(walk);
    const r = rects.find((s) => hud.party[s.index]?.id === who) as (typeof rects)[number];
    const c = strip(hud), at = tapeSpot(false), x = r.x + at.dx;
    return {
      body: isColor(c, x, at.y, 'slate'), label: isColor(c, x + 1, at.y + 1, 'yellow'), mark: isColor(c, x, at.y + TAPE_MARK_DY, 'leaf'), ink: isColor(c, x, at.y, 'ink'),
    };
  };
  assert.deepEqual(read({ ready: 0.5, on: 0 }, 'max'), { body: true, label: false, mark: false, ink: false }, 'recharging: dim, no mark');
  assert.deepEqual(read({ ready: 1, on: 0 }, 'max'), { body: false, label: true, mark: false, ink: false }, 'ready: lit');
  assert.deepEqual(read({ ready: 0.2, on: 200 }, 'max'), { body: true, label: false, mark: true, ink: false }, 'protecting: the mark under it');
  assert.equal(read(null, 'max').ink, true, 'no Walkman, no tape');
  assert.equal(read({ ready: 1, on: 0 }, 'dustin').ink, true, 'Dustin carries nothing');
  assert.equal(read({ ready: 1, on: 0 }, 'eddie').ink, true);
});

test('Max active carries the tape under her key, lit, dim and marked, and drawn grey when she is down', () => {
  const party = (o: Partial<PartyHud>): PartyHud[] => [hero('max', { active: true, ...o }), hero('mike'), hero('dustin')];
  const c = (walk: HudView['walkman'], o: Partial<PartyHud> = {}): FakeCanvas => strip(hudOf(party(o), walk));
  const x = tapeSpot(true).dx, y = TAPE_ACTIVE_Y;
  assert.ok(isColor(c({ ready: 1, on: 0 }), x, y, 'bone'));
  assert.ok(isColor(c({ ready: 0.3, on: 0 }), x, y, 'slate'));
  assert.ok(isColor(c({ ready: 0.3, on: 60 }), x, y + TAPE_MARK_DY, 'leaf'));
  assert.ok(isColor(c({ ready: 1, on: 0 }, { ko: true }), x, y, 'dusk'));
  assert.ok(clear(c(null), { x, y, w: TAPE_W, h: TAPE_H }), 'no Walkman: bare strip');
});

// ---------------------------------------------------------------- the character sheet with eleven heroes
test('the sheet has a tab for each of the eleven heroes, Hopper\'s and Eddie\'s last, side by side inside the panel with room to click', () => {
  assert.equal(HERO_IDS.length, 11);
  assert.equal(TAB_COUNT, 11);
  assert.deepEqual(HERO_IDS.slice(-2), ['hopper', 'eddie']);
  assert.ok(TAB_W >= 11 + 4, `a tab is ${TAB_W} px wide, enough for the 11 px face and a pixel of frame each side`);
  for (let i = 0; i < TAB_COUNT; i++) {
    const r = tabRect(i);
    assert.ok(rectIn(r, { x: PANEL.x, y: 0, w: PANEL.w, h: PANEL.y }), `tab ${i} sits over the panel`);
    assert.equal(tabAt({ x: r.x + 1, y: r.y + 1 }), i);
    assert.equal(tabAt({ x: r.x + r.w - 1, y: r.y + r.h - 1 }), i);
    if (i > 0) assert.ok(r.x - (tabRect(i - 1).x + tabRect(i - 1).w) >= 2, 'a gap of at least 2 px between tabs, so a click is never between two');
  }
  assert.equal(tabAt({ x: tabRect(9).x + TAB_W + 1, y: tabRect(9).y + 5 }), -1, 'the gap is no tab');
});

test('Hopper\'s and Eddie\'s pages have the six rows, each inside the panel and above the footer, at every level', () => {
  for (const id of ['hopper', 'eddie'] as const) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const s = heroSheet(id, level);
      assert.deepEqual(s.moves.map((m) => m.kind), ['basic', 'special', 'crit', 'talent', 'talent', 'talent'], `${id} L${level}`);
      for (const m of s.moves) assert.ok(m.note.length <= SHEET_NOTE_MAX, `${id} ${m.name}: "${m.note}"`);
    }
    assert.equal(heroSheet(id, 1).role, HERO_DEFS[id].role);
  }
  const lastNoteBottom = MOVES_Y + 5 * MOVE_PITCH + NOTE_DY + 7;
  assert.ok(lastNoteBottom <= PANEL.y + PANEL.h - 4, 'the sixth row ends inside the panel');
  assert.ok(lastNoteBottom < FOOT_Y, 'and above the footer');
});

/** Draws the sheet on `id`'s page with these heroes in the party. */
function drawSheet(id: HeroId, party: HeroId[], level = 7): FakeCanvas {
  const heroes = HERO_IDS.map((h): CharSheetHero => {
    const slot = party.indexOf(h);
    return slot < 0
      ? { id: h, level: 1, xp: 0, xpNext: xpToNext(1), bonus: emptyStats(), joined: false, active: false, slot: -1 }
      : { id: h, level, xp: 30, xpNext: xpToNext(level), bonus: emptyStats(), joined: true, active: slot === 0, slot };
  });
  const scene = createCharSheetScene({ heroes: () => heroes, start: id, onBack() {} });
  scene.enter?.(idle);
  const c = screen(300, 260);
  scene.draw(ctxOf(c));
  return c;
}

test('the sheet draws Hopper\'s and Eddie\'s pages inside the frame, with their own tab lit', () => {
  for (const [id, tab] of [['hopper', 9], ['eddie', 10]] as const) {
    const c = drawSheet(id, ['hopper', 'eddie', 'mike', 'dustin']);
    assert.deepEqual(bbox(c), FRAME, `${id}: the page paints the frame and nothing past it`);
    const r = tabRect(tab);
    assert.ok(isColor(c, r.x + 5, r.y, 'yellow'), `${id}'s tab has the lit frame`);
    assert.ok(isColor(c, tabRect(tab - 1).x + 5, tabRect(tab - 1).y, 'dusk') || tab === 10, 'and its neighbour does not');
  }
  const grey = drawSheet('hopper', ['mike', 'dustin', 'lucas', 'max']);
  assert.deepEqual(bbox(grey), FRAME, 'a hero who isn\'t in the party reads too');
});

// ---------------------------------------------------------------- the chapter four card and the 4.2 results
const wordsOk = (text: string): void => {
  for (const ch of text.toUpperCase()) assert.ok(ch === ' ' || GLYPHS[ch] || TINY_GLYPHS[ch], `the font has "${ch}"`);
};

test('the chapter four card says CHAPTER FOUR and HELLFIRE, and both fit the 256 px frame with the rule between them', () => {
  const card = CHAPTERS[4] as { title: string; subtitle: string };
  assert.equal(card.title.toUpperCase(), 'CHAPTER FOUR');
  assert.equal(card.subtitle.toUpperCase(), 'HELLFIRE');
  wordsOk(card.title);
  wordsOk(card.subtitle);
  assert.ok(!hasEmDash(card.title) && !hasEmDash(card.subtitle));
  const [left, right] = titleSpan(card.title, 256);
  assert.ok(left >= 8 && 256 - right >= 8 && Math.abs(left - (256 - right)) <= 2, `the title spans ${left} to ${right}, centered, with a margin of 8 px or more`);
  assert.ok(textWidth(card.subtitle) <= 96, 'the subtitle fits under the 96 px rule');
  assert.equal(chapterOf('4.1'), 4);
  // It is the card the first visit to 4.1 shows, and only that: 4.2 opens no chapter.
  assert.equal(STAGE_ORDER.filter((id) => chapterOf(id) === 4).length, 2);
  // Drawn at full fade, it stays inside the frame.
  const scene = createChapterCard({ ...card, onDone() {} });
  for (let i = 0; i < 80; i++) scene.update(idle);
  const c = screen(256, 224);
  scene.draw(ctxOf(c));
  const b = inkBox(c, 'black');
  assert.ok(b.x >= 8 && b.x + b.w <= 248, `the card's ink runs ${b.x} to ${b.x + b.w}`);
  assert.ok(b.y >= 80 && b.y + b.h <= 140, 'and sits in the middle of the screen');
});

test('stage 4.2 ends the build: END OF LEVEL 11 under the feedback note, not CHAPTER FOUR CLEAR, and the title fits', () => {
  const id = '4.2';
  assert.equal(levelNumber(id), 11);
  assert.equal(nextStage(id), null);
  assert.equal(closesChapter(id), false, 'chapter four has two more stages to come');
  const title = resultsTitle({ chapter: closesChapter(id) ? chapterOf(id) : undefined, final: nextStage(id) === null, level: levelNumber(id) });
  assert.equal(title, 'END OF LEVEL 11');
  const [left, right] = titleSpan(title, 256);
  assert.ok(left >= 8 && 256 - right >= 8 && Math.abs(left - (256 - right)) <= 2, `${title} spans ${left} to ${right}, centered`);
  assert.equal(TITLE_SCALE, 2);
  assert.ok(textWidth('This is a feedback build. More soon.') <= 240, 'the note fits too');
  // The whole screen with a party of four, long foes row and level-ups: nothing runs out of the frame.
  const stats = {
    frames: 60 * 410, kills: 25, killsByKind: { ghoul: 24 }, xpEarned: 540, quarters: 12,
    levelUps: [{ hero: 'mike', from: 8, to: 9 }, { hero: 'eddie', from: 5, to: 6 }],
  };
  const party = [{ id: 'mike', level: 9, xp: 0, hp: 40, hpMax: 60 }, { id: 'dustin', level: 7, xp: 0, hp: 30, hpMax: 60 }, { id: 'robin', level: 5, xp: 0, hp: 0, hpMax: 60 }, { id: 'eddie', level: 6, xp: 0, hp: 20, hpMax: 40 }];
  const scene = createResultsScene({ stats, party, level: 11, final: true, onContinue() {} } as never);
  for (let i = 0; i < 400; i++) scene.update(idle);
  const c = screen(256, 224);
  scene.draw(ctxOf(c));
  const b = inkBox(c, 'ink');
  assert.ok(b.x >= 8 && b.x + b.w <= 248 && b.y >= 8 && b.y + b.h <= 216, `the results ink runs ${JSON.stringify(b)}`);
});

test('the foes row names the chapter 4 foes in words, not as a kind with an S', () => {
  const said = Object.fromEntries(['kguard', 'kbaton', 'pitdemo', 'ghoul'].map((k) => [k, foeName(k)]));
  assert.deepEqual(said, { kguard: 'CAMP GUARDS', kbaton: 'BATON GUARDS', pitdemo: 'DEMOGORGON', ghoul: 'GHOULS' });
  assert.equal(foeName('mystery'), 'MYSTERYS', 'a kind nobody named still gets an S');
  // 4.1's mix and 4.2's wrap inside the panel's 26 characters a line, in three lines or fewer.
  for (const mix of [[['kguard', 12], ['kbaton', 9], ['pitdemo', 1]], [['ghoul', 24]]] as [string, number][][]) {
    const lines = foeLines(mix, 26);
    assert.ok(lines.length >= 1 && lines.length <= 3, `${lines.join(' / ')}`);
    for (const l of lines) assert.ok(l.length <= 26, `"${l}" is too wide`);
  }
});
