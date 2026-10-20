// Where each hero sits in the HUD strip, and the click that picks one. Pure, so no canvas is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_H, SCREEN_W } from '../src/core/config.ts';
import { clientToGame, hitIndex, inRect } from '../src/core/pointer.ts';
import { TINY_GLYPHS } from '../src/gfx/data/font.ts';
import { CONTENT_DY, BENCH_END, BENCH_FACE_DX, BENCH_PITCH, BENCH_START, BENCH_W, CAPTION_Y, CELL_H, CLUSTER_END, COIN_W, COIN_X, CRIT_W, CRIT_X, INSPIRE_X, LEFT_X, MP_BAR_W, MP_X, STASH_CELL_GAP, STASH_ICON_W, STASH_X, STASH_Y, STRIP_W, VALUE_H, VALUE_Y, XP_H, XP_W, XP_Y, benchPitch, hudBand, leftShift, levelDx, levelRect, onLevel, rightShift, slotAt, slotRects, stashCells } from '../src/ui/hudlayout.ts';
import { STASH_ART } from '../src/ui/hudstash.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { XP_NOTCHES, notchSpans } from '../src/ui/format.ts';
import type { HeroId, PartyHud } from '../src/core/types.ts';

const IDS: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven'];
function party(n: number, active = 0, ko: number[] = []): PartyHud[] {
  return IDS.slice(0, n).map((id, i) => ({
    id, name: id, level: 1, hp: 30, hpMax: 30, mp: 10, mpMax: 10, mpCost: 5, xp: 0, xpNext: 18, ko: ko.includes(i), active: i === active,
  }));
}
const center = (r: { x: number; y: number; w: number; h: number }): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

test('every hero gets one rectangle, the active one first, numbered by party slot', () => {
  for (let n = 1; n <= 4; n++) {
    for (let active = 0; active < n; active++) {
      const rects = slotRects(party(n, active));
      assert.equal(rects.length, n);
      assert.equal(rects[0]?.active, true);
      assert.equal(rects[0]?.index, active);
      assert.deepEqual(rects.map((r) => r.n).sort(), Array.from({ length: n }, (_, i) => i + 1), 'keys 1 to n, each once');
      for (const r of rects) assert.equal(r.n, r.index + 1, 'the key number follows the hero, not the bench position');
    }
  }
});

test('bench slots sit left to right in party order, clear of the MP, coin and Crit columns', () => {
  for (let n = 2; n <= 4; n++) {
    const bench = slotRects(party(n, 1)).filter((r) => !r.active);
    assert.equal(bench.length, n - 1);
    for (let i = 1; i < bench.length; i++) assert.ok((bench[i] as { px: number }).px > (bench[i - 1] as { px: number }).px);
    bench.forEach((r, k) => {
      assert.equal(r.y, 0);
      assert.equal(r.h, CELL_H);
      assert.equal(r.w, BENCH_PITCH, 'every slot is the same width, whoever else is benched');
      assert.equal(r.px, r.x + BENCH_FACE_DX, 'the face sits after the key');
      assert.equal(r.x, BENCH_START + k * BENCH_PITCH, 'the slots sit in fixed places, so nobody moves when the party grows');
      assert.ok(r.x > CLUSTER_END, `slot ${r.n} starts at ${r.x}, inside the Crit column that ends at ${CLUSTER_END}`);
      assert.ok(r.x + r.w <= BENCH_END, `slot ${r.n} ends at ${r.x + r.w}, past the bench`);
    });
  }
  assert.equal(BENCH_START + BENCH_W, BENCH_END, 'three slots fill the bench');
  assert.equal(BENCH_PITCH * 3, BENCH_W);
});

test('a bench slot holds its key and face with room before the next slot\'s key', () => {
  // 2 px of padding, a 3 px key, a 2 px gap and the 11 px face.
  const pad = 2;
  assert.equal(BENCH_FACE_DX, pad + 3 + 2);
  const end = BENCH_FACE_DX + 11;
  const air = BENCH_PITCH + pad - end;
  assert.ok(end <= BENCH_PITCH && air >= 4, `the face ends at ${end}, leaving ${air} px before the next key`);
});

