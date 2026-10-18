// The end of chapter 3 (docs/level-9.md, "The chapter end"): the epilogue's wiring and timeline, the room still it plays over,
// and the CHAPTER n CLEAR titles on the results screen. Imports only what runs without a canvas, and draws the still onto a
// recording context instead of a real one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_ORDER, chapterOf, closesChapter, levelNumber, nextStage } from '../src/core/campaign.ts';
import { SCREEN_H } from '../src/core/config.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { PAL } from '../src/gfx/palette.ts';
import { drawEpilogueRoom } from '../src/gfx/epilogue_room.ts';
import type { Sky } from '../src/gfx/epilogue_room.ts';
import { textWidth } from '../src/gfx/font.ts';
import { EPILOGUES, SKY_AT, STEPS, blackAt, hasEpilogue, skyAt } from '../src/story/epilogue.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { TITLE_SCALE, endsCampaign, resultsTitle, titleSpan } from '../src/ui/format.ts';

// ---------------------------------------------------------------- wiring
test('chapter three ends on Hopper\'s letter, chapter five on the basement, and no other chapter has an epilogue', () => {
  assert.deepEqual(EPILOGUES, { 3: 'l9_letter', 5: 'l16_basement' });
  assert.equal(hasEpilogue(1), false);
  assert.equal(hasEpilogue(2), false);
  assert.equal(hasEpilogue(3), true);
  assert.equal(hasEpilogue(4), false);
  assert.equal(hasEpilogue(5), true);
});

test('the epilogue is for the chapter the last stage closes, and plays only with words in its script', () => {
  const last = STAGE_ORDER[STAGE_ORDER.length - 1] as string;
  assert.equal(closesChapter(last), true);
  assert.equal(EPILOGUES[chapterOf(last)], 'l9_letter');
  // World fills the letter in. Until then the chapter goes straight to its results, as flow.ts expects.
  assert.equal(hasEpilogue(3), (SCRIPTS['l9_letter']?.lines.length ?? 0) > 0);
});

test('when the letter is written, it fits the dialogue box and has no em dash', () => {
  for (const line of SCRIPTS['l9_letter']?.lines ?? []) {
    assert.ok(fitsBox(line.text), `fits 3 rows of 32: ${line.text}`);
    assert.equal(hasEmDash(line.text), false, line.text);
  }
});

// ---------------------------------------------------------------- timeline
test('the scene is a slow fade up, a beat, the letter, a beat and a slow fade down', () => {
  assert.deepEqual(STEPS.map((s) => s.id), ['fadeIn', 'hold', 'talk', 'rest', 'fadeOut']);
  const len = (id: string): number => (STEPS.find((s) => s.id === id) as { len: number }).len;
  assert.ok(len('fadeIn') >= 90 && len('fadeOut') >= 90, 'each fade is a second and a half or more');
  assert.equal(len('talk'), 0, 'the letter lasts as long as the reading does');
  for (const s of STEPS) if (s.id !== 'talk') assert.ok(s.len > 0 && Number.isInteger(s.len), s.id);
});

test('black runs from solid to clear through the fade in, stays clear while she reads, and goes solid through the fade out', () => {
  const fadeIn = STEPS[0] as { id: 'fadeIn'; len: number };
  const fadeOut = STEPS[STEPS.length - 1] as { id: 'fadeOut'; len: number };
  assert.equal(blackAt('fadeIn', 0, fadeIn.len), 1);
  assert.equal(blackAt('fadeIn', fadeIn.len, fadeIn.len), 0);
  assert.equal(blackAt('fadeOut', 0, fadeOut.len), 0);
  assert.equal(blackAt('fadeOut', fadeOut.len, fadeOut.len), 1);
  let was = 1;
  for (let t = 0; t <= fadeIn.len; t++) { const b = blackAt('fadeIn', t, fadeIn.len); assert.ok(b <= was); was = b; }
  was = 0;
  for (let t = 0; t <= fadeOut.len; t++) { const b = blackAt('fadeOut', t, fadeOut.len); assert.ok(b >= was); was = b; }
  for (const id of ['hold', 'talk', 'rest'] as const) assert.equal(blackAt(id, 10, 40), 0, id);
  assert.equal(blackAt('fadeIn', -5, 100), 1, 'before the step, still black');
  assert.equal(blackAt('fadeOut', 999, 100), 1, 'past the step, still black');
});

