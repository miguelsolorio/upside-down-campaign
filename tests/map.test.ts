import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAP_PLACE } from '../src/core/mapdata.ts';
import { STAGE_ORDER, STAGES_AHEAD, partyFor } from '../src/core/campaign.ts';
import { recordClear } from '../src/core/progress.ts';
import type { Progress } from '../src/core/progress.ts';
import type { HeroSnapshot } from '../src/core/types.ts';
import { BAND_Y, HZ, LEGS, ORDER, POS, TOP_H, hopLength, tokenAt } from '../src/gfx/map_geo.ts';
import { tinyWidth } from '../src/gfx/font.ts';
import {
  WALK_SPEED, hintLine, mapNodes, startHop, startNode, stepFrom, stepHop,
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

test('the map has a node for every stage and every locked one ahead, each with its place and name, and a spot on the screen', () => {
  const nodes = mapNodes(null, (id) => `stage ${id}`);
  assert.deepEqual(nodes.map((n) => n.id), [...STAGE_ORDER, ...STAGES_AHEAD]);
  assert.deepEqual(nodes.map((n) => n.id), [...ORDER]);
  for (const n of nodes) {
    assert.equal(n.place, MAP_PLACE[n.id]);
    assert.equal(n.name, `stage ${n.id}`);
    const at = POS[n.id] as { x: number; y: number };
    assert.ok(at.x >= 8 && at.x <= 248, `${n.id} is on the screen`);
    assert.ok(at.y >= TOP_H + 8 && at.y <= BAND_Y - 8, `${n.id} clears the bars`);
  }
});

test('the route drops through the hole: chapter 1 and 2.1 sit above the horizon, the tunnels and the gate below it', () => {
  for (const id of ['1.1', '1.2', '1.3', '2.1']) assert.ok((POS[id] as { y: number }).y < HZ, id);
  for (const id of ['2.2', '2.3']) assert.ok((POS[id] as { y: number }).y > HZ + 8, id);
  const [a, b] = [POS['2.1'] as { x: number }, POS['2.2'] as { x: number }];
  assert.ok(Math.abs(a.x - b.x) < 40, 'the drop is under the patch');
});

test('states come from progress: cleared, then the next stage open, then locked', () => {
  // 3.3 is past the end of the build, so it stays locked whatever is cleared.
  assert.equal(states(null), 'ollllllll');
  assert.equal(states(cleared(1)), 'colllllll');
  assert.equal(states(cleared(2)), 'ccollllll');
  assert.equal(states(cleared(3)), 'cccolllll');
  assert.equal(states(cleared(4)), 'ccccollll');
  assert.equal(states(cleared(5)), 'cccccolll');
  assert.equal(states(cleared(6)), 'ccccccoll');
  assert.equal(states(cleared(7)), 'cccccccol');
  // Everything cleared: no open node is left.
  assert.equal(states(cleared(8)), 'ccccccccl');
});

test('the token starts on the next uncleared stage, or the last stage when all are cleared', () => {
  assert.equal(startNode(null), '1.1');
  assert.equal(startNode(cleared(0)), '1.1');
  assert.equal(startNode(cleared(1)), '1.2');
  assert.equal(startNode(cleared(2)), '1.3');
  assert.equal(startNode(cleared(3)), '2.1');
  assert.equal(startNode(cleared(4)), '2.2');
  assert.equal(startNode(cleared(5)), '2.3');
  assert.equal(startNode(cleared(6)), '3.1');
  assert.equal(startNode(cleared(7)), '3.2');
  assert.equal(startNode(cleared(8)), '3.2');
  assert.equal(startNode(cleared(8)), STAGE_ORDER[STAGE_ORDER.length - 1]);
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

  const four = mapNodes(cleared(4)); // up to 2.1 cleared, 2.2 open, 2.3 locked
  assert.equal(stepFrom(four, '1.3', 1), '2.1');
  assert.equal(stepFrom(four, '2.1', 1), '2.2');
  assert.equal(stepFrom(four, '2.2', 1), '2.2', 'the locked 2.3 is not a step');
  assert.equal(stepFrom(four, '2.1', -1), '1.3');
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

test('the hops are long enough to see and add up: a two hop walk is the sum of its legs, and a hop back is as long', () => {
  assert.equal(LEGS.length, ORDER.length - 1);
  for (let i = 0; i < LEGS.length; i++) {
    const a = POS[ORDER[i] as string] as { x: number; y: number }, b = POS[ORDER[i + 1] as string] as { x: number; y: number };
    const len = hopLength(ORDER[i] as string, ORDER[i + 1] as string);
    assert.ok(len >= Math.hypot(b.x - a.x, b.y - a.y) - 0.5, 'a hop is at least the straight line');
    assert.ok(len >= 30, `${ORDER[i]} to ${ORDER[i + 1]} has room to walk`);
    assert.ok(Math.abs(len - hopLength(ORDER[i + 1] as string, ORDER[i] as string)) < 1e-9);
  }
  assert.ok(Math.abs(hopLength('1.1', '1.3') - hopLength('1.1', '1.2') - hopLength('1.2', '1.3')) < 1e-6);
  assert.equal(hopLength('1.1', '1.1'), 0);
  assert.equal(hopLength('1.1', 'nowhere'), 0);
});

test('the walk moves 1.5 to 2 px a frame along the hop and arrives exactly on the node', () => {
  assert.ok(WALK_SPEED >= 1.5 && WALK_SPEED <= 2);
  for (const [from, to] of [['1.2', '1.3'], ['1.3', '1.2'], ['1.3', '2.1'], ['2.1', '2.2'], ['1.1', '1.3']] as const) {
    let hop = startHop(from, to), frames = 0, last = tokenAt(to, { from, to, k: 0 }), lastK = 0, done = false;
    assert.deepEqual({ x: last.x, y: last.y }, POS[from], `${from} to ${to} starts on the first node`);
    while (!done && frames < 2000) {
      const s = stepHop(hop);
      assert.ok(s.hop.dist - hop.dist <= WALK_SPEED + 1e-9, 'never more than the walking speed along the hop');
      assert.ok(s.k >= lastK && s.k <= 1);
      const at = tokenAt(to, { from, to, k: s.k });
      assert.ok(Math.hypot(at.x - last.x, at.y - last.y) <= WALK_SPEED + 1e-6, 'never more than the speed on screen');
      hop = s.hop; last = at; lastK = s.k; done = s.done; frames++;
    }
    assert.ok(done);
    assert.equal(frames, Math.ceil(hopLength(from, to) / WALK_SPEED));
    assert.equal(lastK, 1);
    assert.ok(Math.hypot(last.x - (POS[to] as { x: number }).x, last.y - (POS[to] as { y: number }).y) < 1e-6, `${from} to ${to} arrives on the second node`);
  }
});

test('walking back retraces the route, and the token faces the way it goes', () => {
  const out = tokenAt('1.3', { from: '1.2', to: '1.3', k: 0.4 }), back = tokenAt('1.2', { from: '1.3', to: '1.2', k: 0.6 });
  assert.ok(Math.hypot(out.x - back.x, out.y - back.y) < 0.5, 'the same spot 40% out and 60% back');
  assert.ok(out.dx > 0 && back.dx < 0, 'right going out, left coming back');
  const drop = tokenAt('2.2', { from: '2.1', to: '2.2', k: 0.5 });
  assert.ok(drop.dy > 0, 'the drop heads down');
  const stay = tokenAt('1.3', null);
  assert.deepEqual({ x: stay.x, y: stay.y }, POS['1.3']);
});

test('a hop to the same node, or an unknown one, has no length and is over at once', () => {
  assert.equal(stepHop(startHop('1.1', '1.1')).done, true);
  assert.equal(stepHop(startHop('1.1', 'nowhere')).done, true);
  assert.equal(stepHop(startHop('1.1', 'nowhere')).k, 1);
});

test('hints name the keyboard, the controller or the touch screen, never another device', () => {
  const kb = hintLine('keyboard', 'Z'), pad = hintLine('gamepad', 'A'), touch = hintLine('touch', 'A');
  assert.match(kb, /ARROWS/);
  assert.match(kb, /ESC/);
  assert.match(kb, /\bZ\b/);
  assert.doesNotMatch(kb, /STICK|\bB\b/);
  assert.match(pad, /STICK/);
  assert.match(pad, /\bA\b/);
  assert.match(pad, /\bB\b/);
  assert.doesNotMatch(pad, /ARROWS|ESC|\bZ\b/);
  assert.match(touch, /DPAD/);
  assert.match(touch, /\bA\b/);
  assert.match(touch, /\bB\b/);
  assert.doesNotMatch(touch, /ARROWS|ESC|STICK/);
  // The map splits the line at runs of spaces into a short legend, one key to a line, in the 3 by 5 font on the right of the band.
  for (const line of [kb, pad, touch]) {
    const legend = line.split(/\s{2,}/);
    assert.ok(legend.length <= 3);
    for (const l of legend) assert.ok(tinyWidth(l) <= 56, `"${l}" fits the legend`);
  }
});

test('the map scene names its keys through bindings, not literals of its own', () => {
  const scene = readFileSync(new URL('../src/ui/map.ts', import.meta.url), 'utf8');
  assert.match(scene, /labelOf\('attack'\)/);
  assert.match(scene, /labelOf\('special'\)/, 'the SHOP key is named through bindings too');
  assert.match(scene, /getPromptDevice\(\)/);
});
