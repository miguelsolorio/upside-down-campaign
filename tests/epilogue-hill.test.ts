// Chapter four's epilogue (docs/level-13.md, "The chapter end"): the wiring, the seven lines it plays and the hill road still behind them.
// The timeline is chapter three's (tests/epilogue.test.ts); the still is drawn onto a recording context instead of a real one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterOf, closesChapter } from '../src/core/campaign.ts';
import { SCREEN_H } from '../src/core/config.ts';
import { fitsBox, hasEmDash } from '../src/core/text.ts';
import { drawEpilogueHill } from '../src/gfx/epilogue_hill.ts';
import { SEATS } from '../src/gfx/epilogue_hill_party.ts';
import type { Stage } from '../src/gfx/epilogue_kit.ts';
import { EPILOGUES, HILL_AT, SKY_AT, hasEpilogue, skyAt } from '../src/story/epilogue.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { paintStill } from './epilogue-helpers.ts';

const lines = SCRIPTS['l13_hill']?.lines ?? [];

// ---------------------------------------------------------------- wiring and words
test('4.4 closes chapter four, and the chapter has an epilogue with words in it', () => {
  assert.equal(closesChapter('4.4'), true);
  assert.equal(chapterOf('4.4'), 4);
  assert.equal(EPILOGUES[4], 'l13_hill');
  assert.equal(hasEpilogue(4), true);
  assert.ok(lines.length > 0, 'the script has lines');
  assert.ok(lines.length >= 5 && lines.length <= 8, `about as long as the letter: ${lines.length} lines`);
});

