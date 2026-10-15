import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bulbCount, bulbDark, bulbFill, countUp, cycleShake, fadeLevel, foeLines, foeName, formatTime, hpBarColor, hpTone, isLowHp,
  MAX_BULBS, clickSegments, mpBar, notchFill, notchSpans, pagesOf, shakeLabel, stepVolume, typeCount, typeFrames, volSegments, wallLit, wantsBlip,
  XP_NOTCHES,
} from '../src/ui/format.ts';
import { wrapText } from '../src/core/text.ts';
import { HERO_DEFS } from '../src/heroes/defs.ts';
import { MP_BAR_W } from '../src/ui/hudlayout.ts';
import type { HeroId } from '../src/core/types.ts';

test('HP segments: one per 10 HP, rounded up, capped', () => {
  assert.equal(bulbCount(48), 5);
  assert.equal(bulbCount(50), 5);
  assert.equal(bulbCount(51), 6);
  assert.equal(bulbCount(0), 1);
  assert.equal(bulbCount(9999), MAX_BULBS);
});

test('segment fill: full, partial, empty, and a short last segment', () => {
  const n = bulbCount(48);
  const fills = (hp: number): number[] => Array.from({ length: n }, (_, i) => bulbFill(hp, 48, i, n));
  assert.deepEqual(fills(48), [1, 1, 1, 1, 1]);
  assert.deepEqual(fills(0), [0, 0, 0, 0, 0]);
  assert.deepEqual(fills(25), [1, 1, 0.5, 0, 0]);
  // The fifth segment only owns 8 HP, so 44 HP fills it halfway.
  assert.equal(bulbFill(44, 48, 4, n), 0.5);
  // Filled segments add up to the HP share, whatever the cap does.
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

test('the HP bar is green above half, yellow above 30%, and red from 30% down, where the blink starts', () => {
  assert.equal(hpTone(48, 48), 'leaf');
  assert.equal(hpTone(25, 48), 'leaf');
  assert.equal(hpTone(24, 48), 'yellow');
  assert.equal(hpTone(15, 48), 'yellow');
  assert.equal(hpTone(14, 48), 'hot');
  assert.equal(hpTone(0, 48), 'hot');
  assert.equal(hpTone(5, 0), 'hot');
  for (let hp = 0; hp <= 48; hp++) assert.equal(hpTone(hp, 48) === 'hot' && hp > 0, isLowHp(hp, 48), `hp ${hp}`);
});

test('the bar over a hero takes the HUD color, and blinks to dark red only where the HUD does', () => {
  assert.equal(hpBarColor(48, 48, 0, false), 'leaf');
  assert.equal(hpBarColor(20, 48, 0, false), 'yellow');
  let dark = 0;
  for (let t = 0; t < 600; t++) {
    const c = hpBarColor(10, 48, t, false);
    assert.equal(c, bulbDark(t, 0, true, false) ? 'blood1' : 'hot', `t ${t}`);
    if (c === 'blood1') dark++;
    assert.equal(hpBarColor(10, 48, t, true), 'hot', 'never dark when flashing is reduced');
    assert.equal(hpBarColor(40, 48, t, false), 'leaf', 'a healthy bar does not blink');
  }
  assert.ok(dark > 60 && dark < 180, `${dark} of 600 frames dark`);
});

test('XP notches tile the bar edge to edge with a 1 px gap, and a bar too narrow for ten gets fewer', () => {
  for (const w of [39, 47, 55, 71, 90]) {
    const s = notchSpans(w, XP_NOTCHES);
    assert.equal(s.length, XP_NOTCHES, `${w} px`);
    assert.equal(s[0]?.x, 0);
    for (let i = 1; i < s.length; i++) assert.equal((s[i]?.x ?? 0) - ((s[i - 1]?.x ?? 0) + (s[i - 1]?.w ?? 0)), 1, `a 1 px gap before notch ${i} at ${w} px`);
    const last = s[s.length - 1] as { x: number; w: number };
    assert.equal(last.x + last.w, w, `the last notch ends on the edge at ${w} px`);
    for (const n of s) assert.ok(n.w >= 1);
  }
  // The level 1 HP bar is five segments, 39 px: ten 3 px notches.
  assert.deepEqual(notchSpans(39, XP_NOTCHES).map((n) => n.w), Array(10).fill(3));
  const narrow = notchSpans(7, XP_NOTCHES);
  assert.ok(narrow.length < XP_NOTCHES && narrow.every((n) => n.w >= 1));
  assert.equal((narrow[narrow.length - 1]?.x ?? 0) + (narrow[narrow.length - 1]?.w ?? 0), 7);
});

test('XP notches fill left to right, and a full bar lights every notch', () => {
  const f = (frac: number): number[] => Array.from({ length: 10 }, (_, i) => Math.round(notchFill(frac, i, 10) * 100) / 100);
  assert.deepEqual(f(0), Array(10).fill(0));
  assert.deepEqual(f(1), Array(10).fill(1));
  assert.deepEqual(f(0.55), [1, 1, 1, 1, 1, 0.5, 0, 0, 0, 0]);
  assert.deepEqual(f(2), Array(10).fill(1), 'past full stays full');
  assert.deepEqual(f(-1), Array(10).fill(0));
});

test('the MP bar has one segment per cast, and a segment is ready only when it holds a whole cast', () => {
  // Mike at level 1: 16 MP and the DM screen costs 6. Three segments, and the third, 4 MP, is a short stub that is never a cast.
  const full = mpBar(24, 16, 16, 6);
  assert.equal(full.cells.length, 3);
  assert.deepEqual(full.cells.map((c) => c.ready), [true, true, false]);
  assert.ok((full.cells[2]?.w ?? 99) < (full.cells[0]?.w ?? 0), 'the stub is shorter');
  assert.deepEqual(full.ticks, []);
  // 9 MP is one cast and half of the next.
  const half = mpBar(24, 9, 16, 6);
  assert.deepEqual(half.cells.map((c) => c.fill), [1, 0.5, 0]);
  assert.deepEqual(half.cells.map((c) => c.ready), [true, false, false]);
  // 5 MP is not enough for any cast: the first segment is nearly full but not ready.
  const dry = mpBar(24, 5, 16, 6);
  assert.ok((dry.cells[0]?.fill ?? 0) > 0.8);
  assert.deepEqual(dry.cells.map((c) => c.ready), [false, false, false]);
  assert.deepEqual(mpBar(24, 0, 16, 6).cells.map((c) => c.fill), [0, 0, 0]);
});

test('with more casts than the bar has room for, MP is one bar with a tick at every cast', () => {
  // Eleven at level 12: 66 MP and Mind Blast costs 8, so 9 casts in 24 px.
  const b = mpBar(24, 20, 66, 8);
  assert.equal(b.cells.length, 1);
  assert.equal(b.cells[0]?.w, 24);
  assert.equal(b.cells[0]?.ready, true, '20 MP is two casts');
  assert.equal(mpBar(24, 7, 66, 8).cells[0]?.ready, false);
  assert.equal(b.ticks.length, 8, 'a tick between each pair of casts');
  for (let i = 0; i < b.ticks.length; i++) {
    assert.ok((b.ticks[i] as number) > 0 && (b.ticks[i] as number) < 24);
    if (i > 0) assert.ok((b.ticks[i] as number) > (b.ticks[i - 1] as number));
  }
});

test('the MP bar copes with no MP and a special that is free', () => {
  assert.deepEqual(mpBar(24, 0, 0, 6), { cells: [], ticks: [] });
  const free = mpBar(24, 5, 10, 0);
  assert.equal(free.cells.length, 1);
  assert.deepEqual(free.ticks, []);
  assert.equal(free.cells[0]?.fill, 0.5);
});

test('every hero at every level gets an MP bar that fits, shows its casts, and is bright only when it can cast', () => {
  const ids = Object.keys(HERO_DEFS) as HeroId[];
  for (const id of ids) {
    const d = HERO_DEFS[id];
    for (let level = 1; level <= 12; level++) {
      const mpMax = d.base.mp + Math.floor(d.growth.mp * (level - 1));
      const cost = d.special.mp;
      for (const mp of [0, cost - 1, cost, mpMax]) {
        const b = mpBar(MP_BAR_W, mp, mpMax, cost);
        for (const c of b.cells) assert.ok(c.x >= 0 && c.x + c.w <= MP_BAR_W, `${id} L${level} cell ${c.x}+${c.w} sticks out of ${MP_BAR_W} px`);
        const bright = b.cells.filter((c) => c.ready).length;
        if (b.cells.length > 1) assert.equal(bright, Math.floor(mp / cost), `${id} L${level} at ${mp} MP`);
        else {
          assert.equal(b.cells[0]?.ready, mp >= cost, `${id} L${level} at ${mp} MP, one bar`);
          assert.equal(b.ticks.length, Math.ceil(mpMax / cost) - 1, `${id} L${level}: a tick between each pair of casts`);
        }
      }
    }
  }
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

test('the foes row wraps a long mix and never runs past the panel', () => {
  const fit = 26;
  // Stage 1.3's mix used to draw as one 32 character line.
  assert.deepEqual(foeLines([['agent', 6], ['rat', 6], ['demogorgon', 1]], fit), ['AGENTS x6  RATS x6', 'DEMOGORGON x1']);
  assert.deepEqual(foeLines([['rat', 2]], fit), ['RATS x2']);
  assert.deepEqual(foeLines([], fit), []);
  // Stage 2.1 adds demodogs, vines and pods.
  const long = foeLines([['agent', 12], ['demodog', 14], ['vine', 9], ['pod', 8], ['demogorgon', 1]], fit);
  assert.ok(long.length > 1 && long.length <= 3);
  for (const line of long) assert.ok(line.length <= fit, `"${line}" is ${line.length} wide`);
  assert.equal(long.join(' ').split('x').length - 1, 5, 'all five kinds still show');
});

test('the foes row holds for any mix of kinds and counts, and falls back to a total when it needs too many lines', () => {
  const kinds = ['agent', 'rat', 'guard', 'warden', 'demogorgon', 'demodog', 'vine', 'pod'];
  for (let size = 1; size <= kinds.length; size++) {
    for (const n of [1, 9, 10, 99]) {
      const mix = kinds.slice(0, size).map((k): [string, number] => [k, n]);
      const lines = foeLines(mix, 26);
      assert.ok(lines.length >= 1 && lines.length <= 3, `${size} kinds at ${n}: ${lines.length} lines`);
      for (const line of lines) assert.ok(line.length <= 26, `"${line}" is ${line.length} wide`);
    }
  }
  assert.deepEqual(foeLines(kinds.map((k): [string, number] => [k, 99]), 26), ['TOTAL x792']);
  assert.deepEqual(foeLines([['agent', 6], ['rat', 6]], 8, 1), ['TOTAL x12']);
});

test('the foes row lays out from the final counts, so a count that climbs never reflows', () => {
  const mix: [string, number][] = [['agent', 12], ['rat', 14], ['demodog', 9], ['vine', 8]];
  const final = foeLines(mix, 26);
  for (const c of [0, 1, 5, 9, 12]) {
    const part = foeLines(mix, 26, 3, (n) => Math.min(n, c));
    assert.equal(part.length, final.length);
  }
  assert.deepEqual(foeLines([['agent', 6], ['rat', 6]], 26, 3, () => 0), ['AGENTS x0  RATS x0']);
  assert.equal(foeName('demodog'), 'DEMODOGS');
  assert.deepEqual(['melter', 'flayed', 'soldier', 'grigori', 'alpha'].map(foeName), ['MELTING RATS', 'FLAYED', 'SOLDIERS', 'GRIGORI', 'ALPHA']);
  assert.equal(foeName('mystery'), 'MYSTERYS');
});

test('a click on a volume bar lights up to that segment, and a click on the top lit one turns it down one', () => {
  assert.equal(clickSegments(3, 6), 7, 'up to a higher segment');
  assert.equal(clickSegments(7, 2), 3, 'down to a lower one');
  assert.equal(clickSegments(7, 6), 6, 'the top lit segment');
  assert.equal(clickSegments(1, 0), 0, 'so the first segment reaches zero');
  assert.equal(clickSegments(0, 0), 1);
  assert.equal(clickSegments(10, 9), 9);
  assert.equal(clickSegments(4, 12), 10, 'past the end is the last segment');
  assert.equal(clickSegments(4, -1), 1);
});