test('the night in the window only ever pales: dark, then grey, then the first color', () => {
  assert.equal(skyAt(0), 0);
  assert.equal(skyAt(SKY_AT[1] - 1), 0);
  assert.equal(skyAt(SKY_AT[1]), 1);
  assert.equal(skyAt(SKY_AT[2] - 1), 1);
  assert.equal(skyAt(SKY_AT[2]), 2);
  assert.equal(skyAt(1e6), 2);
  let was = 0;
  for (let c = 0; c < SKY_AT[2] + 100; c += 7) { const s = skyAt(c); assert.ok(s >= was); was = s; }
});

// ---------------------------------------------------------------- the still
const HEX = new Map<string, string>(Object.entries(PAL).map(([name, hex]) => [hex, name]));

/** A context that only keeps the rectangles filled: their palette name, and the pixels, as the still would paint them. */
function paint(sky: Sky, screenW: number): { names: (string | null)[]; fills: number; alphas: Set<number> } {
  const names: (string | null)[] = new Array<string | null>(screenW * SCREEN_H).fill(null);
  const alphas = new Set<number>();
  let fills = 0;
  let dx = 0;
  let alpha = 1;
  const stack: { dx: number; style: string }[] = [];
  const ctx = {
    fillStyle: '#000000',
    set globalAlpha(v: number) { alpha = v; alphas.add(v); },
    get globalAlpha(): number { return alpha; },
    save() { stack.push({ dx, style: this.fillStyle }); },
    restore() { const s = stack.pop(); if (s) { dx = s.dx; this.fillStyle = s.style; } },
    translate(x: number, y: number) { assert.equal(y, 0); dx += x; },
    fillRect(x: number, y: number, w: number, h: number) {
      const name = HEX.get(this.fillStyle);
      assert.ok(name, `${this.fillStyle} is in the palette`);
      assert.ok(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(w) && Number.isInteger(h), `whole pixels: ${x} ${y} ${w} ${h}`);
      assert.ok(w > 0 && h > 0, `a rectangle with area: ${x} ${y} ${w} ${h}`);
      assert.ok(x + dx >= 0 && x + dx + w <= screenW && y >= 0 && y + h <= SCREEN_H, `inside the screen: ${x + dx} ${y} ${w} ${h}`);
      fills++;
      for (let j = y; j < y + h; j++) for (let i = x + dx; i < x + dx + w; i++) names[j * screenW + i] = name;
    },
  };
  drawEpilogueRoom(ctx as unknown as CanvasRenderingContext2D, screenW, (screenW - 256) / 2, sky);
  return { names, fills, alphas };
}

test('the still is drawn in the palette, in whole pixels, with no alpha, and covers the whole screen', () => {
  for (const sky of [0, 1, 2] as const) {
    const { names, fills, alphas } = paint(sky, 256);
    assert.ok(fills > 100, 'there is a room in there');
    assert.deepEqual([...alphas], [], 'nothing is blended: no alpha is ever set');
    assert.equal(names.indexOf(null), -1, `every pixel of the 256 by ${SCREEN_H} screen is painted`);
  }
});

test('the dawn moves the window and the light it throws, and nothing else', () => {
  const a = paint(0, 256).names, b = paint(2, 256).names;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    diff++;
    const x = i % 256, y = Math.floor(i / 256);
    // The window and the glow round it, the pale wall beside it, and the pool of light on the floor, all left of Eleven's bed.
    assert.ok(x < 170 && y < 170, `a changed pixel at ${x},${y} is in the light's reach`);
    assert.ok(!(x >= 126 && x <= 154 && y >= 74 && y <= 112), `Eleven and her letter do not change: ${x},${y}`);
  }
  assert.ok(diff > 500, 'the sky does change');
});

