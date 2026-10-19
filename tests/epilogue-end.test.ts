// The ending's story pieces (docs/level-16.md, "The ending"): the l16_basement script, the basement epilogue's clock and its last die,
// and THE END's timing. They need no canvas, so Node runs them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyText, setPromptDevice } from '../src/core/bindings.ts';
import { fitsBox, hasEmDash, wrapText } from '../src/core/text.ts';
import { loopSeconds } from '../src/audio/tracks/compile.ts';
import { ENDING } from '../src/audio/tracks/ending.ts';
import { EPILOGUES, hasEpilogue } from '../src/story/epilogue.ts';
import { BASEMENT_SCRIPT } from '../src/story/epilogue_end.ts';
import {
  BAR_FRAMES, BOUNCES, DIE_RADIUS, FADE_IN, FROM, HINT_AT, LAND_MAX, LAND_MIN, REST, ROLL_LEN, blackAt, dieAt, mayLeave, mayRoll, rollStartAt,
} from '../src/story/epilogue_end_logic.ts';
import { SCRIPTS } from '../src/story/scripts.ts';
import { FADE_OUT, HOLD, blackAfter, levelAt } from '../src/ui/theend.ts';

const script = SCRIPTS['l16_basement'];

// ---------------------------------------------------------------- the script
test('l16_basement is registered, is chapter five\'s epilogue, and has six to ten lines', () => {
  assert.ok(script, 'registered in SCRIPTS');
  assert.equal(script.id, 'l16_basement');
  assert.equal(EPILOGUES[5], 'l16_basement');
  assert.equal(BASEMENT_SCRIPT, 'l16_basement');
  assert.equal(hasEpilogue(5), true);
  assert.ok(script.lines.length >= 6 && script.lines.length <= 10, `${script.lines.length} lines`);
});

test('every line fits the dialogue box on every device, and no line has an em dash', () => {
  try {
    for (const device of ['keyboard', 'gamepad', 'touch'] as const) {
      setPromptDevice(device);
      for (const l of script?.lines ?? []) {
        const shown = keyText(l.text);
        assert.ok(fitsBox(shown), `${device}: needs ${wrapText(shown).length} rows: ${shown}`);
        assert.ok(shown.length <= 96, shown);
        assert.equal(hasEmDash(l.text), false, l.text);
        assert.ok(!/[{}]/.test(shown), `unfilled token: ${shown}`);
      }
    }
  } finally {
    setPromptDevice('keyboard');
  }
});

test('the party at the table speaks, in the right order: Mike closes the book, and Mike hands Will the last roll', () => {
  const lines = script?.lines ?? [];
  const seated = new Set(['mike', 'dustin', 'lucas', 'eleven', 'will', 'max']);
  for (const l of lines) assert.ok(seated.has(l.who), `${l.who} is at the table in the ending's room`);
  assert.equal(lines[0]?.who, 'mike');
  assert.match(lines[0]?.text ?? '', /clos/i, 'the first thing said is the book closing');
  assert.equal(lines.at(-1)?.who, 'mike');
  assert.match(lines.at(-1)?.text ?? '', /roll/i, 'and the last line sets up the die');
  assert.ok(new Set(lines.map((l) => l.who)).size >= 5, 'most of the table has something to say');
  for (const l of lines) assert.ok(l.text.split(' ').length <= 16, `short: ${l.text}`);
  // Eleven has grown by the ending: short full sentences, never a speech.
  for (const l of lines.filter((x) => x.who === 'eleven')) {
    assert.ok(l.text.split(' ').length <= 12, `Eleven keeps it short: ${l.text}`);
    assert.ok(l.text.split(/[.!?]/).filter(Boolean).every((sentence) => sentence.trim().split(' ').length <= 6), `in short sentences: ${l.text}`);
  }
});

// ---------------------------------------------------------------- the music and the die
test('the die rolls through the music\'s last bar and lands on its tock', () => {
  const seconds = loopSeconds(ENDING);
  assert.equal(seconds, 80);
  // 72 bpm: a bar is four beats of 5/6 s.
  assert.equal(BAR_FRAMES, Math.round(((60 / ENDING.bpm) * 4) * 60));
  assert.equal(rollStartAt(seconds), seconds * 60 - BAR_FRAMES, 'the die leaves the hand as the last bar starts');
  // The tock is on step 13 of 16 of that bar.
  assert.ok(Math.abs(ROLL_LEN - BAR_FRAMES * (13 / 16)) <= 4, `the roll takes ${ROLL_LEN} frames`);
  assert.ok(LAND_MIN >= BAR_FRAMES - ROLL_LEN, 'and rests for the chord that rings out the bar');
});

