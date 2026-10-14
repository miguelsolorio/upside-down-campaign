import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAP_NODES } from '../src/core/mapdata.ts';
import { STAGE_ORDER, STAGES_AHEAD, partyFor } from '../src/core/campaign.ts';
import { recordClear } from '../src/core/progress.ts';
import type { Progress } from '../src/core/progress.ts';
import type { HeroSnapshot } from '../src/core/types.ts';
import {
  WALK_SPEED, hintLine, mapNodes, pointAt, routeBetween, routeLength, startNode, stepFrom, walkStep,
} from '../src/ui/map_logic.ts';

const snap = (id: HeroSnapshot['id'], level: number, xp = 0): HeroSnapshot => ({ id, level, xp, hp: 10, hpMax: 40 });
const full = [snap('mike', 6, 10), snap('dustin', 5), snap('lucas', 5), snap('eleven', 5), snap('will', 3)];
/** Progress with the first `n` stages of the build cleared. */
const cleared = (n: number): Progress | null => {
  let p: Progress | null = null;
  for (const id of STAGE_ORDER.slice(0, n)) p = recordClear(p, id, full);
  return p;
};
const states = (p: Progress | null): string => mapNodes(p).map((n) => n.state[0]).join('');

test('the map has a node for every stage and every locked one ahead, at the mapdata positions', () => {
  const nodes = mapNodes(null);
  assert.deepEqual(nodes.map((n) => n.id), [...STAGE_ORDER, ...STAGES_AHEAD]);
  for (const n of nodes) assert.deepEqual({ x: n.x, y: n.y }, MAP_NODES[n.id]);
});

test('states come from progress: cleared, then the next stage open, then locked, and the stages ahead are always locked', () => {
  assert.equal(states(null), 'olllll');
  assert.equal(states(cleared(1)), 'collll');
  assert.equal(states(cleared(2)), 'ccolll');
  assert.equal(states(cleared(3)), 'cccoll');
  // Everything cleared: no open node is left, and the stages ahead stay grey.
  assert.equal(states(cleared(4)), 'ccccll');
  assert.deepEqual(mapNodes(cleared(4)).slice(-2).map((n) => n.state), ['locked', 'locked']);
});

test('the token starts on the next uncleared stage, or the last stage when all are cleared', () => {
  assert.equal(startNode(null), '1.1');
  assert.equal(startNode(cleared(0)), '1.1');
  assert.equal(startNode(cleared(1)), '1.2');
  assert.equal(startNode(cleared(2)), '1.3');
  assert.equal(startNode(cleared(3)), '2.1');
  assert.equal(startNode(cleared(4)), '2.1');
  assert.equal(startNode(cleared(4)), STAGE_ORDER[STAGE_ORDER.length - 1]);
});

test('a start node is never locked', () => {
  for (let n = 0; n <= STAGE_ORDER.length; n++) {
    const p = cleared(n);
    assert.notEqual(mapNodes(p).find((x) => x.id === startNode(p))?.state, 'locked', `after ${n} cleared`);
  }
});

test('stepping goes to the neighbour, skips locked nodes and stops at the ends', () => {
  const fresh = mapNodes(null);
  assert.equal(stepFrom(fresh, '1.1', 1), '1.1', 'a new game has nowhere to go');
  assert.equal(stepFrom(fresh, '1.1', -1), '1.1');

  const two = mapNodes(cleared(2)); // 1.1 and 1.2 cleared, 1.3 open, the rest locked
  assert.equal(stepFrom(two, '1.3', -1), '1.2');
  assert.equal(stepFrom(two, '1.2', -1), '1.1');
  assert.equal(stepFrom(two, '1.1', -1), '1.1');
  assert.equal(stepFrom(two, '1.2', 1), '1.3');
  assert.equal(stepFrom(two, '1.3', 1), '1.3', 'the locked 2.1 is not a step');

  const all = mapNodes(cleared(4));
  assert.equal(stepFrom(all, '1.3', 1), '2.1');
  assert.equal(stepFrom(all, '2.1', 1), '2.1', '2.2 and 2.3 are locked');
  assert.equal(stepFrom(all, '2.1', -1), '1.3');
});

test('a step jumps over a locked node in the middle', () => {
  const nodes = mapNodes(cleared(4)).map((n) => (n.id === '1.2' ? { ...n, state: 'locked' as const } : n));
  assert.equal(stepFrom(nodes, '1.1', 1), '1.3');
  assert.equal(stepFrom(nodes, '1.3', -1), '1.1');
  assert.equal(stepFrom(nodes, 'nowhere', 1), 'nowhere');
});