test('on a wider screen the set sits centered in the frame: the 256 px layout is the middle of the wide one, pixel for pixel', () => {
  const narrow = paint(1, 256).names, wide = paint(1, 384).names;
  const fx = 64;
  for (let y = 0; y < SCREEN_H; y++) {
    for (let x = 0; x < 256; x++) assert.equal(wide[y * 384 + fx + x], narrow[y * 256 + x], `${x},${y}`);
  }
});

// ---------------------------------------------------------------- the results title
test('every chapter\'s last stage says CHAPTER n CLEAR, and the others say LEVEL n CLEAR', () => {
  const said: string[] = [];
  for (const id of STAGE_ORDER) {
    const closes = closesChapter(id);
    const title = resultsTitle({ chapter: closes ? chapterOf(id) : undefined, final: nextStage(id) === null, level: levelNumber(id) });
    if (closes) said.push(title);
    else assert.equal(title, `LEVEL ${levelNumber(id)} CLEAR`);
  }
  assert.deepEqual(said, ['CHAPTER ONE CLEAR', 'CHAPTER TWO CLEAR', 'CHAPTER THREE CLEAR']);
});

test('the last stage of the whole campaign says CAMPAIGN COMPLETE, and no other stage reads differently for it', () => {
  assert.equal(resultsTitle({ chapter: 5, final: true, level: 16, campaignEnd: true }), 'CAMPAIGN COMPLETE');
  assert.equal(resultsTitle({ chapter: 5, final: true, level: 16 }), 'CHAPTER FIVE CLEAR', 'the flag is what says it');
  assert.equal(resultsTitle({ chapter: 3, final: true, level: 9 }), 'CHAPTER THREE CLEAR', 'the build\'s last stage still reads as before');
  assert.equal(resultsTitle({ level: 4, campaignEnd: false }), 'LEVEL 4 CLEAR');
  assert.equal(endsCampaign('5.3'), true);
  for (const id of STAGE_ORDER) assert.equal(endsCampaign(id), false, `${id} is not the campaign's end`);
  const [left, right] = titleSpan('CAMPAIGN COMPLETE', 256);
  assert.ok(left >= 8 && 256 - right >= 8, `CAMPAIGN COMPLETE spans ${left} to ${right}, with a margin of 8 px or more`);
  assert.ok(Math.abs(left - (256 - right)) <= 2, 'and is centered');
});

test('without a chapter the build\'s last level still says END OF LEVEL', () => {
  assert.equal(resultsTitle({ final: true, level: 9 }), 'END OF LEVEL 9');
  assert.equal(resultsTitle({ chapter: 9, level: 1 }), 'CHAPTER 9 CLEAR', 'a chapter past the words falls back to its number');
});

test('the chapter titles fit the 256 px results screen at the title scale, with the feedback note under the last one', () => {
  assert.equal(TITLE_SCALE, 2);
  for (const chapter of [1, 2, 3]) {
    const title = resultsTitle({ chapter, final: chapter === 3, level: chapter * 3 });
    const [left, right] = titleSpan(title, 256);
    assert.ok(left >= 8 && 256 - right >= 8, `${title} spans ${left} to ${right}, with a margin of 8 px or more`);
    assert.ok(Math.abs(left - (256 - right)) <= 2, `${title} is centered`);
  }
  // The title's top is y 12, its 7 rows are 14 px tall at this scale plus a 2 px shadow, and the note's top is y 32.
  assert.ok(12 + 7 * TITLE_SCALE + TITLE_SCALE <= 32, 'the note sits under the title');
  const note = 'This is a feedback build. More soon.';
  assert.ok(textWidth(note) <= 240, 'the note fits too');
});