test('MP, the coins and Crit are three columns, each a tiny caption over a value, in that order, with room between', () => {
  for (const ch of 'MPCOINSRT') assert.ok(TINY_GLYPHS[ch], `the tiny font has ${ch}`);
  const caption = (text: string): number => text.length * 4 - 1;
  const mpEnd = MP_X + MP_BAR_W, coinEnd = COIN_X + COIN_W;
  assert.ok(MP_X + caption('MP') <= mpEnd, 'the MP caption sits over the bar');
  assert.ok(COIN_X >= mpEnd + 6, `the coins start ${COIN_X - mpEnd} px after the MP bar`);
  assert.ok(COIN_X + caption('COINS') <= coinEnd, 'the COINS caption sits over the coin and its count');
  assert.ok(CRIT_X >= coinEnd + 6, `Crit starts ${CRIT_X - coinEnd} px after "x99"`);
  assert.equal(CRIT_W, caption('CRIT'));
  assert.ok(CRIT_X + 8 <= CRIT_X + CRIT_W + 1, 'the 8 px die fits under its caption');
  assert.ok(CLUSTER_END < BENCH_START, 'the bench starts after the Crit column');
  assert.ok(BENCH_START - CLUSTER_END >= 6, 'with room between');
  assert.ok(CAPTION_Y + 5 < VALUE_Y, 'the 5 px captions end above the value row');
  assert.ok(VALUE_Y + VALUE_H <= 15, 'the value row ends inside the portrait\'s height');
});

test('the tiny font has every letter and digit, in 3 columns by 5 rows', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?') {
    const rows = (TINY_GLYPHS[ch] ?? '').split('/');
    assert.equal(rows.length, 5, `${ch} has five rows`);
    for (const r of rows) assert.match(r, /^[.#]{3}$/, `${ch} rows are three columns`);
  }
});

test('the active hero\'s panel never collides, for every hero up to level 12 and 99 quarters', () => {
  // The Inspiration timer takes the coin caption's place: the d20, a gap and "20S" in 6 px glyphs.
  assert.ok(INSPIRE_X + 10 + '20S'.length * 6 - 1 < CRIT_X, 'the Inspiration timer ends before the Crit column');
  assert.equal(COIN_W, 9 + 'x99'.length * 6 - 1, 'the coin count has room for two digits');
  for (const d of Object.values(HERO_DEFS)) {
    // The name, a gap, and the level in 6 px glyphs, 5 px of ink in the last one. The XP notches under it are no wider.
    const nameRowEnd = LEFT_X + d.name.length * 6 + 6 + 'LV12'.length * 6 - 1;
    assert.ok(nameRowEnd < MP_X - 6, `${d.name} at level 12 runs to ${nameRowEnd}, into the MP column at ${MP_X}`);
  }
  assert.ok(LEFT_X + XP_W < MP_X - 6, 'the XP notches end before the MP column');
  assert.ok(XP_Y + XP_H <= 15, 'and inside the portrait\'s height');
  assert.equal(notchSpans(XP_W, XP_NOTCHES).length, XP_NOTCHES, 'the XP row has room for all ten notches');
});

test('bench cells do not overlap, so one click picks one hero', () => {
  const bench = slotRects(party(4, 0)).filter((r) => !r.active);
  for (let i = 1; i < bench.length; i++) {
    const a = bench[i - 1] as { x: number; w: number }, b = bench[i] as { x: number };
    assert.ok(a.x + a.w <= b.x, 'no overlap');
  }
});

test('a click on a bench portrait gives that hero\'s party index', () => {
  for (let n = 2; n <= 4; n++) {
    for (let active = 0; active < n; active++) {
      const p = party(n, active);
      for (const r of slotRects(p)) {
        const [cx, cy] = center(r);
        assert.equal(slotAt(p, cx, cy), r.active ? -1 : r.index, `n=${n} active=${active} hero ${r.index}`);
      }
    }
  }
});

test('clicks on the active hero, a KO\'d hero or empty space swap nothing', () => {
  const p = party(4, 0, [2]);
  const [kx, ky] = center(slotRects(p).find((r) => r.index === 2) as never);
  assert.equal(slotAt(p, kx, ky), -1, 'KO\'d');
  assert.equal(slotAt(p, 5, 5), -1, 'the active portrait');
  assert.equal(slotAt(p, 100, 10), -1, 'the middle of the strip');
  assert.equal(slotAt(p, 130, 100), -1, 'the world below the strip');
  assert.equal(slotAt(p, -1, 5), -1);
  assert.equal(slotAt(party(1), 200, 10), -1, 'a lone hero has nobody to swap to');
});

test('pointer positions scale from the page to the 256 by 224 game, at any canvas size', () => {
  for (const scale of [1, 2, 3, 4.5, 0.75]) {
    const box = { left: 40, top: 12, width: SCREEN_W * scale, height: SCREEN_H * scale };
    const mid = clientToGame(box.left + box.width / 2, box.top + box.height / 2, box);
    assert.ok(mid && Math.abs(mid.x - SCREEN_W / 2) < 1e-9 && Math.abs(mid.y - SCREEN_H / 2) < 1e-9, `scale ${scale}`);
    const corner = clientToGame(box.left + 10 * scale, box.top + 5 * scale, box);
    assert.ok(corner && Math.abs(corner.x - 10) < 1e-9 && Math.abs(corner.y - 5) < 1e-9);
  }
});

