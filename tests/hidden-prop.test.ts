// The hidden path (docs/level-4.md, "Puzzles"): solid and drawn as corn until a hero who can sense it stands within 40 px.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimEvent, SimSpawn } from '../src/core/types.ts';
import { inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const hidden: SimSpawn = { kind: 'prop', id: 'hidden1', prop: 'hidden', tx: 10, ty: 6, w: 16, h: 32, hitBy: 'sense' };
const lead = (id: HeroId, level = 3) => ({ party: [{ id, level }] });
const pokes = (ev: SimEvent[]): { propId: string; hero: HeroId }[] => ofType(ev, 'poked').map((e) => ({ propId: e.propId, hero: e.hero }));
/** West of the path at 120 px, in its middle. The prop spans x 160..176, y 96..128. */
const at = (dx: number) => ({ x: 160 - dx, y: tf(7) });

test('hidden: Will within 40 px of it shows the path: reveal sound and fx, propCleared, open and walkable', () => {
  const { sim, s } = makeWhite({ ...lead('will'), spawns: [hidden], start: at(60) });
  assert.equal(s.props[0]?.solid, true, 'corn to start with');
  assert.equal(s.props[0]?.state, 'closed');
  const far = run(sim, 30);
  assert.equal(ofType(far, 'propCleared').length, 0, '60 px away: nothing');
  const ev = run(sim, 45, inp({ mx: 1 }));
  assert.ok(sfxIds(ev).includes('reveal'));
  assert.deepEqual(ofType(ev, 'propCleared'), [{ t: 'propCleared', propId: 'hidden1' }], 'once');
  const view = sim.view();
  assert.equal(view.props[0]?.state, 'open');
  assert.equal(s.props[0]?.solid, false);
  assert.equal(view.fx.some((f) => f.kind === 'reveal'), true, 'a reveal fx where the path is');
  const fx = view.fx.find((f) => f.kind === 'reveal');
  assert.ok(fx && Math.abs(fx.x - 168) < 1 && Math.abs(fx.y - 112) < 1 && fx.w === 16 && fx.h === 32);
  run(sim, 120, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x > 190, 'he walks through where it was');
});

test('hidden: the line is 40 px from the prop, and only the active hero counts', () => {
  const near = makeWhite({ ...lead('will'), spawns: [hidden], start: at(39) });
  assert.equal(ofType(run(near.sim, 3), 'propCleared').length, 1, '39 px');
  const far = makeWhite({ ...lead('will'), spawns: [hidden], start: at(42) });
  assert.equal(ofType(run(far.sim, 3), 'propCleared').length, 0, '42 px');
  // Will on the bench, standing beside it, does nothing: Mike is the one in front.
  const bench = makeWhite({ party: [{ id: 'mike', level: 5 }, { id: 'will', level: 3 }], spawns: [hidden], start: at(30) });
  assert.equal(ofType(run(bench.sim, 120), 'propCleared').length, 0);
  // And swapping him in with the path in reach shows it.
  const ev = [...bench.sim.step(inp({ swapTo: 1 })), ...run(bench.sim, 4)];
  assert.equal(ofType(ev, 'propCleared').length, 1);
});

test('hidden: Mike, Dustin and Lucas walking up to it, swinging and pushing get a try, not the path', () => {
  for (const hero of ['mike', 'dustin', 'lucas'] as const) {
    const { sim, s } = makeWhite({ ...lead(hero, 4), spawns: [hidden], start: at(20) });
    const walk = run(sim, 60, inp({ mx: 1 }));
    assert.equal(ofType(walk, 'propCleared').length, 0, hero);
    assert.deepEqual(pokes(walk), [{ propId: 'hidden1', hero }], `${hero} leaning on it`);
    assert.equal(s.props[0]?.state, 'closed');
    const swing = press(sim, { mx: 0.2, attackPressed: true }, 60);
    assert.equal(ofType(swing, 'propCleared').length, 0);
    assert.ok(pokes(swing).every((p) => p.propId === 'hidden1' && p.hero === hero));
  }
});

test('hidden: a flag shows it at once, and a retry that has it open starts that way', () => {
  const { sim, s } = makeWhite({ ...lead('mike'), spawns: [hidden], start: at(80) });
  sim.openProp('hidden1');
  const ev = run(sim, 2);
  assert.deepEqual(ofType(ev, 'propCleared'), [{ t: 'propCleared', propId: 'hidden1' }]);
  assert.ok(sfxIds(ev).includes('reveal'));
  assert.equal(s.props[0]?.solid, false);
  const again = makeWhite({ ...lead('mike'), spawns: [hidden], start: at(80), openProps: ['hidden1'] });
  assert.equal(again.s.props[0]?.state, 'open');
  assert.equal(again.s.props[0]?.solid, false);
});

test('hidden: it asks for sense by default, and a path that asks for something else is not shown by Will', () => {
  const plain: SimSpawn = { kind: 'prop', id: 'h', prop: 'hidden', tx: 10, ty: 6, w: 16, h: 32 };
  const a = makeWhite({ ...lead('will'), spawns: [plain], start: at(30) });
  assert.equal(ofType(run(a.sim, 3), 'propCleared').length, 1);
  const other: SimSpawn = { ...plain, hitBy: 'burn' };
  const b = makeWhite({ ...lead('will'), spawns: [other], start: at(30) });
  assert.equal(ofType(run(b.sim, 30), 'propCleared').length, 0);
});
