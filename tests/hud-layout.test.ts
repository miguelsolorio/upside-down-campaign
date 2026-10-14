// Where each hero sits in the HUD strip, and the click that picks one. Pure, so no canvas is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_H, SCREEN_W } from '../src/core/config.ts';
import { clientToGame } from '../src/core/pointer.ts';
import { BENCH_PITCH, CELL_H, METER_LEFT, MIDDLE_END, benchEnd, benchPitch, cycleHintX, slotAt, slotRects } from '../src/ui/hudlayout.ts';
import type { HeroId, PartyHud } from '../src/core/types.ts';

const IDS: HeroId[] = ['mike', 'dustin', 'lucas', 'eleven'];
function party(n: number, active = 0, ko: number[] = []): PartyHud[] {
  return IDS.slice(0, n).map((id, i) => ({
    id, name: id, level: 1, hp: 30, hpMax: 30, mp: 10, mpMax: 10, xp: 0, xpNext: 18, ko: ko.includes(i), active: i === active,
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
      assert.equal(r.w, BENCH_PITCH, 'every slot is as wide as a tag needs, whoever else is benched');
      assert.ok(r.x >= MIDDLE_END, `slot ${r.n} starts at ${r.x}, inside the quarters and Inspiration readout`);
      assert.ok(r.x + r.w <= METER_LEFT, `slot ${r.n} ends at ${r.x + r.w}, over the d20 meter`);
    }
    const last = bench[bench.length - 1] as { px: number };
    assert.equal(last.px + benchPitch(bench.length), benchEnd(bench.length), 'the last slot ends at the bench edge');
  }
});

test('a tag fits its slot: key, a 2 px gap and three letters at 6 px a glyph, with a gap before the next slot', () => {
  assert.ok(7 + 3 * 6 - 1 < BENCH_PITCH, 'key plus a three-letter name');
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

test('the swap hints flank a short bench, and are left out when three are benched', () => {
  assert.equal(cycleHintX(0), null);
  assert.equal(cycleHintX(3), null, 'no room beside three slots');
  for (const count of [1, 2]) {
    const h = cycleHintX(count);
    const first = slotRects(party(count + 1, 0)).filter((r) => !r.active)[0] as { px: number };
    assert.ok(h);
    assert.ok((h?.prev ?? 0) < first.px, 'the back hint ends before the first avatar');
    assert.ok((h?.prev ?? 0) - 11 >= MIDDLE_END, 'and starts clear of the readout, even for a two-letter pad label');
    assert.ok((h?.next ?? 0) >= benchEnd(count), 'the next hint starts after the last slot');
    assert.ok((h?.next ?? 0) + 11 <= METER_LEFT, 'and ends before the d20 meter, even for a two-letter pad label');
  }
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

test('a click on a portrait, mapped from page pixels, lands on the right hero', () => {
  const p = party(4, 0);
  const box = { left: 100, top: 50, width: SCREEN_W * 3, height: SCREEN_H * 3 };
  const target = slotRects(p).find((r) => r.index === 3) as { x: number; y: number; w: number; h: number };
  const [gx, gy] = center(target);
  const at = clientToGame(box.left + gx * 3, box.top + gy * 3, box);
  assert.ok(at);
  assert.equal(slotAt(p, at?.x ?? -1, at?.y ?? -1), 3);
});