test('a pointer outside the canvas, or on a canvas with no size, is not over the game', () => {
  const box = { left: 0, top: 0, width: 512, height: 448 };
  assert.equal(clientToGame(-1, 10, box), null);
  assert.equal(clientToGame(10, -1, box), null);
  assert.equal(clientToGame(512, 10, box), null);
  assert.equal(clientToGame(10, 448, box), null);
  assert.equal(clientToGame(5, 5, { left: 0, top: 0, width: 0, height: 0 }), null);
  assert.deepEqual(clientToGame(511.9, 447.9, box) !== null, true);
});

test('a box holds its top left edge but not its bottom right one, and the first box holding a point wins', () => {
  const r = { x: 10, y: 20, w: 30, h: 11 };
  assert.ok(inRect({ x: 10, y: 20 }, r));
  assert.ok(inRect({ x: 39.9, y: 30.9 }, r));
  assert.ok(!inRect({ x: 40, y: 25 }, r));
  assert.ok(!inRect({ x: 20, y: 31 }, r));
  assert.ok(!inRect({ x: 9.9, y: 25 }, r));
  // Menu rows meet with no gap, so a point on the line between two belongs to the lower one.
  const rows = [{ x: 0, y: 0, w: 50, h: 11 }, { x: 0, y: 11, w: 50, h: 11 }, null, { x: 0, y: 33, w: 50, h: 11 }];
  assert.equal(hitIndex(rows, { x: 5, y: 10.9 }), 0);
  assert.equal(hitIndex(rows, { x: 5, y: 11 }), 1);
  assert.equal(hitIndex(rows, { x: 5, y: 25 }), -1, 'a missing box never matches');
  assert.equal(hitIndex(rows, { x: 5, y: 40 }), 3);
  assert.equal(hitIndex(rows, { x: 60, y: 5 }), -1);
  assert.equal(hitIndex(rows, null), -1);
  assert.equal(hitIndex([], { x: 0, y: 0 }), -1);
});

test('a click on a portrait, mapped from page pixels, lands on the right hero', () => {
  const p = party(4, 0);
  const box = { left: 100, top: 50, width: SCREEN_W * 3, height: SCREEN_H * 3 };
  const target = slotRects(p).find((r) => r.index === 3) as { x: number; y: number; w: number; h: number };
  const [gx, gy] = center(target);
  const at = clientToGame(box.left + gx * 3, box.top + gy * 3, box);
  assert.ok(at);
  assert.equal(slotAt(p, at?.x ?? -1, at?.y ?? -1), 3);
});

test('on a wide screen the active hero hugs the band\'s left edge and the meter and bench its right edge, and clicks follow', () => {
  for (const band of [{ x: 50, w: 436, top: 3, h: 26 }, { x: 6, w: 388, top: 3, h: 26 }, { x: 4, w: 256, top: 3, h: 26 }, { x: 0, w: 256, top: 0, h: 20 }]) {
    const lx = leftShift(band), rx = rightShift(band);
    for (let n = 1; n <= 4; n++) {
      for (let active = 0; active < n; active++) {
        const p = party(n, active);
        const rects = slotRects(p, band);
        const me = rects.find((r) => r.active);
        assert.equal(me?.x, band.x, 'the active cell starts at the band');
        for (const r of rects) assert.ok(r.y === 0 && r.h === band.h, 'a click cell spans the whole strip');
        const bench = rects.filter((r) => !r.active);
        const first = bench[0];
        if (first) assert.equal(first.x, BENCH_START + rx, 'the bench starts at its fixed place');
        for (const r of bench) {
          assert.ok(r.x >= CLUSTER_END + lx, `band ${band.x},${band.w}: the bench clears the columns`);
          assert.ok(r.x + r.w <= BENCH_END + rx, 'the bench stays inside the band');
          const [cx, cy] = center(r);
          assert.equal(slotAt(p, cx, cy, band), r.index);
        }
      }
    }
  }
});

test('at 256 the band only moves the contents down to center them', () => {
  assert.deepEqual(hudBand(), { x: 0, w: STRIP_W, top: CONTENT_DY, h: CELL_H });
  // The contents ink 16 rows. Above them and above the 2 row border, the gaps match.
  const above = hudBand().top, below = CELL_H - 2 - (above + 16);
  assert.equal(above, below);
  assert.equal(leftShift(hudBand()), 0);
  assert.equal(rightShift(hudBand()), 0);
});

