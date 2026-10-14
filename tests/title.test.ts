import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAUNCH_FRAMES, launchLevel } from '../src/ui/format.ts';

const read = (f: string): string => readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8');

test('the title draws no key hints and no credit line', () => {
  for (const f of ['title.ts', 'title_art.ts']) {
    const src = read(f);
    assert.ok(!/core\/bindings/.test(src), `${f} imports bindings`);
    assert.ok(!/labelOf|titleHintLines|moveLabel/.test(src), `${f} reads a key label`);
    assert.ok(!/affiliated/i.test(src), `${f} carries the credit line`);
  }
});

test('launchLevel runs 0 to 1 across the launch and stays inside that range', () => {
  assert.equal(launchLevel(0), 0);
  assert.equal(launchLevel(-3), 0);
  assert.equal(launchLevel(LAUNCH_FRAMES), 1);
  assert.equal(launchLevel(LAUNCH_FRAMES * 3), 1);
  assert.ok(launchLevel(LAUNCH_FRAMES / 2) > 0.45 && launchLevel(LAUNCH_FRAMES / 2) < 0.55);
});
