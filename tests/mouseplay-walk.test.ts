// The mouse driver (world/mouseplay.ts): its constants, and a click on the ground. The hero walks there round walls and props,
// snaps to a free tile, and gives up when stuck, shut in or too far.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARRIVE, MAX_WALK, NO_TICK, NUDGE, REPLAN, STUCK_PX, STUCK_TICKS, createMousePlay } from '../src/world/mouseplay.ts';
import { DEADZONE } from '../src/combat/hero.ts';
import { arena, idle, inp, makeSim, tc, tf } from './sim-helpers.ts';
import type { SimSpawn } from '../src/core/types.ts';
import { walkTo, dist, step, until, wall } from './mouse-helpers.ts';

// ---------------------------------------------------------------- constants
test('the constants: a nudge turns the hero without walking him, and an arrival is past a waypoint', () => {
  assert.ok(NUDGE > DEADZONE, `NUDGE ${NUDGE} must clear the dead zone ${DEADZONE}`);
  assert.ok(NUDGE < 0.5, 'and stay small enough to be only a turn');
  assert.ok(ARRIVE > 4.5);
  assert.ok(STUCK_PX > 0 && STUCK_TICKS > REPLAN, 'a route is replanned before a hero counts as stuck');
  assert.ok(Object.isFrozen(NO_TICK));
  assert.deepEqual(NO_TICK, { go: null, special: null, specialHeld: false, burst: false });
});

test('nothing to do: the keys come back as they are, the same object', () => {
  const sim = makeSim();
  const mouse = createMousePlay(arena(24, 16));
  const keys = inp({ specialHeld: true, mx: 1 });
  assert.equal(mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos()), keys);
  assert.equal(mouse.marker(), null);
});

// ---------------------------------------------------------------- walking
test('walk: crosses the open ground, stops within ARRIVE of the spot, and then hands the keys back untouched', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  const goal = { x: tc(18), y: tf(8) };
  const took = until(sim, mouse, walkTo(goal.x, goal.y), 600);
  assert.ok(took > 0 && took < 400, `took ${took}`);
  assert.ok(dist(sim.heroPos(), goal) <= ARRIVE, `ended ${dist(sim.heroPos(), goal)} px away`);
  const keys = idle();
  const out = mouse.drive(keys, NO_TICK, sim.view(), sim.heroPos());
  assert.equal(out, keys);
  assert.deepEqual(out, idle());
  // While it walked, the driver said so: a unit vector, no attack.
  const sim2 = makeSim({ grid });
  const mouse2 = createMousePlay(grid);
  const first = step(sim2, mouse2, walkTo(goal.x, goal.y));
  assert.ok(Math.abs(Math.hypot(first.mx, first.my) - 1) < 1e-9);
  assert.equal(first.attackHeld, false);
});

test('walk: goes round a wall to the gap, then on to the spot', () => {
  const grid = arena(24, 16, wall(1, 12));
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  const goal = { x: tc(18), y: tf(8) };
  let lowest = 0;
  step(sim, mouse, walkTo(goal.x, goal.y));
  for (let i = 0; i < 900 && mouse.marker()?.live; i++) {
    step(sim, mouse);
    lowest = Math.max(lowest, sim.heroPos().y);
  }
  assert.equal(mouse.marker()?.live, false);
  assert.ok(dist(sim.heroPos(), goal) <= ARRIVE, `ended ${dist(sim.heroPos(), goal)} px away`);
  assert.ok(lowest > tf(12), `went down to the gap (${lowest})`);
});

test('walk: a foot box that overhangs a wall is steered clear instead of walked into it', () => {
  // One pine at tile (3, 6). The hero stands in column 4 with the left edge of his 10 px foot box 0.9 px inside column 3, and the spot is
  // 252 px straight below him and 4 px to the right. That is too slow a sideways drift to clear the pine's corner before he counts as
  // stuck, and the corner assist (combat/space.ts) does not help a hero who is not walking dead straight. A line sampled only 4 px to
  // either side calls it clear, and he stops against the corner; sampled the foot box's own 5 px, it is not, and he is routed round.
  const grid = arena(10, 24, { '3,6': 'T' });
  const sim = makeSim({ grid, start: { x: 68.1, y: 80 } });
  const mouse = createMousePlay(grid);
  const goal = { x: tc(4), y: tf(20) };
  const took = until(sim, mouse, walkTo(goal.x, goal.y), 590);
  assert.ok(took > 0, 'still walking at 590 ticks');
  assert.ok(dist(sim.heroPos(), goal) <= ARRIVE, `ended ${dist(sim.heroPos(), goal)} px away`);
});

