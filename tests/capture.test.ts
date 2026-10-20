// Capture mode (?capture=1), the demo recorder's way of running the game: it steps exactly the ticks it is asked for, it is off unless the flag is
// on, and the audio API logs every call against its tick, whether or not the game is muted or unfocused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCapture, resetCapture } from '../src/core/capture.ts';
import { flags } from '../src/core/flags.ts';
import { audio } from '../src/audio/index.ts';
import { setAway, setMuted } from '../src/audio/engine.ts';
import { FRAME_SAMPLES, SAMPLE_RATE, cutShot, heardAt, pcmBase64, seedOf, seeded } from '../src/demo/mixmath.ts';
import { beatAt, soundsBetween, SLOT, TUMBLE, rollFinal } from '../src/ui/finalroll_logic.ts';
import { createRng } from '../src/core/rng.ts';
import { SAMPLE_PARTY } from '../src/ui/finale_dev.ts';
import { fitScreen } from '../src/core/viewport.ts';
import { CAPTURE_W } from '../src/core/capture.ts';

test('the mode is off unless the flag is on', () => {
  assert.equal(flags.capture, false);
});

test('step(n) runs exactly n ticks and one render, and advance(n) runs ticks with no render', () => {
  resetCapture();
  let ticks = 0;
  let renders = 0;
  const cap = createCapture(() => { ticks++; }, () => { renders++; });
  assert.equal(cap.step(7), 7);
  assert.deepEqual([ticks, renders], [7, 1]);
  assert.equal(cap.step(0), 7);
  assert.deepEqual([ticks, renders], [7, 2]);
  assert.equal(cap.advance(5), 12);
  assert.deepEqual([ticks, renders], [12, 2]);
  assert.equal(cap.step(1), 13);
  assert.equal(cap.ticks(), 13);
  assert.equal(cap.step(-3), 13, 'a negative count runs nothing');
  assert.equal(cap.step(2.9), 15, 'a part of a tick is not a tick');
});

test('the audio API logs each call with the tick it was made in, muted or not', () => {
  resetCapture();
  const cap = createCapture(() => {}, () => {});
  setMuted(true);
  setAway(true);
  cap.advance(3);
  audio.music('mirkwood');
  audio.sfx('hit', { rate: 1.25 });
  audio.sfx('hit');
  cap.advance(2);
  audio.phase(1);
  audio.intensity(1);
  audio.jingle('clear');
  audio.blip('mike');
  setMuted(false);
  setAway(false);
  assert.deepEqual(cap.events.map((e) => [e.tick, e.kind, e.id]), [
    [3, 'music', 'mirkwood'], [3, 'sfx', 'hit'], [3, 'sfx', 'hit'],
    [5, 'phase', 1], [5, 'intensity', 1], [5, 'jingle', 'clear'], [5, 'blip', 'mike'],
  ]);
  assert.equal(cap.events[1]?.rate, 1.25);
  assert.equal(cap.events[2]?.rate, undefined, 'a plain pitch is not logged');
  assert.equal(cap.count('sfx', 'hit'), 2);
  assert.equal(cap.count('sfx'), 2);
  assert.equal(cap.last('music')?.id, 'mirkwood');
  assert.equal(cap.last('stinger'), null);
});

test('a call is heard on the frame its tick first shows in', () => {
  // A call made while tick k ran first shows in the frame drawn after it, the capture's tick k + 1: at (k + 1) / 60 s.
  assert.equal(heardAt({ tick: 0 }), 1 / 60);
  assert.equal(heardAt({ tick: 59 }), 1);
  assert.equal(FRAME_SAMPLES, 735);
  assert.equal(SAMPLE_RATE / 60, FRAME_SAMPLES);
});

test("the Final Roll's landing sound and its settled die are on the same frame", () => {
  const roll = rollFinal(SAMPLE_PARTY, createRng(1983));
  const n = roll.rolls.length;
  roll.rolls.forEach((_, i) => {
    const land = i * SLOT + TUMBLE;
    // The scene counts its clock up one a tick and plays the sounds up to it, then draws: the frame after the tick that makes the clock `land`.
    assert.deepEqual(soundsBetween(land - 1, land, roll), ['rollLand']);
    assert.equal(beatAt(land - 1, n).stage, 'tumble');
    assert.equal(beatAt(land, n).stage, 'settled');
  });
});

test('a shot cut from a render is exactly its frames long, with soft ends', () => {
  const render = new Float32Array(FRAME_SAMPLES * 100).fill(0.5);
  const cut = cutShot(render, 10, 30, 0.01, 0.02);
  assert.equal(cut.length, 30 * FRAME_SAMPLES);
  assert.ok(Math.abs(cut[0] as number) < 0.01, 'starts near silence');
  assert.equal(cut[Math.floor(cut.length / 2)], 0.5);
  assert.ok(Math.abs(cut[cut.length - 1] as number) < 0.01, 'ends near silence');
  // Past the end of the render it is silence, not a short buffer.
  assert.equal(cutShot(render, 90, 30, 0, 0).length, 30 * FRAME_SAMPLES);
});

test('the sound goes out of the page as 16-bit PCM and the effects get seeds of their own', () => {
  const b64 = pcmBase64(new Float32Array([0, 1, -1, 0.5]));
  const bytes = Buffer.from(b64, 'base64');
  assert.equal(bytes.length, 8);
  assert.deepEqual([bytes.readInt16LE(0), bytes.readInt16LE(2), bytes.readInt16LE(4), bytes.readInt16LE(6)], [0, 32767, -32768, 16384]);
  const a = seeded(seedOf({ tick: 4 }, 0));
  const b = seeded(seedOf({ tick: 4 }, 0));
  assert.equal(a(), b());
  assert.notEqual(seeded(seedOf({ tick: 4 }, 1))(), seeded(seedOf({ tick: 4 }, 0))());
});

test('pinning the frame at 384 wide makes the full view an exact 5x of 1920', () => {
  assert.equal(CAPTURE_W * 5, 1920);
  assert.equal(fitScreen(384, 224, 1, CAPTURE_W).w, CAPTURE_W);
  assert.equal(fitScreen(1920, 1080, 1, CAPTURE_W).w, CAPTURE_W);
});