test('a replay brings back the heroes of that chapter, at the levels the player reached', () => {
  const p = cleared(4) as Progress;
  assert.deepEqual(partyFor('1.2', p.heroes).map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven']);
  assert.deepEqual(partyFor('2.1', p.heroes).map((s) => s.id), ['mike', 'dustin', 'lucas', 'will']);
  assert.equal(partyFor('1.1', p.heroes).find((s) => s.id === 'mike')?.level, 6, 'a replay never starts a hero lower');
  // Before Will is met, chapter 2 would bring him in at the average level of the others minus one.
  const early = recordClear(null, '1.1', [snap('mike', 5), snap('dustin', 5), snap('lucas', 5)]);
  assert.equal(partyFor('2.1', early.heroes).find((s) => s.id === 'will')?.level, 4);
});

test('the walk runs along the trail at 2 px a frame and arrives exactly on the node', () => {
  const nodes = mapNodes(cleared(2));
  const route = routeBetween(nodes, '1.2', '1.3');
  assert.deepEqual(pointAt(route, 0), { x: MAP_NODES['1.2']?.x, y: MAP_NODES['1.2']?.y });
  assert.deepEqual(pointAt(route, 1e9), { x: MAP_NODES['1.3']?.x, y: MAP_NODES['1.3']?.y });
  const len = routeLength(route);
  assert.ok(len > Math.hypot(138 - 84, 134 - 104) - 1, 'the trail is at least as long as the straight line');

  let dist = 0, frames = 0, last = pointAt(route, 0), done = false;
  while (!done && frames < 1000) {
    const s = walkStep(route, dist);
    assert.ok(s.dist - dist <= WALK_SPEED + 1e-9, 'never more than the walking speed along the trail');
    assert.ok(Math.hypot(s.x - last.x, s.y - last.y) <= WALK_SPEED + 1e-9, 'never more than the speed on screen');
    dist = s.dist; last = { x: s.x, y: s.y }; done = s.done; frames++;
  }
  assert.ok(done);
  assert.equal(frames, Math.ceil(len / WALK_SPEED));
  assert.deepEqual(last, { x: MAP_NODES['1.3']?.x, y: MAP_NODES['1.3']?.y });
});

test('walking back along a trail retraces it, and a two hop walk passes through the middle node', () => {
  const nodes = mapNodes(cleared(4));
  const out = routeBetween(nodes, '1.1', '1.2'), back = routeBetween(nodes, '1.2', '1.1');
  assert.deepEqual(back.pts, [...out.pts].reverse());
  assert.ok(Math.abs(routeLength(out) - routeLength(back)) < 1e-9);

  const far = routeBetween(nodes, '1.1', '1.3');
  assert.ok(far.pts.some(([x, y]) => x === MAP_NODES['1.2']?.x && y === MAP_NODES['1.2']?.y));
  assert.deepEqual(far.pts[0], [MAP_NODES['1.1']?.x, MAP_NODES['1.1']?.y]);
  assert.deepEqual(far.pts[far.pts.length - 1], [MAP_NODES['1.3']?.x, MAP_NODES['1.3']?.y]);
});

test('a route to the same node, or an unknown one, is a point and arrives at once', () => {
  const nodes = mapNodes(null);
  const stay = routeBetween(nodes, '1.1', '1.1');
  assert.equal(routeLength(stay), 0);
  assert.equal(walkStep(stay, 0).done, true);
  assert.equal(routeBetween(nodes, '1.1', 'nowhere').pts.length, 1);
});

test('hints name the keyboard or the controller, never both', () => {
  const kb = hintLine('keyboard', 'Z'), pad = hintLine('gamepad', 'A');
  assert.match(kb, /ARROWS/);
  assert.match(kb, /ESC/);
  assert.match(kb, /\bZ\b/);
  assert.doesNotMatch(kb, /STICK|\bB\b/);
  assert.match(pad, /STICK/);
  assert.match(pad, /\bA\b/);
  assert.match(pad, /\bB\b/);
  assert.doesNotMatch(pad, /ARROWS|ESC|\bZ\b/);
  assert.ok(kb.length * 6 <= 256 && pad.length * 6 <= 256, 'each fits on the screen in one line');
});

test('the map scene names its keys through bindings, not literals of its own', () => {
  const scene = readFileSync(new URL('../src/ui/map.ts', import.meta.url), 'utf8');
  assert.match(scene, /labelOf\('attack'\)/);
  assert.match(scene, /getPromptDevice\(\)/);
});