test('the lines fit the box, have no em dash, and are the narrator\'s and the party\'s: Eddie is named and never speaks, and Hopper is in Kamchatka', () => {
  for (const l of lines) {
    assert.ok(l.text.length <= 96 && fitsBox(l.text), `fits 3 rows of 32: ${l.text}`);
    assert.equal(hasEmDash(l.text), false, l.text);
    assert.ok(l.text === l.text.trim() && !/ {2}|\.\.\./.test(l.text), `no stray spaces or dots: ${l.text}`);
    assert.ok(!/\{|\}/.test(l.text), 'no key tokens: it plays the same on every device');
    assert.ok(!['eddie', 'hopper', 'vecna'].includes(l.who), `${l.who} does not speak here`);
  }
  assert.equal(lines[0]?.who, 'narrator', 'the narrator sets the scene');
  assert.equal(lines.at(-1)?.who, 'mike', 'Mike closes it');
  const all = lines.map((l) => l.text).join(' ');
  assert.match(all, /Eddie/, 'his seat is kept');
  assert.match(all, /army/i, 'the lockdown: the army on the Lab road');
  assert.match(all, /void|black sun/i, 'and the Abyss, as Eleven saw it');
  assert.ok(lines.some((l) => l.who === 'eleven') && lines.some((l) => l.who === 'will'), 'Eleven and Will, who sense the other side, say what is there');
  assert.ok(!/running up that hill|friends don't lie|master control|number one/i.test(all), 'nothing quotes the show');
  assert.ok(!/seamless|robust|leverage|unlock|delve/i.test(all), 'no banned words');
});

test('every speaker has a seat on the rail, and Eddie has one with nobody in it', () => {
  const sat = new Set(['robin', 'dustin', 'lucas', 'max', 'will', 'mike', 'eleven']);
  for (const l of lines) if (l.who !== 'narrator') assert.ok(sat.has(l.who), `${l.who} is in the picture`);
  const xs = Object.values(SEATS);
  assert.deepEqual([...xs].sort((a, b) => a - b), xs, 'left to right');
  assert.ok(SEATS.dustin < SEATS.eddie && SEATS.eddie < SEATS.lucas, 'Eddie\'s seat is the gap between Dustin and Lucas');
  assert.ok(SEATS.lucas - SEATS.dustin > 2 * (SEATS.max - SEATS.lucas) - 4, 'and it is a figure wide');
});

// ---------------------------------------------------------------- timeline
test('the night goes from the lights on to the lights going out to the army arriving, on the clock, and never back', () => {
  assert.deepEqual([...HILL_AT], [0, 420, 900]);
  assert.equal(skyAt(0, HILL_AT), 0);
  assert.equal(skyAt(HILL_AT[1] - 1, HILL_AT), 0);
  assert.equal(skyAt(HILL_AT[1], HILL_AT), 1);
  assert.equal(skyAt(HILL_AT[2] - 1, HILL_AT), 1);
  assert.equal(skyAt(HILL_AT[2], HILL_AT), 2);
  assert.equal(skyAt(1e6, HILL_AT), 2);
  assert.equal(skyAt(700), skyAt(700, SKY_AT), 'the letter\'s room keeps its own clock by default');
  let was = 0;
  for (let c = 0; c < HILL_AT[2] + 100; c += 7) { const s = skyAt(c, HILL_AT); assert.ok(s >= was); was = s; }
});

// ---------------------------------------------------------------- the still
const paint = (stage: Stage, screenW: number): ReturnType<typeof paintStill> =>
  paintStill((ctx) => drawEpilogueHill(ctx, screenW, (screenW - 256) / 2, stage), screenW);

test('the still is drawn in the palette, in whole pixels, with no alpha, and covers the whole screen', () => {
  for (const stage of [0, 1, 2] as const) {
    for (const screenW of [256, 384]) {
      const { names, fills, alphas } = paint(stage, screenW);
      assert.ok(fills > 500, 'there is a hill in there');
      assert.deepEqual([...alphas], [], 'nothing is blended: no alpha is ever set');
      assert.equal(names.indexOf(null), -1, `every pixel of the ${screenW} by ${SCREEN_H} screen is painted`);
    }
  }
});

test('the night changes the sky, the town and the Lab, and nothing at the rail or below it', () => {
  const a = paint(0, 256).names, b = paint(1, 256).names, c = paint(2, 256).names;
  const RAIL = 142;
  for (const [from, to] of [[a, b], [b, c], [a, c]] as const) {
    let diff = 0;
    for (let i = 0; i < from.length; i++) {
      if (from[i] === to[i]) continue;
      diff++;
      assert.ok(Math.floor(i / 256) < RAIL - 4, `a changed pixel at ${i % 256},${Math.floor(i / 256)} is above the party's heads and the rail`);
    }
    assert.ok(diff > 150, `the stage does change something: ${diff} pixels`);
  }
});

test('the town\'s lights only go out, the Lab\'s come on, and the army shows by stage 2: the helicopter\'s beam and the floodlights are cream and bone', () => {
  const count = (names: (string | null)[], name: string, x0: number, x1: number, y0: number, y1: number): number => {
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (names[y * 256 + x] === name) n++;
    return n;
  };
  const s = ([0, 1, 2] as const).map((stage) => paint(stage, 256).names);
  const town = s.map((n) => count(n, 'amber', 0, 190, 100, 140));
  assert.ok((town[0] as number) > (town[1] as number) && (town[1] as number) > (town[2] as number), `town windows lit: ${town.join(' > ')}`);
  assert.ok((town[0] as number) >= 40, 'the town starts well lit');
  const lab = s.map((n) => count(n, 'amber', 196, 238, 92, 98));
  assert.ok((lab[0] as number) === 0 && (lab[1] as number) > 0 && (lab[2] as number) > (lab[1] as number), `Lab windows lit: ${lab.join(' < ')}`);
  const beams = s.map((n) => count(n, 'bone', 190, 250, 50, 90) + count(n, 'cream', 88, 104, 82, 110));
  assert.equal(beams[0], 0, 'no lights in the sky at first');
  assert.equal(beams[1], 0, 'or in stage 1');
  assert.ok((beams[2] as number) > 150, `floodlights and the beam in stage 2: ${beams[2]}`);
});

test('Eddie\'s d20 sits on the rail in every stage: bone with a red face, between Dustin and Lucas', () => {
  for (const stage of [0, 1, 2] as const) {
    const { names } = paint(stage, 256);
    const at = (x: number, y: number): string | null => names[y * 256 + x] ?? null;
    assert.equal(at(SEATS.eddie, 137), 'red', 'the face');
    assert.equal(at(SEATS.eddie - 3, 138), 'bone');
    for (const y of [133, 134, 135, 136, 137, 138, 139, 140]) assert.ok(['bone', 'red', 'grey3', 'white', 'rose'].includes(at(SEATS.eddie, y) ?? ''), `the die at ${SEATS.eddie},${y}`);
    assert.equal(at(SEATS.eddie, 142), 'grey3', 'on the rail\'s top');
  }
});

test('on a wider screen the set sits centered in the frame: the 256 px layout is the middle of the wide one, pixel for pixel', () => {
  for (const stage of [0, 2] as const) {
    const narrow = paint(stage, 256).names, wide = paint(stage, 384).names;
    const fx = 64;
    for (let y = 0; y < SCREEN_H; y++) {
      for (let x = 0; x < 256; x++) assert.equal(wide[y * 384 + fx + x], narrow[y * 256 + x], `stage ${stage} at ${x},${y}`);
    }
  }
});
