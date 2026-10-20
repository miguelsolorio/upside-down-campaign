// The demo recorder's shot list (scripts/demo/shots.mjs): the video is 45 seconds, every shot can start and fail loudly, and every URL flag
// a shot uses is one the game reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FPS, SHOTS, TOTAL_FRAMES, sec } from '../scripts/demo/shots.mjs';

/** The flags core/flags.ts reads, from its own source: every q.get('x') and on('x'). */
function knownFlags(): Set<string> {
  const src = readFileSync(new URL('../src/core/flags.ts', import.meta.url), 'utf8');
  return new Set([...src.matchAll(/\b(?:q\.get|on)\('([a-z]+)'\)/g)].map((m) => m[1] as string));
}

test('the shots add up to 45 seconds, give or take half a second', () => {
  assert.equal(FPS, 60);
  assert.ok(Math.abs(TOTAL_FRAMES / FPS - 45) <= 0.5, `${TOTAL_FRAMES / FPS} s`);
  assert.equal(sec(1.5), 90);
});

test('every shot has a trigger and a timeout, a whole number of frames, and a name of its own', () => {
  const ids = new Set<string>();
  for (const s of SHOTS) {
    assert.ok(!ids.has(s.id), `${s.id} is listed twice`);
    ids.add(s.id);
    assert.equal(typeof s.trigger, 'function', `${s.id} has no trigger`);
    assert.ok(Number.isInteger(s.timeout) && s.timeout > 0, `${s.id} has no timeout`);
    assert.ok(Number.isInteger(s.len) && s.len > 0, `${s.id} has no length`);
    assert.ok(s.audio && s.audio.fadeIn >= 0 && s.audio.fadeOut >= 0, `${s.id} has no sound fades`);
  }
});

test('a trigger is one function of window.__ud that stands on its own, since the recorder sends its source to the page', () => {
  for (const s of SHOTS) {
    const src = s.trigger.toString();
    const fn = new Function(`return (${src});`)() as (ud: unknown) => unknown;
    assert.equal(typeof fn, 'function', s.id);
    // Run on a bare page (no scene, an empty log): it answers or says no, it never throws on a missing play scene.
    const bare = { cap: { count: () => 0, events: [], ticks: () => 0 } };
    assert.doesNotThrow(() => fn(bare), s.id);
  }
});

test('every URL flag a shot uses is one the game reads', () => {
  const known = knownFlags();
  assert.ok(known.has('capture') && known.has('stage') && known.has('finale'));
  for (const s of SHOTS) for (const k of Object.keys(s.url)) assert.ok(known.has(k), `${s.id} uses ?${k}, which flags.ts does not read`);
});

test('a shot keeps its camera, captions, keys and flashes inside its own length', () => {
  for (const s of SHOTS) {
    assert.equal(s.cam[0].at, 0, `${s.id}: the first camera key is at frame 0`);
    s.cam.forEach((k: { at: number }, i: number) => {
      assert.ok(k.at < s.len, `${s.id}: camera key ${i} is past the end`);
      if (i > 0) assert.ok(k.at > s.cam[i - 1].at, `${s.id}: camera keys are in order`);
    });
    for (const c of s.captions ?? []) assert.ok(c.at < s.len, `${s.id}: caption "${c.text}" is past the end`);
    for (const k of s.keys ?? []) assert.ok(k.at < s.len, `${s.id}: a key press is past the end`);
    for (const k of s.cam) if (k.zoom !== undefined && !k.push) assert.ok(Number.isInteger(k.zoom), `${s.id}: a zoom that stays is a whole number`);
  }
});

test('every shot is the whole frame: the owner asked for no close-ups', () => {
  for (const s of SHOTS) for (const k of s.cam) assert.ok(k.zoom === undefined && !k.push && k.follow === undefined, `${s.id} has a punch-in or a push`);
});

test('shots that share a bed of music run one track straight through', () => {
  let at = 0;
  let first = -1;
  for (const s of SHOTS) {
    const bed = s.audio.bed;
    if (bed) {
      if (first < 0) first = at;
      assert.ok(Math.abs(bed.from - (at - first) / FPS) < 1e-9, `${s.id}: its bed starts ${bed.from} s in`);
    }
    at += s.len;
  }
  assert.ok(first >= 0);
});

test('no caption or card says anything with a dash that is not the plain one', () => {
  const text = SHOTS.flatMap((s) => [...(s.captions ?? []).map((c: { text: string }) => c.text), ...(s.card?.lines ?? []).map((l: { text: string }) => l.text)]);
  for (const t of text) assert.ok(!new RegExp('[\\u2013\\u2014]').test(t), t);
});