test('the die starts in front of Will, ends at rest where the room draws it, and hops lower each time', () => {
  const start = dieAt(0), end = dieAt(ROLL_LEN);
  assert.equal(Math.round(start.x), FROM.x);
  assert.equal(Math.round(end.x), REST.x);
  assert.equal(Math.round(end.y), REST.y);
  assert.equal(end.lift, 0);
  assert.equal(end.landed, true);
  assert.equal(start.landed, false);
  assert.ok(Math.abs(Math.sin(end.angle)) < 1e-9 && end.squash === 1, 'upright and flat');
  assert.deepEqual(dieAt(ROLL_LEN + 50), end);
  // The sprite on the table is 9 by 10 at (144, 114): the rest is its middle, and the roll stays on the table (x 88 to 168, y 104 to 127).
  assert.deepEqual([REST.x, REST.y], [144 + 4 + 1, 114 + 5]);
  let was = 0;
  for (let t = 0; t <= ROLL_LEN; t++) {
    const p = dieAt(t);
    assert.ok(p.x >= 88 + DIE_RADIUS && p.x <= 168 - DIE_RADIUS, `x ${p.x} at ${t}`);
    assert.ok(p.y - p.lift >= 104 - 16 && p.y <= 127 - DIE_RADIUS + 3, `y ${p.y} lift ${p.lift} at ${t}`);
    assert.ok(p.x >= was - 1e-9, 'it only moves toward the rest');
    was = p.x;
  }
  const peaks = [0, 1, 2, 3].map((k) => Math.max(...Array.from({ length: ROLL_LEN / 4 }, (_, i) => dieAt(k * (ROLL_LEN / 4) + i).lift)));
  for (let k = 1; k < 4; k++) assert.ok((peaks[k] as number) < (peaks[k - 1] as number), `hop ${k} is lower: ${peaks.join(' ')}`);
  for (const b of BOUNCES) assert.ok(b >= 0 && b < ROLL_LEN);
});

test('the die leaves the hand when the last bar is due, when the music is gone, or when asked, and nothing waits forever', () => {
  const at = rollStartAt(80);
  assert.equal(mayRoll(10, at, true, false, false), false, 'mid-song, nobody asked');
  assert.equal(mayRoll(at, at, true, false, false), true, 'the last bar is due');
  assert.equal(mayRoll(10, at, true, true, false), true, 'the music has run out');
  assert.equal(mayRoll(10, at, true, false, true), true, 'confirm rolls it now');
  assert.equal(mayRoll(10, at, false, false, false), true, 'no sound to wait for');
  assert.equal(mayLeave(LAND_MIN - 1, true, true), false, 'the landed die rests a beat first');
  assert.equal(mayLeave(LAND_MIN, true, false), false, 'then waits for the music to end');
  assert.equal(mayLeave(LAND_MIN, true, true), true);
  assert.equal(mayLeave(LAND_MIN, false, false), true, 'or goes on at once without sound');
  assert.equal(mayLeave(LAND_MAX, true, false), true, 'and never longer than the ceiling');
  assert.ok(HINT_AT > 60, 'the hint to roll does not nag');
});

test('the room fades up from black once, over about a second and a half', () => {
  assert.equal(blackAt(0), 1);
  assert.equal(blackAt(FADE_IN), 0);
  assert.equal(blackAt(FADE_IN * 2), 0);
  assert.ok(FADE_IN >= 60 && FADE_IN <= 150);
  let was = 1;
  for (let t = 0; t <= FADE_IN; t++) { const b = blackAt(t); assert.ok(b <= was); was = b; }
});

// ---------------------------------------------------------------- THE END
test('THE END fades in, holds a moment before confirm counts, and fades to black on the way out', () => {
  assert.equal(levelAt(0), 0);
  assert.equal(levelAt(FADE_IN), 1);
  assert.equal(levelAt(10 * FADE_IN), 1);
  assert.ok(HOLD >= 90 && HOLD <= 300, 'a short hold');
  assert.equal(blackAfter(0), 0);
  assert.equal(blackAfter(FADE_OUT), 1);
  assert.ok(FADE_OUT > 0 && FADE_OUT <= 60);
});
