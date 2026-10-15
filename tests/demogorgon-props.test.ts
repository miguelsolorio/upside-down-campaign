// Level 3's props: the vines Dustin burns, the fire-door box Lucas shoots and the van Eleven shoves (docs/level-3.md, "Puzzles").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimEvent, SimSpawn } from '../src/core/types.ts';
import { arena, inp, makeWhite, ofType, press, run, sfxIds, tc, tf } from './sim-helpers.ts';

const vines: SimSpawn = { kind: 'prop', id: 'vines1', prop: 'vines', tx: 8, ty: 6, w: 32, h: 16, hitBy: 'burn' };
const firebox: SimSpawn = { kind: 'prop', id: 'firebox1', prop: 'firebox', tx: 12, ty: 4, w: 16, h: 16, hitBy: 'shoot' };
const van = (extra: Partial<Extract<SimSpawn, { kind: 'prop' }>> = {}): SimSpawn =>
  ({ kind: 'prop', id: 'van1', prop: 'van', tx: 8, ty: 6, w: 32, h: 16, pushBy: 'push', ...extra });
/** Just south of a prop at tile row 6, with its middle straight ahead. */
const south = { x: tc(9), y: tf(8) };
const lead = (id: HeroId) => ({ party: [{ id, level: 4 }] });
const faceUp = { my: -0.2 };
const swingUp = { ...faceUp, attackPressed: true };
const sprayUp = { ...faceUp, specialPressed: true };
const pokes = (ev: SimEvent[]): { propId: string; hero: HeroId }[] => ofType(ev, 'poked').map((e) => ({ propId: e.propId, hero: e.hero }));
const propOf = (sim: ReturnType<typeof makeWhite>['sim'], id: string) => sim.view().props.find((p) => p.id === id)!;

// ---------------------------------------------------------------- vines
test('vines: Dustin\'s spray sets them alight with a sizzle and flames, and they are gone 30 frames later', () => {
  const { sim, s } = makeWhite({ ...lead('dustin'), spawns: [vines], start: south });
  assert.equal(s.props[0]?.solid, true, 'they block the door');
  const frames: SimEvent[][] = [];
  frames.push(sim.step(inp(sprayUp)));
  for (let i = 0; i < 70; i++) frames.push(sim.step(inp()));
  const burnAt = frames.findIndex((ev) => sfxIds(ev).includes('sizzle'));
  const clearAt = frames.findIndex((ev) => ofType(ev, 'propCleared').length > 0);
  assert.ok(burnAt > 0, 'a sizzle');
  assert.equal(clearAt - burnAt, 30, 'propCleared comes after the burn');
  assert.deepEqual(frames.flatMap((ev) => ofType(ev, 'propCleared')), [{ t: 'propCleared', propId: 'vines1' }], 'once');
  assert.equal(ofType(frames.flat(), 'targetHit').length, 0, 'it is cleared, not lit');
  assert.equal(propOf(sim, 'vines1').state, 'open');
  assert.equal(s.props[0]?.solid, false, 'and no longer in the way');
});

test('vines: while they burn they are still there, with flames drawn along them, and then the way is open', () => {
  const { sim, s } = makeWhite({ ...lead('dustin'), spawns: [vines], start: south });
  press(sim, sprayUp, 14);
  assert.equal(propOf(sim, 'vines1').state, 'lit', 'burning');
  assert.equal(s.props[0]?.solid, true, 'still solid while they burn');
  const flames = sim.view().fx.filter((f) => f.kind === 'flame' && f.life === 30);
  assert.ok(flames.length >= 2, `${flames.length} flames along a 32 px wall`);
  assert.ok(flames.every((f) => f.x >= 128 && f.x <= 160 && Math.abs(f.y - 110) <= 4), 'on the vines');
  run(sim, 40);
  const walk = inp({ my: -1 });
  const y0 = sim.heroPos().y;
  run(sim, 60, walk);
  assert.ok(y0 - sim.heroPos().y > 45, 'he walks through where they were');
});

test('vines: they stop a walk, a swing, a shot and a push, and only report the try', () => {
  const stands = makeWhite({ ...lead('mike'), spawns: [vines], start: south });
  run(stands.sim, 90, inp({ my: -1 }));
  assert.ok(stands.sim.heroPos().y >= 119.5, `a closed wall: he stops at ${stands.sim.heroPos().y.toFixed(1)}, under its 112 px edge`);
  for (const hero of ['mike', 'lucas', 'eleven'] as const) {
    const { sim, s } = makeWhite({ ...lead(hero), spawns: [vines], start: south });
    const ev = press(sim, swingUp, 30);
    assert.deepEqual(pokes(ev), [{ propId: 'vines1', hero }], `${hero}`);
    assert.equal(s.props[0]?.state, 'closed');
    assert.equal(ofType(ev, 'propCleared').length, 0);
    assert.ok(!sfxIds(ev).includes('sizzle'));
  }
});

