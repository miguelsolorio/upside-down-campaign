import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bulbCount, bulbDark, bulbFill, countUp, cycleShake, fadeLevel, formatTime, isLowHp,
  MAX_BULBS, pagesOf, pipCount, shakeLabel, stepVolume, typeCount, typeFrames, volSegments, wallLit, wantsBlip,
} from '../src/ui/format.ts';
import { wrapText } from '../src/core/text.ts';

test('bulbs: one per 10 HP, rounded up, capped', () => {
  assert.equal(bulbCount(48), 5);
  assert.equal(bulbCount(50), 5);
  assert.equal(bulbCount(51), 6);
  assert.equal(bulbCount(0), 1);
  assert.equal(bulbCount(9999), MAX_BULBS);
});

test('bulb fill: full, partial, empty, and a short last bulb', () => {
  const n = bulbCount(48);
  const fills = (hp: number): number[] => Array.from({ length: n }, (_, i) => bulbFill(hp, 48, i, n));
  assert.deepEqual(fills(48), [1, 1, 1, 1, 1]);
  assert.deepEqual(fills(0), [0, 0, 0, 0, 0]);
  assert.deepEqual(fills(25), [1, 1, 0.5, 0, 0]);
  // The fifth bulb only owns 8 HP, so 44 HP lights it halfway.
  assert.equal(bulbFill(44, 48, 4, n), 0.5);
  // Lit bulbs add up to the HP share, whatever the cap does.
  const m = bulbCount(400);
  const lit = Array.from({ length: m }, (_, i) => bulbFill(200, 400, i, m)).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(lit - m / 2) < 1e-9);
});

test('low HP flickers, reduce flashing keeps it steady', () => {
  assert.equal(isLowHp(10, 48), true);
  assert.equal(isLowHp(30, 48), false);
  assert.equal(isLowHp(0, 48), false);
  let dark = 0;
  for (let t = 0; t < 600; t++) if (bulbDark(t, 2, true, false)) dark++;
  assert.ok(dark > 40 && dark < 300, `dark frames ${dark}`);
  for (let t = 0; t < 600; t++) assert.equal(bulbDark(t, 2, true, true), false);
  for (let t = 0; t < 600; t++) assert.equal(bulbDark(t, 2, false, false), false);
});

test('pips: any HP keeps one lit, full HP lights all', () => {
  assert.equal(pipCount(48, 48), 4);
  assert.equal(pipCount(24, 48), 2);
  assert.equal(pipCount(25, 48), 3);
  assert.equal(pipCount(1, 48), 1);
  assert.equal(pipCount(0, 48), 0);
});

test('time formats as m:ss from frames', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(59), '0:00');
  assert.equal(formatTime(60), '0:01');
  assert.equal(formatTime(60 * 65), '1:05');
  assert.equal(formatTime(60 * (125 * 60 + 7)), '125:07');
  assert.equal(formatTime(-5), '0:00');
});

test('count up reaches the target and holds', () => {
  assert.equal(countUp(100, 0, 10, 30), 0);
  assert.equal(countUp(100, 25, 10, 30), 50);
  assert.equal(countUp(100, 400, 10, 30), 100);
});

test('typewriter runs at 30 characters per second and blips every second character', () => {
  assert.equal(typeCount(0, 40), 0);
  assert.equal(typeCount(2, 40), 1);
  assert.equal(typeCount(60, 100), 30);
  assert.equal(typeCount(600, 40), 40);
  assert.equal(typeFrames(40), 80);
  assert.equal(typeCount(typeFrames(37), 37), 37);
  const text = 'Hi, Mike. Run.';
  let blips = 0;
  for (let n = 1; n <= text.length; n++) if (wantsBlip(n, text[n - 1] as string)) blips++;
  assert.ok(blips >= 5 && blips <= 7, `blips ${blips}`);
  assert.equal(wantsBlip(2, ' '), false);
  assert.equal(wantsBlip(3, 'a'), false);
});

test('long text pages in threes', () => {
  const lines = wrapText('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen');
  const pages = pagesOf(lines);
  assert.ok(pages.every((p) => p.length <= 3));
  assert.deepEqual(pages.flat(), lines);
  assert.deepEqual(pagesOf([]), [['']]);
});

test('fade runs in, holds, runs out', () => {
  assert.equal(fadeLevel(0, 40, 100, 40), 0);
  assert.equal(fadeLevel(20, 40, 100, 40), 0.5);
  assert.equal(fadeLevel(90, 40, 100, 40), 1);
  assert.equal(fadeLevel(160, 40, 100, 40), 0.5);
  assert.equal(fadeLevel(180, 40, 100, 40), 0);
  assert.equal(fadeLevel(999, 40, 100, 40), 0);
});

test('the title wall lights R, U and N one at a time, then together, then goes dark, and loops', () => {
  const seen = new Set<string>();
  for (let t = 0; t < 330; t++) seen.add(wallLit(t));
  assert.deepEqual([...seen].sort(), ['', 'N', 'R', 'RUN', 'U']);
  assert.equal(wallLit(60), 'R');
  assert.equal(wallLit(100), 'U');
  assert.equal(wallLit(140), 'N');
  assert.equal(wallLit(200), 'RUN');
  for (let t = 0; t < 330; t++) assert.equal(wallLit(t), wallLit(t + 330));
});

test('settings steps stay in range', () => {
  assert.equal(stepVolume(0.7, 1), 0.8);
  assert.equal(stepVolume(0.8, 1), 0.9);
  assert.equal(stepVolume(1, 1), 1);
  assert.equal(stepVolume(0, -1), 0);
  assert.equal(volSegments(0.7), 7);
  assert.equal(cycleShake(1, 1), 0);
  assert.equal(cycleShake(0, -1), 1);
  assert.equal(cycleShake(0.5, 1), 1);
  assert.equal(cycleShake(0.4, 1), 1);
  assert.deepEqual([0, 0.5, 1].map(shakeLabel), ['OFF', 'HALF', 'FULL']);
});
