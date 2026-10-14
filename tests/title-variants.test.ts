import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAUNCH_FRAMES, WALL_LOOP, WALL_MESSAGE, idleDieFace, launchLevel, tapeClock, wallMessageLit } from '../src/ui/title/timeline.ts';

const dir = new URL('../src/ui/title/', import.meta.url);

test('the title variants draw no key hints: nothing in them reads a binding or a key label', () => {
  for (const f of ['core.ts', 'art.ts', 'v1_wall.ts', 'v2_party.ts', 'v3_rift.ts', 'v4_d20.ts', 'v5_vhs.ts']) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/core\/bindings/.test(src), `${f} imports bindings`);
    assert.ok(!/labelOf|titleHintLines|moveLabel/.test(src), `${f} reads a key label`);
  }
});

test('launchLevel runs 0 to 1 across the launch and stays inside that range', () => {
  assert.equal(launchLevel(0), 0);
  assert.equal(launchLevel(-3), 0);
  assert.equal(launchLevel(LAUNCH_FRAMES), 1);
  assert.equal(launchLevel(LAUNCH_FRAMES * 3), 1);
  assert.ok(launchLevel(LAUNCH_FRAMES / 2) > 0.45 && launchLevel(LAUNCH_FRAMES / 2) < 0.55);
});

test('the wall spells RIGHT HERE one letter at a time, then RUN, then goes dark, and loops', () => {
  assert.equal(wallMessageLit(0), '');
  let last = 0;
  let sawFull = false;
  let sawRun = false;
  for (let t = 0; t < WALL_LOOP; t++) {
    const lit = wallMessageLit(t);
    if (lit === 'RUN') { sawRun = true; continue; }
    if (sawRun) { assert.equal(lit, '', `dark after RUN at ${t}`); continue; }
    assert.ok(WALL_MESSAGE.startsWith(lit), `${lit} is a prefix of the message`);
    assert.ok(lit.length >= last && lit.length - last <= 1, 'grows by one letter at most');
    last = lit.length;
    if (lit === WALL_MESSAGE) sawFull = true;
  }
  assert.ok(sawFull && sawRun);
  assert.equal(wallMessageLit(WALL_LOOP + 100), wallMessageLit(100));
  assert.equal(wallMessageLit(-5), wallMessageLit(WALL_LOOP - 5));
});

test('the idle d20 never shows a 20, so the landing on 20 means something', () => {
  const seen = new Set<number>();
  for (let t = 0; t < 50 * 400; t += 50) {
    const n = idleDieFace(t);
    assert.ok(n >= 1 && n <= 19, `face ${n}`);
    seen.add(n);
  }
  assert.ok(seen.size > 10);
  assert.equal(idleDieFace(10), idleDieFace(49));
});

test('the tape counter ticks once a second and formats as h:mm:ss', () => {
  assert.equal(tapeClock(0), '0:00:07');
  assert.equal(tapeClock(59), '0:00:07');
  assert.equal(tapeClock(60), '0:00:08');
  assert.equal(tapeClock(60 * 53), '0:01:00');
  assert.match(tapeClock(60 * 4000), /^\d:\d\d:\d\d$/);
});