test('walk: a click inside a wall snaps to the nearest free tile, and the marker shows that spot', () => {
  const grid = arena(24, 16, wall(1, 14));
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  // Tile (12, 5), the middle of the wall. The nearest free tile the ring search finds first is (11, 4).
  step(sim, mouse, walkTo(12 * 16 + 8, 90));
  const m = mouse.marker();
  assert.deepEqual(m && { kind: m.kind, x: m.x, y: m.y, live: m.live }, { kind: 'walk', x: 11 * 16 + 8, y: 4 * 16 + 12, live: true });
  for (let i = 0; i < 600 && mouse.marker()?.live; i++) step(sim, mouse);
  assert.ok(dist(sim.heroPos(), { x: 184, y: 76 }) <= ARRIVE, `ended at ${sim.heroPos().x}, ${sim.heroPos().y}`);
});

test('walk: a click on free ground snaps to the middle of its tile', () => {
  const grid = arena(24, 16);
  const mouse = createMousePlay(grid);
  const sim = makeSim({ grid });
  mouse.drive(idle(), walkTo(100.4, 99.1), sim.view(), sim.heroPos());
  assert.deepEqual(mouse.marker(), { kind: 'walk', x: 6 * 16 + 8, y: 5 * 16 + 12, age: 0, live: true });
});

test('walk: a click with no free tile within six is ignored, and the goal before it stands', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  const keys = idle();
  assert.equal(mouse.drive(keys, walkTo(5000, 5000), sim.view(), sim.heroPos()), keys);
  assert.equal(mouse.marker(), null);
  mouse.drive(idle(), walkTo(tc(18), tf(8)), sim.view(), sim.heroPos());
  const out = mouse.drive(idle(), walkTo(5000, 5000), sim.view(), sim.heroPos());
  assert.equal(mouse.marker()?.live, true);
  assert.equal(mouse.marker()?.x, tc(18));
  assert.ok(out.mx > 0.9);
});

test('walk: a new click replaces the goal', () => {
  const grid = arena(24, 16);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  step(sim, mouse, walkTo(tc(18), tf(8)));
  for (let i = 0; i < 20; i++) step(sim, mouse);
  step(sim, mouse, walkTo(tc(4), tf(3)));
  assert.deepEqual(mouse.marker(), { kind: 'walk', x: tc(4), y: tf(3), age: 0, live: true });
  for (let i = 0; i < 400 && mouse.marker()?.live; i++) step(sim, mouse);
  assert.ok(dist(sim.heroPos(), { x: tc(4), y: tf(3) }) <= ARRIVE);
});

test('walk: a closed gate is a wall to the route and an open one is a doorway', () => {
  const grid = arena(24, 16, wall(1, 14, [7]));
  const spawns: SimSpawn[] = [{ kind: 'prop', id: 'g1', prop: 'gate', tx: 12, ty: 7 }];
  const goal = { x: tc(18), y: tf(7) };
  // Shut, the gate bars the way: the hero walks up to it and gives up there.
  const shut = makeSim({ grid, spawns, start: { x: tc(4), y: tf(7) } });
  assert.equal(shut.view().props[0]?.solid, true);
  const mouseA = createMousePlay(grid);
  const tA = until(shut, mouseA, walkTo(goal.x, goal.y), 600);
  assert.ok(tA > 0);
  assert.ok(shut.heroPos().x < 12 * 16, `stopped at the gate (${shut.heroPos().x})`);
  assert.ok(dist(shut.heroPos(), goal) > 40);
  // Open, it is a tile like any other.
  const open = makeSim({ grid, spawns, start: { x: tc(4), y: tf(7) } });
  open.openProp('g1');
  open.step(idle());
  assert.equal(open.view().props[0]?.state, 'open');
  const mouseB = createMousePlay(grid);
  const tB = until(open, mouseB, walkTo(goal.x, goal.y), 600);
  assert.ok(tB > 0);
  assert.ok(dist(open.heroPos(), goal) <= ARRIVE, `ended ${dist(open.heroPos(), goal)} px away`);
});