test('vines: flags clear them at once, and a retry that has them open starts that way', () => {
  const { sim, s } = makeWhite({ ...lead('mike'), spawns: [vines], start: south });
  sim.openProp('vines1');
  const ev = run(sim, 2);
  assert.deepEqual(ofType(ev, 'propCleared'), [{ t: 'propCleared', propId: 'vines1' }]);
  assert.equal(s.props[0]?.solid, false);
  const again = makeWhite({ ...lead('mike'), spawns: [vines], start: south, openProps: ['vines1'] });
  assert.equal(again.s.props[0]?.state, 'open');
  assert.equal(again.s.props[0]?.solid, false);
  assert.equal(propOf(again.sim, 'vines1').state, 'open');
});

// ---------------------------------------------------------------- fire-door box
const counter = arena(24, 16, { '11,5': 'T', '12,5': 'T', '13,5': 'T' });
const shooter = { x: tc(12), y: tf(9) };

test('firebox: Lucas\'s shot lights it over the counter, like the 1.2 relay: targetHit and lit', () => {
  const { sim, s } = makeWhite({ ...lead('lucas'), grid: counter, spawns: [firebox], start: shooter });
  assert.equal(s.props[0]?.solid, false, 'it hangs on a wall face; the wall is the tile');
  const ev = press(sim, swingUp, 60);
  assert.deepEqual(ofType(ev, 'targetHit'), [{ t: 'targetHit', propId: 'firebox1' }]);
  assert.equal(propOf(sim, 'firebox1').state, 'lit');
  assert.ok(sfxIds(ev).includes('targetHit'));
});

test('firebox: a swing, a push or a flame is only a try, and a lit box is not tried again', () => {
  for (const [hero, input] of [['mike', swingUp], ['eleven', swingUp], ['dustin', sprayUp]] as const) {
    const { sim, s } = makeWhite({ ...lead(hero), grid: counter, spawns: [firebox], start: { x: tc(12), y: tf(6) } });
    const ev = press(sim, input, 40);
    assert.deepEqual(pokes(ev), [{ propId: 'firebox1', hero }], hero);
    assert.equal(s.props[0]?.state, 'closed');
    assert.equal(ofType(ev, 'targetHit').length, 0);
  }
  const lit = makeWhite({ ...lead('lucas'), grid: counter, spawns: [{ ...firebox, state: 'lit' }], start: shooter });
  assert.deepEqual(pokes(press(lit.sim, swingUp, 20)), []);
});

test('firebox: a flag lights it, and a retry that has it lit starts that way', () => {
  const { sim } = makeWhite({ ...lead('mike'), grid: counter, spawns: [firebox], start: shooter });
  sim.openProp('firebox1');
  assert.deepEqual(ofType(run(sim, 2), 'targetHit'), [{ t: 'targetHit', propId: 'firebox1' }]);
  assert.equal(propOf(sim, 'firebox1').state, 'lit');
  const again = makeWhite({ ...lead('mike'), grid: counter, spawns: [firebox], start: shooter, openProps: ['firebox1'] });
  assert.equal(propOf(again.sim, 'firebox1').state, 'lit');
});

// ---------------------------------------------------------------- van
test('van: Eleven\'s push clears it like the 1.2 crate, and it is no longer solid', () => {
  const events = (spawn: SimSpawn): string[] => {
    const { sim } = makeWhite({ ...lead('eleven'), spawns: [spawn], start: south });
    const ev = press(sim, swingUp, 30);
    return ev.filter((e) => e.t === 'propCleared' || (e.t === 'sfx' && e.id === 'logPush')).map((e) => (e.t === 'sfx' ? e.id : `${e.t}:${(e as { propId: string }).propId}`));
  };
  const crate = events({ kind: 'prop', id: 'van1', prop: 'crate', tx: 8, ty: 6, w: 32, h: 16, pushBy: 'push' });
  assert.deepEqual(events(van()), crate);
  assert.deepEqual(crate.sort(), ['logPush', 'propCleared:van1']);
  const { sim, s } = makeWhite({ ...lead('eleven'), spawns: [van()], start: south });
  assert.equal(s.props[0]?.solid, true);
  press(sim, swingUp, 30);
  assert.equal(propOf(sim, 'van1').state, 'open');
  assert.equal(s.props[0]?.solid, false);
});

test('van: anyone else trying it gets a poke and nothing moves; a van that asks for nothing is just a van', () => {
  for (const hero of ['mike', 'dustin', 'lucas'] as const) {
    const { sim, s } = makeWhite({ ...lead(hero), spawns: [van()], start: south });
    const ev = press(sim, swingUp, 30);
    assert.deepEqual(pokes(ev), [{ propId: 'van1', hero }], hero);
    assert.equal(s.props[0]?.state, 'closed');
  }
  const decor = makeWhite({ ...lead('eleven'), spawns: [van({ pushBy: undefined })], start: south });
  const ev = press(decor.sim, swingUp, 30);
  assert.deepEqual(pokes(ev), []);
  assert.equal(ofType(ev, 'propCleared').length, 0, 'her push does not move a van that was not asked to move');
  assert.equal(decor.s.props[0]?.solid, true);
});

test('van: leaning on it for a third of a second is a try', () => {
  const { sim } = makeWhite({ ...lead('mike'), spawns: [van()], start: south });
  const ev = run(sim, 60, inp({ my: -1 }));
  assert.deepEqual(pokes(ev), [{ propId: 'van1', hero: 'mike' }]);
});
