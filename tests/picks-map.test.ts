import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game } from '../src/core/scene.ts';
import type { Scene } from '../src/core/scene.ts';
import type { HeroId, HeroSnapshot } from '../src/core/types.ts';
import { recordClear, withPicks } from '../src/core/progress.ts';
import type { Progress } from '../src/core/progress.ts';
import { createMapScene } from '../src/ui/map.ts';

const snap = (id: HeroId, level: number): HeroSnapshot => ({ id, level, xp: 0, hp: 10, hpMax: 40 });
const heroes = [snap('mike', 6), snap('dustin', 5), snap('lucas', 5), snap('will', 3), snap('max', 4), snap('steve', 4)];
/** Progress with these stages cleared, so the map opens with the token on the next one. */
const progress = (...stages: string[]): Progress => stages.reduce<Progress | null>((p, id) => recordClear(p, id, heroes), null) as Progress;

/** A game whose input is whatever has been pressed for the next tick. The mouse is never over anything. */
function rig(p: Progress) {
  const calls: { stage: string; picks: HeroId[] | undefined }[] = [];
  let quit = 0;
  let now = new Set<string>();
  const input = {
    pressed: (a: string) => now.has(a), held: () => false, released: () => false,
    hover: () => null, moved: () => false, clicked: () => null, point() {}, offer() {}, device: () => 'keyboard',
  };
  const g = { input } as unknown as Game;
  const scene: Scene = createMapScene({
    progress: p,
    party: () => [{ id: 'mike' }, { id: 'dustin' }, { id: 'max' }, { id: 'steve' }],
    name: (id) => id,
    onPlay: (stage, picks) => { calls.push({ stage, picks }); },
    onQuit: () => { quit++; },
  });
  scene.enter?.(g);
  const tick = (...keys: string[]): void => { now = new Set(keys); scene.update(g); now = new Set(); };
  for (let i = 0; i < 40; i++) tick(); // past the grace
  return { calls, tick, quit: () => quit };
}

test('confirming 2.1 enters it at once, with no picks', () => {
  const r = rig(progress('1.1', '1.2', '1.3'));
  r.tick('attack', 'confirm');
  assert.deepEqual(r.calls, [{ stage: '2.1', picks: undefined }]);
});

test('confirming 2.2 opens the picks panel instead of entering, and Esc closes it without leaving the map', () => {
  const r = rig(progress('1.1', '1.2', '1.3', '2.1'));
  r.tick('attack', 'confirm');
  assert.equal(r.calls.length, 0, 'not entered yet');
  // The panel has the keys now: Esc closes it and the map is still there, so the quit key did not reach the map.
  r.tick('cancel', 'pause');
  assert.equal(r.quit(), 0);
  assert.equal(r.calls.length, 0);
  // Back on the map, Esc quits as it always did.
  r.tick('cancel', 'pause');
  assert.equal(r.quit(), 1);
});

test('START from the panel enters 2.2 with the four picked, lead first, and the last picks are the seed', () => {
  const r = rig(progress('1.1', '1.2', '1.3', '2.1'));
  r.tick('attack', 'confirm');
  r.tick('down');
  r.tick('down'); // the START row
  r.tick('attack', 'confirm');
  assert.deepEqual(r.calls, [{ stage: '2.2', picks: ['mike', 'dustin', 'max', 'steve'] }]);
});

test('the panel opens on the picks the player made last time, fixed up, and X makes the hovered hero the lead', () => {
  const p = withPicks(progress('1.1', '1.2', '1.3', '2.1'), ['dustin', 'lucas', 'will', 'mike']);
  const r = rig(p);
  r.tick('attack', 'confirm');
  r.tick('right');
  r.tick('right'); // Mike, Dustin, then Lucas
  r.tick('special', 'cancel'); // X: Lucas leads, and does not close the panel
  r.tick('down');
  r.tick('down');
  r.tick('confirm'); // Enter starts from anywhere
  // Max is required for 2.2, so he took the last free place, Mike's.
  assert.deepEqual(r.calls, [{ stage: '2.2', picks: ['lucas', 'dustin', 'will', 'max'] }]);
});

test('START does nothing with fewer than four picked', () => {
  const r = rig(progress('1.1', '1.2', '1.3', '2.1'));
  r.tick('attack', 'confirm');
  r.tick('attack', 'confirm'); // takes Mike's card out
  r.tick('confirm');
  assert.equal(r.calls.length, 0);
});
