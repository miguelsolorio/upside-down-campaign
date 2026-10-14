// Where each hero sits in the HUD strip, and the click that picks one. Pure, so no canvas is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_H, SCREEN_W } from '../src/core/config.ts';
import { clientToGame, hitIndex, inRect } from '../src/core/pointer.ts';
import { TINY_GLYPHS } from '../src/gfx/data/font.ts';
import { BENCH_END, BENCH_FACE_DX, BENCH_PITCH, CELL_H, LEFT_W, LEFT_X, METER_LEFT, MIDDLE_END, MIDDLE_X, MP_BAR_W, MP_BAR_X, MP_LABEL_X, STRIP_W, benchPitch, hudBand, leftShift, rightShift, slotAt, slotRects } from '../src/ui/hudlayout.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { bulbCount } from '../src/ui/format.ts';
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

test('bench slots sit left to right in party order, clear of the middle readout and the d20 meter', () => {
  for (let n = 2; n <= 4; n++) {
    const bench = slotRects(party(n, 1)).filter((r) => !r.active);
    assert.equal(bench.length, n - 1);
    for (let i = 1; i < bench.length; i++) assert.ok((bench[i] as { px: number }).px > (bench[i - 1] as { px: number }).px);
    for (const r of bench) {
      assert.equal(r.y, 0);
      assert.equal(r.h, CELL_H);
      assert.equal(r.w, BENCH_PITCH, 'every slot is the same width, whoever else is benched');
      assert.equal(r.px, r.x + BENCH_FACE_DX, 'the face sits after the key');
      assert.ok(r.x >= MIDDLE_END, `slot ${r.n} starts at ${r.x}, inside the quarters and Inspiration readout`);
      assert.ok(r.x + r.w <= METER_LEFT, `slot ${r.n} ends at ${r.x + r.w}, over the d20 meter`);
    }
    const last = bench[bench.length - 1] as { x: number };
    assert.equal(last.x + benchPitch(bench.length), BENCH_END, 'the last slot ends against the d20 meter, however many are benched');
  }
});

test('a bench slot holds its key, face and HP bar with room before the next slot\'s key', () => {
  // 2 px of padding, a 3 px key, a 2 px gap, the 11 px face, a 2 px gap and the 3 px bar.
  const pad = 2;
  assert.equal(BENCH_FACE_DX, pad + 3 + 2);
  const end = BENCH_FACE_DX + 11 + 2 + 3;
  const air = BENCH_PITCH + pad - end;
  assert.ok(end <= BENCH_PITCH && air >= 4, `the bar ends at ${end}, leaving ${air} px before the next key`);
});

test('the tiny font has every letter and digit, in 3 columns by 5 rows', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?') {
    const rows = (TINY_GLYPHS[ch] ?? '').split('/');
    assert.equal(rows.length, 5, `${ch} has five rows`);
    for (const r of rows) assert.match(r, /^[.#]{3}$/, `${ch} rows are three columns`);
  }
});

test('the active hero\'s panel never collides, for every hero up to level 12 and 99 quarters', () => {
  assert.ok(TINY_GLYPHS.M && TINY_GLYPHS.P, 'the tiny font has the MP label');
  const labelEnd = MP_LABEL_X + 2 * 4 - 1;
  assert.ok(labelEnd < MP_BAR_X, 'the MP label ends before its bar');
  assert.ok(MP_BAR_X + MP_BAR_W <= MIDDLE_X, 'the MP bar ends before the quarters');
  // The quarter counter is the coin, a gap, and "x99" in 6 px glyphs.
  assert.ok(MIDDLE_X + 9 + 'x99'.length * 6 - 1 <= MIDDLE_END, 'two digits of quarters fit before the bench');
  for (const d of Object.values(HERO_DEFS)) {
    // The name, a gap, and the level in 6 px glyphs, 5 px of ink in the last one.
    const nameRowEnd = LEFT_X + d.name.length * 6 + 6 + 'LV12'.length * 6 - 1;
    assert.ok(nameRowEnd < MP_LABEL_X, `${d.name} at level 12 runs to ${nameRowEnd}, into the MP label at ${MP_LABEL_X}`);
    for (let level = 1; level <= 12; level++) {
      const hpMax = d.base.hp + Math.floor(d.growth.hp * (level - 1));
      const n = bulbCount(hpMax);
      const pitch = Math.max(6, Math.min(8, Math.floor(LEFT_W / n)));
      const hpEnd = LEFT_X + n * pitch - 1;
      assert.ok(hpEnd < MIDDLE_X, `${d.name} L${level} HP bar and the XP notches under it end at ${hpEnd}, into the quarters`);
    }
  }
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

test('on a wide screen the active hero hugs the band\'s left edge and the bench its right edge, and clicks follow', () => {
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
        const last = bench[bench.length - 1];
        if (last) assert.equal(last.x + last.w, BENCH_END + rx, 'the bench ends against the d20');
        for (const r of bench) {
          assert.ok(r.x >= MIDDLE_END + lx, `band ${band.x},${band.w}: the bench clears the middle`);
          assert.ok(r.x + r.w <= METER_LEFT + rx, 'the bench clears the d20');
          const [cx, cy] = center(r);
          assert.equal(slotAt(p, cx, cy, band), r.index);
        }
      }
    }
  }
});

test('at 256 the band changes nothing', () => {
  assert.deepEqual(hudBand(), { x: 0, w: STRIP_W, top: 0, h: CELL_H });
  assert.equal(leftShift(hudBand()), 0);
  assert.equal(rightShift(hudBand()), 0);
});
