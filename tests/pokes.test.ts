import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimEvent, SimSpawn } from '../src/core/types.ts';
import { agent, inp, makeWhite, ofType, press, run, tc, tf } from './sim-helpers.ts';

// "Trying it": the sim reports a `poked` event when a hero swings or fires toward a shut gate, door, log, crate, lantern or
// console, or pushes against one. The stage decides if that hero was the wrong one (world/puzzles.ts).

const gate = (open = false): SimSpawn => ({ kind: 'prop', id: 'gate', prop: 'gate', tx: 8, ty: 6, w: 48, h: 16, ...(open ? { state: 'open' as const } : {}) });
const log: SimSpawn = { kind: 'prop', id: 'log', prop: 'log', tx: 8, ty: 6, w: 48, h: 16, pushBy: 'push' };
const lantern: SimSpawn = { kind: 'prop', id: 'lantern', prop: 'target', tx: 14, ty: 8, w: 16, h: 16 };
const decor: SimSpawn = { kind: 'prop', id: 'decor', prop: 'crate', tx: 8, ty: 6, w: 16, h: 16 };
/** Stands the hero just south of a prop at tile row 6, feet 26 px below its bottom edge. */
const south = { x: tc(9), y: tf(8) };

const pokes = (ev: SimEvent[]): { propId: string; hero: HeroId }[] => ofType(ev, 'poked').map((e) => ({ propId: e.propId, hero: e.hero }));
const lead = (id: HeroId) => ({ party: [{ id }] });
/** Faces up (a nudge too small to walk anywhere) and presses attack. */
const swingUp = { my: -0.2, attackPressed: true };

test('attacking toward a shut gate, log or lantern is a try, and the event names the hero', () => {
  for (const spawn of [gate(), log]) {
    const { sim } = makeWhite({ ...lead('mike'), spawns: [spawn], start: south });
    const ev = press(sim, swingUp, 2);
    assert.deepEqual(pokes(ev), [{ propId: spawn.kind === 'prop' ? spawn.id : '', hero: 'mike' }], `a swing at the ${spawn.kind === 'prop' ? spawn.prop : ''}`);
  }
  // Lucas fires a rocket down a line at the lantern, 100 px away.
  const shot = makeWhite({ ...lead('lucas'), spawns: [lantern], start: { x: tc(14), y: tf(14) } });
  const ev = press(shot.sim, swingUp, 2);
  assert.deepEqual(pokes(ev), [{ propId: 'lantern', hero: 'lucas' }]);
});

test('the right hero trying it is reported too: the stage is the one that knows who was wrong', () => {
  const { sim } = makeWhite({ ...lead('eleven'), spawns: [log], start: south });
  const ev = press(sim, swingUp, 20);
  assert.deepEqual(pokes(ev), [{ propId: 'log', hero: 'eleven' }]);
  assert.equal(ofType(ev, 'propCleared').length, 1, 'and her push really does clear the log');
});

test('not a try: facing away, out of reach, a prop already solved, a special that does no damage, a prop that asks for nothing', () => {
  const away = makeWhite({ ...lead('mike'), spawns: [gate()], start: south });
  assert.deepEqual(pokes(press(away.sim, { my: 0.2, attackPressed: true }, 2)), [], 'facing the other way');

  const far = makeWhite({ ...lead('mike'), spawns: [gate()], start: { x: tc(9), y: tf(12) } });
  assert.deepEqual(pokes(press(far.sim, swingUp, 2)), [], 'a swing that cannot reach');

  const open = makeWhite({ ...lead('mike'), spawns: [gate(true)], start: south });
  assert.deepEqual(pokes(press(open.sim, swingUp, 2)), [], 'a gate that is already open');

  const lit = makeWhite({ ...lead('lucas'), spawns: [{ ...lantern, state: 'lit' }], start: { x: tc(14), y: tf(14) } });
  assert.deepEqual(pokes(press(lit.sim, swingUp, 2)), [], 'a lantern that is already lit');

  // Mike's DM screen does no damage, so it is not a try at anything.
  const screen = makeWhite({ ...lead('mike'), spawns: [gate()], start: south });
  press(screen.sim, { my: -0.2 }, 1);
  assert.deepEqual(pokes(press(screen.sim, { specialPressed: true }, 2)), [], 'the DM screen');

  const crate = makeWhite({ ...lead('mike'), spawns: [decor], start: south });
  assert.deepEqual(pokes(press(crate.sim, swingUp, 2)), [], 'a decor crate asks for nothing');
});

test('not a try: fighting. An enemy who has noticed him is close, so the door behind it is not what he is after', () => {
  const { sim, s } = makeWhite({ ...lead('mike'), spawns: [gate(), agent('a', 20, 3)], start: south });  // about 180 px away: close enough to count, too far to notice him
  const foe = s.enemies[0]!;
  foe.aware = true;
  assert.deepEqual(pokes(press(sim, swingUp, 2)), []);
  foe.aware = false;
  run(sim, 60);
  assert.equal(pokes(press(sim, swingUp, 2)).length, 1, 'an enemy who has not noticed him changes nothing');
});

test('the same prop reports again only after about three quarters of a second', () => {
  const { sim } = makeWhite({ ...lead('mike'), spawns: [gate()], start: south });
  let n = pokes(press(sim, swingUp, 20)).length;
  n += pokes(press(sim, swingUp, 20)).length;
  assert.equal(n, 1, 'two swings 20 frames apart are one try');
  run(sim, 50);
  assert.equal(pokes(press(sim, swingUp, 2)).length, 1, 'a later swing is another');
});

test('pushing against a shut gate for a third of a second is a try, and walking past one is not', () => {
  const into = makeWhite({ ...lead('mike'), spawns: [gate()], start: south });
  const early = pokes(run(into.sim, 12, inp({ my: -1 })));
  assert.deepEqual(early, [], 'not yet');
  const late = pokes(run(into.sim, 40, inp({ my: -1 })));
  assert.deepEqual(late, [{ propId: 'gate', hero: 'mike' }]);

  const past = makeWhite({ ...lead('mike'), spawns: [gate()], start: { x: tc(13), y: tf(8) } });
  assert.deepEqual(pokes(run(past.sim, 80, inp({ my: -1 }))), [], 'walking up beside it and on past');

  const open = makeWhite({ ...lead('mike'), spawns: [gate(true)], start: south });
  assert.deepEqual(pokes(run(open.sim, 60, inp({ my: -1 }))), [], 'walking through a gate that is open');

  const wall = makeWhite({ ...lead('mike'), spawns: [], start: { x: tc(1), y: tf(8) } });
  assert.deepEqual(pokes(run(wall.sim, 60, inp({ mx: -1 }))), [], 'a wall is not a puzzle');

  const crate = makeWhite({ ...lead('mike'), spawns: [decor], start: south });
  assert.deepEqual(pokes(run(crate.sim, 60, inp({ my: -1 }))), [], 'a decor crate is not a puzzle');
});
