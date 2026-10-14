import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimInput, Vec2 } from '../src/core/types.ts';
import { createSim } from '../src/combat/index.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createPuzzleTracker } from '../src/world/puzzles.ts';
import type { StageData } from '../src/world/types.ts';
import { idle } from './stage-helpers.ts';

// The hint, end to end: a real stage, the real sim and the real tracker. Someone tries the gate, door, log or crate with
// a hero, and the question is whether the hint shows. No enemies, so nothing else is going on.

const px = (t: number): number => t * 16 + 8;
const fy = (t: number): number => t * 16 + 12;

interface Try { hero: HeroId; start: Vec2; input: (f: number) => Partial<SimInput>; frames?: number }

/** Plays the attempt and returns the tracker's verdict: the puzzle it hints, and the prop that was tried. */
function attempt(S: StageData, t: Try): { puzzle: string | null; tried: string | null; opened: string[] } {
  const grid = stageGrid(S);
  const sim = createSim({ ...simOptions(S, grid, { party: [{ id: t.hero }], start: t.start }), spawns: S.spawns.filter((s) => s.kind === 'prop') });
  const tracker = createPuzzleTracker(S.puzzles);
  const opened: string[] = [];
  for (let f = 0; f < (t.frames ?? 60); f++) {
    const ev = sim.step({ ...idle, ...t.input(f) });
    for (const e of ev) {
      if (e.t === 'poked') tracker.poke(e.propId, e.hero);
      if (e.t === 'propCleared' || e.t === 'targetHit') opened.push(e.propId);
    }
    tracker.tick({ hasFired: () => true, busy: false, props: sim.view().props, hero: sim.heroPos() });
  }
  const stuck = tracker.highlight();
  return { puzzle: stuck?.id ?? null, tried: stuck ? tracker.triedProp(stuck) : null, opened };
}

/** Faces a way with a nudge too small to walk anywhere, then presses attack once. */
const swing = (nudge: Partial<SimInput>) => (f: number): Partial<SimInput> => (f === 0 ? { ...nudge, attackPressed: true } : nudge);
const up = { my: -0.2 }, right = { mx: 0.2 };
const walkUp = (): Partial<SimInput> => ({ my: -1 });

// ---------------------------------------------------------------- Level 1
const gate1: Vec2 = { x: px(37), y: fy(22) };   // just south of the fence gate
const log1: Vec2 = { x: px(11), y: fy(9) };      // just south of the log

test('Level 1, the fence gate: Mike or Eleven swinging at it gets the hint at once, Lucas does not', () => {
  for (const hero of ['mike', 'eleven'] as HeroId[]) {
    const r = attempt(STAGE_11, { hero, start: gate1, input: swing(up) });
    assert.deepEqual([r.puzzle, r.tried], ['gate', 'gate1'], `${hero} at the gate`);
  }
  assert.equal(attempt(STAGE_11, { hero: 'lucas', start: gate1, input: swing(up) }).puzzle, null, 'Lucas is who the gate wants');
});

test('Level 1, the fence gate: walking into it with the wrong hero gets the hint too', () => {
  const r = attempt(STAGE_11, { hero: 'mike', start: gate1, input: walkUp, frames: 80 });
  assert.deepEqual([r.puzzle, r.tried], ['gate', 'gate1']);
  assert.equal(attempt(STAGE_11, { hero: 'lucas', start: gate1, input: walkUp, frames: 80 }).puzzle, null);
});

test('Level 1, the log: Mike swinging at it gets the hint, and Eleven pushing it clears it with no hint', () => {
  const mike = attempt(STAGE_11, { hero: 'mike', start: log1, input: swing(up) });
  assert.deepEqual([mike.puzzle, mike.tried], ['log', 'log1']);
  assert.deepEqual(mike.opened, [], 'his bat does not move it');
  const eleven = attempt(STAGE_11, { hero: 'eleven', start: log1, input: swing(up) });
  assert.equal(eleven.puzzle, null);
  assert.deepEqual(eleven.opened, ['log1'], 'her push does');
});

test('Level 1: nothing is hinted just for being near, with nobody trying anything', () => {
  assert.equal(attempt(STAGE_11, { hero: 'mike', start: gate1, input: () => ({}), frames: 600 }).puzzle, null);
  assert.equal(attempt(STAGE_11, { hero: 'mike', start: log1, input: () => ({}), frames: 600 }).puzzle, null);
});

// ---------------------------------------------------------------- Level 2
const door1: Vec2 = { x: px(44), y: fy(31) };    // south of the power room's sealed door
const door2: Vec2 = { x: px(5), y: fy(13) };     // south of the door at the observation corridor's end
const crateWest: Vec2 = { x: px(26), y: fy(6) }; // west of the crate in the storage hall's corridor

test('Level 2, the sealed doors: the wrong hero at the door gets the hint, and the hint names the door', () => {
  for (const hero of ['mike', 'lucas', 'eleven'] as HeroId[]) {
    const r = attempt(STAGE_12, { hero, start: door1, input: swing(up) });
    assert.deepEqual([r.puzzle, r.tried], ['burn', 'door1'], `${hero} at the power room door`);
  }
  assert.equal(attempt(STAGE_12, { hero: 'dustin', start: door1, input: swing(up) }).puzzle, null, 'Dustin burns the sensor that opens it');
  for (const hero of ['mike', 'dustin', 'eleven'] as HeroId[]) {
    const r = attempt(STAGE_12, { hero, start: door2, input: swing(up) });
    assert.deepEqual([r.puzzle, r.tried], ['relay', 'door2'], `${hero} at the second door`);
  }
  assert.equal(attempt(STAGE_12, { hero: 'lucas', start: door2, input: swing(up) }).puzzle, null, 'Lucas shoots the relay behind the glass');
});

test('Level 2, the doors: pushing against one with the wrong hero gets the hint', () => {
  assert.deepEqual(attempt(STAGE_12, { hero: 'mike', start: door1, input: walkUp, frames: 80 }).puzzle, 'burn');
  assert.deepEqual(attempt(STAGE_12, { hero: 'dustin', start: door1, input: walkUp, frames: 80 }).puzzle, null);
});

test('Level 2, the crate: Mike swinging at it gets the hint, and Eleven pushing it clears it with no hint', () => {
  const mike = attempt(STAGE_12, { hero: 'mike', start: crateWest, input: swing(right) });
  assert.deepEqual([mike.puzzle, mike.tried], ['crate', 'crate1']);
  const eleven = attempt(STAGE_12, { hero: 'eleven', start: crateWest, input: swing(right) });
  assert.equal(eleven.puzzle, null);
  assert.deepEqual(eleven.opened, ['crate1']);
});

test('Level 2, the sensor itself: Lucas shooting it gets the hint, and Dustin burning it does not', () => {
  // sensor1 is set into the wall face at tile 41,30. Stand two tiles south and face it.
  const spot: Vec2 = { x: px(41), y: fy(32) };
  const lucas = attempt(STAGE_12, { hero: 'lucas', start: spot, input: swing(up) });
  assert.deepEqual([lucas.puzzle, lucas.tried], ['burn', 'sensor1']);
  assert.deepEqual(lucas.opened, [], 'a rocket does not light a heat sensor');
});