test('the active hero\'s name and level are one button, over the text and clear of the portrait, the MP column and the XP notches', () => {
  const bands = [{ x: 0, w: 256, top: 0, h: 20 }, { x: 50, w: 436, top: 3, h: 26 }];
  for (const band of bands) {
    for (const d of Object.values(HERO_DEFS)) {
      for (const level of [1, 9, 12]) {
        const p = party(4, 1).map((m) => (m.active ? { ...m, name: d.name, level } : m));
        const r = levelRect(p, band);
        assert.ok(r, 'there is an active hero');
        if (!r) continue;
        const lx = leftShift(band);
        const textEnd = lx + LEFT_X + levelDx(d.name) + `LV${level}`.length * 6 - 1;
        assert.ok(r.x < lx + LEFT_X && r.x + r.w > textEnd, `${d.name} L${level}: the box covers the name and level`);
        assert.ok(r.x + r.w <= lx + MP_X, `${d.name} L${level}: the box ends before the MP column`);
        assert.ok(r.x >= lx + 20, 'the box starts past the portrait cell');
        assert.equal(r.y, band.top, 'the box starts at the top of the contents');
        assert.ok(r.y + r.h <= band.top + XP_Y, 'and stops above the XP notches');
        // The text sits 1 px down from the band's top, so its middle is on the button.
        assert.ok(onLevel(p, lx + LEFT_X + 2, band.top + 4, band));
        assert.ok(onLevel(p, textEnd, band.top + 4, band));
        assert.ok(!onLevel(p, lx + LEFT_X + 2, band.top + XP_Y + 2, band), 'the XP notches are not the button');
        assert.ok(!onLevel(p, lx + 5, band.top + 5, band), 'the portrait is not the button');
        for (const s of slotRects(p, band).filter((m) => !m.active)) {
          assert.ok(s.x >= r.x + r.w, 'no bench cell overlaps it, so one click does one thing');
        }
      }
    }
  }
  assert.equal(levelRect([]), null, 'no party, no button');
  assert.ok(!onLevel([], 30, 4));
});

test('Erica\'s stash rides the MP column\'s caption row: past the MP caption, inside the bar\'s width, clear of the coins and the bench', () => {
  const mpCaption = 'MP'.length * 4 - 1;
  assert.ok(STASH_X >= MP_X + mpCaption + 2, 'at least 2 px past the MP caption');
  assert.equal(STASH_Y, CAPTION_Y, 'on the caption row');
  const cell = (item: 'eggo' | 'coke'): number => STASH_ICON_W[item] + 1 + 3 + STASH_CELL_GAP;
  // Both items, three of each: the widest it gets.
  const both = stashCells({ eggo: 3, coke: 3 });
  assert.deepEqual(both.map((c) => [c.item, c.x, c.count]), [['eggo', STASH_X, 3], ['coke', STASH_X + cell('eggo'), 3]]);
  const last = both[1] as { x: number };
  const end = last.x + STASH_ICON_W.coke + 1 + 3;
  assert.ok(end <= MP_X + MP_BAR_W, `the stash ends at ${end}, past the MP bar's end at ${MP_X + MP_BAR_W}`);
  assert.ok(end + 6 <= COIN_X, 'and six px short of the coins');
  assert.ok(end < BENCH_START - 40, 'nowhere near the bench');
  assert.ok(STASH_Y + 5 < VALUE_Y, 'the 5 px icons end above the value row, so they never touch the MP bar');
  for (const d of '0123456789') assert.ok(TINY_GLYPHS[d], `the tiny font has ${d}`);
});

test('the stash shows only what the party carries, and the second item slides left into a gap', () => {
  assert.deepEqual(stashCells({ eggo: 0, coke: 0 }), [], 'an empty stash draws nothing');
  assert.deepEqual(stashCells(undefined), []);
  assert.deepEqual(stashCells({ eggo: 2, coke: 0 }).map((c) => [c.item, c.x, c.count]), [['eggo', STASH_X, 2]]);
  assert.deepEqual(stashCells({ eggo: 0, coke: 1 }).map((c) => [c.item, c.x, c.count]), [['coke', STASH_X, 1]]);
  assert.deepEqual(stashCells({ eggo: 12, coke: -2 }).map((c) => c.count), [9], 'a count is one digit, and never negative');
});

test('the mini icons are as wide as the layout says and as tall as the caption row', () => {
  for (const item of ['eggo', 'coke'] as const) {
    const art = STASH_ART[item];
    assert.equal(art.rows.length, 5, `${item} is 5 px tall`);
    for (const row of art.rows) {
      assert.equal(row.length, STASH_ICON_W[item], `${item} rows are ${STASH_ICON_W[item]} wide`);
      for (const ch of row) assert.ok(ch === '.' || art.map[ch], `${item} uses only colors it names`);
    }
  }
});
