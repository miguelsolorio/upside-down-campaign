// ?finale=1 (docs/development.md): the ending on its own, to see and hear it without playing 5.3. The Final Roll for a sample party of four, then
// the basement epilogue, then THE END, then round again. A fake game steps each scene as the page would, with the skip and confirm presses a player
// would make, and records the scene each one hands on to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './canvas-helpers.ts';
import type { Game, Scene } from '../src/core/scene.ts';
import { settings } from '../src/core/settings.ts';
import { startFinaleDev, SAMPLE_PARTY } from '../src/ui/finale_dev.ts';
import { FADE_OUT, HOLD } from '../src/ui/theend.ts';
import { endClock } from '../src/ui/finalroll_logic.ts';

function fakeGame(seed = 1983, finale: 'any' | 'plain' | 'big' | 'gold' = 'any'): { g: Game; scenes: Scene[]; press: Set<string> } {
  const scenes: Scene[] = [];
  const press = new Set<string>();
  const g = {
    flags: { finale, seed, rush: false },
    scenes: { go: (s: Scene) => { scenes.push(s); s.enter?.(g); }, push: () => undefined, pop: () => undefined, top: () => scenes.at(-1) ?? null, update: () => undefined, draw: () => undefined },
    input: { pressed: (a: string) => press.has(a), clicked: () => null, offer: () => undefined, held: () => false },
    settings, frame: 0,
  } as unknown as Game;
  return { g, scenes, press };
}

/** Steps the newest scene until it hands on to another, with `press` held down, or fails after `max` ticks. */
function untilNext(f: ReturnType<typeof fakeGame>, press: string[], max: number): number {
  const before = f.scenes.length, scene = f.scenes.at(-1) as Scene;
  press.forEach((p) => f.press.add(p));
  try {
    for (let i = 1; i <= max; i++) {
      scene.update(f.g);
      if (f.scenes.length > before) return i;
    }
  } finally { f.press.clear(); }
  throw new Error(`the scene did not hand on in ${max} ticks`);
}

test('?finale=1 runs the Final Roll, the basement epilogue, THE END, and round again', () => {
  const was = settings.skipDialogue;
  settings.skipDialogue = true;
  try {
    const f = fakeGame();
    startFinaleDev(f.g);
    assert.equal(settings.skipDialogue, false, 'the hook shows the whole ending, so the story is on for it');
    assert.equal(f.scenes.length, 1);
    assert.equal(f.scenes[0]?.opaque, true, 'the roll is a screen of its own');
    // The roll: four heroes, two dice each, and its finish; it ends itself.
    const ticks = untilNext(f, [], endClock(SAMPLE_PARTY.length) + 10);
    assert.equal(ticks, endClock(SAMPLE_PARTY.length), 'the roll takes its own clock and no more');
    assert.equal(f.scenes.length, 2);
    // The epilogue (the skip key plays it out at once), then THE END.
    untilNext(f, ['skip'], 5);
    assert.equal(f.scenes.length, 3);
    assert.equal(f.scenes[2]?.opaque, true);
    // THE END holds, then waits for a press, then fades out and starts the roll again.
    const held = untilNext(f, ['confirm'], HOLD + FADE_OUT + 5);
    assert.ok(held >= HOLD + FADE_OUT, `a press before ${HOLD} frames does not dismiss it (${held})`);
    assert.equal(f.scenes.length, 4, 'and the roll is back');
  } finally {
    settings.skipDialogue = was;
  }
});