test('walk: a gate that opens while the hero is on the way is noticed within REPLAN ticks', () => {
  const grid = arena(24, 16, wall(1, 14, [7]));
  const spawns: SimSpawn[] = [{ kind: 'prop', id: 'g1', prop: 'gate', tx: 12, ty: 7 }];
  const goal = { x: tc(18), y: tf(7) };
  const sim = makeSim({ grid, spawns, start: { x: tc(4), y: tf(7) } });
  const mouse = createMousePlay(grid);
  step(sim, mouse, walkTo(goal.x, goal.y));
  for (let i = 0; i < 100; i++) step(sim, mouse);
  assert.equal(mouse.marker()?.live, true, 'still on the way');
  sim.openProp('g1');
  for (let i = 0; i < 400 && mouse.marker()?.live; i++) step(sim, mouse);
  assert.ok(dist(sim.heroPos(), goal) <= ARRIVE, `ended ${dist(sim.heroPos(), goal)} px away`);
});

test('walk: an enclosed spot that no route reaches is given up well inside MAX_WALK', () => {
  // A pocket at (18, 8) walled in on all eight sides.
  const marks: Record<string, string> = {};
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx !== 0 || dy !== 0) marks[`${18 + dx},${8 + dy}`] = 'T';
  const grid = arena(24, 16, marks);
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  const goal = { x: tc(18), y: tf(8) };
  const took = until(sim, mouse, walkTo(goal.x, goal.y), MAX_WALK);
  assert.ok(took > 0 && took < MAX_WALK, `took ${took}`);
  assert.ok(dist(sim.heroPos(), goal) > 20, 'and did not get there');
  assert.equal(mouse.marker()?.live, false);
});

test('walk: a hero blocked on the way gives up STUCK_TICKS after he stops, and not before', () => {
  // A wall right across the arena, so there is no route and he walks straight into it.
  const grid = arena(24, 16, wall(1, 14));
  const sim = makeSim({ grid });
  const mouse = createMousePlay(grid);
  step(sim, mouse, walkTo(tc(18), tf(8)));
  let last = sim.heroPos().x, stoppedAt = -1, endedAt = -1;
  for (let i = 1; i < 600; i++) {
    step(sim, mouse);
    const x = sim.heroPos().x;
    if (stoppedAt < 0 && Math.abs(x - last) < 0.01) stoppedAt = i;
    last = x;
    if (!mouse.marker()?.live) { endedAt = i; break; }
  }
  assert.ok(stoppedAt > 0 && endedAt > 0, `stopped ${stoppedAt}, ended ${endedAt}`);
  assert.ok(endedAt - stoppedAt <= STUCK_TICKS + 20, `gave up ${endedAt - stoppedAt} ticks after he stopped`);
  assert.ok(endedAt - stoppedAt >= STUCK_TICKS - 8, `gave up too soon: ${endedAt - stoppedAt}`);
  assert.ok(sim.heroPos().x > 170 && sim.heroPos().x < 192, `he is at the wall (${sim.heroPos().x})`);
});

test('walk: a walk that would take longer than MAX_WALK ticks is given up at MAX_WALK', () => {
  const grid = arena(90, 8);
  const sim = makeSim({ grid, start: { x: tc(3), y: tf(4) } });
  const mouse = createMousePlay(grid);
  const took = until(sim, mouse, walkTo(tc(85), tf(4)), MAX_WALK + 50);
  assert.ok(took >= MAX_WALK && took <= MAX_WALK + 2, `took ${took}`);
  assert.ok(sim.heroPos().x < tc(85) - 100, 'and was still far away');
});
