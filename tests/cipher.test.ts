// The cipher door (docs/level-8.md): a steel door that Robin decodes by standing within 40 px, 1/45 a frame, and that loses its
// progress at 1/90 a frame when she steps away. Anyone else who pushes it or hits it is "trying it".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { HeroId, SimEvent, SimSpawn } from '../src/core/types.ts';
import { inp, makeWhite, ofType, press, run, sfxIds } from './sim-helpers.ts';

/** Across a corridor: x 160..192, y 96..112. */
const door: SimSpawn = { kind: 'prop', id: 'cipher1', prop: 'cipher', tx: 10, ty: 6, w: 32, h: 16 };
/** Across a corridor that runs north and south: x 160..176, y 96..128. */
const tall: SimSpawn = { kind: 'prop', id: 'cipher1', prop: 'cipher', tx: 10, ty: 6, w: 16, h: 32 };
const lead = (id: HeroId, level = 4) => ({ party: [{ id, level }] });
const pokes = (ev: SimEvent[]): { propId: string; hero: HeroId }[] => ofType(ev, 'poked').map((e) => ({ propId: e.propId, hero: e.hero }));
/** West of the door at `dx` px from its nearest edge, level with its middle. */
const west = (dx: number) => ({ x: 160 - dx, y: 108 });
const kOf = (sim: ReturnType<typeof makeWhite>['sim']): number | undefined => sim.view().props.find((p) => p.id === 'cipher1')?.k;

test('cipher: spawned shut, solid, hitBy read, and its decode progress starts at 0', () => {
  const { sim, s } = makeWhite({ ...lead('robin'), spawns: [door], start: west(80) });
  const p = s.props[0]!;
  assert.equal(p.kind, 'cipher');
  assert.equal(p.hitBy, 'read');
  assert.equal(p.solid, true);
  assert.equal(p.state, 'closed');
  const v = sim.view().props[0]!;
  assert.equal(v.kind, 'cipher');
  assert.equal(v.k ?? 0, 0);
});

test('cipher: Robin within 40 px climbs k by 1/45 a frame and opens it at 1: decode, a reveal, propCleared once, open and walkable', () => {
  const { sim, s } = makeWhite({ ...lead('robin'), spawns: [door], start: west(30) });
  const seen: number[] = [];
  const events: SimEvent[] = [];
  for (let i = 0; i < 44; i++) { events.push(...sim.step(inp())); seen.push(kOf(sim) ?? -1); }
  assert.ok(Math.abs((seen[0] as number) - 1 / 45) < 1e-9, `one frame in: ${seen[0]}`);
  assert.ok(Math.abs((seen[21] as number) - 22 / 45) < 1e-9, `22 frames in: ${seen[21]}`);
  assert.ok(seen.every((k, i) => i === 0 || k > (seen[i - 1] as number)), 'it climbs every frame');
  assert.equal(ofType(events, 'propCleared').length, 0, 'not yet');
  assert.equal(s.props[0]?.state, 'closed');
  events.push(...sim.step(inp()));
  assert.deepEqual(ofType(events, 'propCleared'), [{ t: 'propCleared', propId: 'cipher1' }], 'once, on the 45th frame');
  assert.ok(sfxIds(events).includes('decode'));
  const view = sim.view();
  assert.equal(view.props[0]?.state, 'open');
  assert.equal(view.props[0]?.k, 1);
  assert.equal(s.props[0]?.solid, false);
  const fx = view.fx.find((f) => f.kind === 'reveal');
  assert.ok(fx && Math.abs(fx.x - 176) < 1 && Math.abs(fx.y - 104) < 1 && fx.w === 32 && fx.h === 16, 'a reveal fx over the door');
  // Open for good, and it does not clear twice.
  assert.equal(ofType(run(sim, 120), 'propCleared').length, 0);
  run(sim, 120, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x > 200, 'she walks through where it was');
});

test('cipher: stepping away loses progress at 1/90 a frame, and coming back picks up from there', () => {
  const { sim } = makeWhite({ ...lead('robin'), spawns: [door], start: west(30) });
  run(sim, 30);
  const k0 = kOf(sim) as number;
  assert.ok(Math.abs(k0 - 30 / 45) < 1e-9);
  // Out of range: teleport 60 px off.
  sim.dev.teleport(160 - 100, 108);
  run(sim, 45);
  const k1 = kOf(sim) as number;
  assert.ok(Math.abs(k1 - (k0 - 45 / 90)) < 1e-9, `fell by half a door: ${k1}`);
  run(sim, 200);
  assert.equal(kOf(sim), 0, 'and never below 0');
  sim.dev.teleport(160 - 30, 108);
  run(sim, 20);
  assert.ok(Math.abs((kOf(sim) as number) - 20 / 45) < 1e-9);
});

test('cipher: the line is 40 px from the door, and only the active hero counts', () => {
  const near = makeWhite({ ...lead('robin'), spawns: [door], start: west(39) });
  run(near.sim, 5);
  assert.ok((kOf(near.sim) ?? 0) > 0, '39 px');
  const far = makeWhite({ ...lead('robin'), spawns: [door], start: west(42) });
  run(far.sim, 5);
  assert.equal(kOf(far.sim) ?? 0, 0, '42 px');
  // Robin on the bench, standing beside it, does nothing: Mike is the one in front.
  const bench = makeWhite({ party: [{ id: 'mike', level: 5 }, { id: 'robin', level: 4 }], spawns: [door], start: west(30) });
  assert.equal(ofType(run(bench.sim, 120), 'propCleared').length, 0);
  assert.equal(kOf(bench.sim) ?? 0, 0);
  // Swapping her in with the door in reach starts the decoding.
  const ev = [...bench.sim.step(inp({ swapTo: 1 })), ...run(bench.sim, 60)];
  assert.equal(ofType(ev, 'propCleared').length, 1);
});

test('cipher: a door running north and south reads the same way', () => {
  const { sim } = makeWhite({ ...lead('robin'), spawns: [tall], start: { x: 160 - 30, y: 124 } });
  assert.equal(ofType(run(sim, 50), 'propCleared').length, 1);
});

test('cipher: it is a wall until it opens', () => {
  // Mike has no read, so the door stays shut and he is stopped by it.
  const { sim, s } = makeWhite({ ...lead('mike'), spawns: [door], start: west(60) });
  run(sim, 120, inp({ mx: 1 }));
  assert.ok(sim.heroPos().x < 160, `stopped at the door, at ${sim.heroPos().x}`);
  assert.equal(s.props[0]?.state, 'closed');
});

test('cipher: Mike, Dustin and Lucas next to it never open it, whatever they do', () => {
  for (const hero of ['mike', 'dustin', 'lucas', 'eleven', 'will'] as const) {
    const { sim, s } = makeWhite({ ...lead(hero), spawns: [door], start: west(20) });
    const ev = [...run(sim, 90), ...press(sim, { attackPressed: true, mx: 0.2 }, 60), ...press(sim, { specialPressed: true }, 60)];
    assert.equal(ofType(ev, 'propCleared').length, 0, hero);
    assert.equal(s.props[0]?.state, 'closed', hero);
    assert.equal(kOf(sim) ?? 0, 0, hero);
  }
});

test('cipher: the wrong hero pushing against it for 20 frames, or swinging or firing at it, is a try', () => {
  for (const hero of ['mike', 'lucas', 'eleven'] as const) {
    const { sim } = makeWhite({ ...lead(hero), spawns: [door], start: west(20) });
    const push = run(sim, 60, inp({ mx: 1 }));
    assert.deepEqual(pokes(push), [{ propId: 'cipher1', hero }], `${hero} leaning on it`);
    const swing = press(sim, { mx: 0.2, attackPressed: true }, 2);
    assert.ok(pokes(swing).every((p) => p.propId === 'cipher1' && p.hero === hero), `${hero} swinging`);
  }
  const shot = makeWhite({ ...lead('lucas'), spawns: [door], start: west(70) });
  assert.deepEqual(pokes(press(shot.sim, { mx: 0.2, attackPressed: true }, 2)), [{ propId: 'cipher1', hero: 'lucas' }], 'a rocket down the corridor');
});

test('cipher: Robin, who reads it, is never a try, even when she walks into it while it decodes', () => {
  const { sim } = makeWhite({ ...lead('robin'), spawns: [door], start: west(30) });
  const ev = [...run(sim, 10, inp({ mx: 1 })), ...press(sim, { mx: 0.2, attackPressed: true }, 4), ...run(sim, 60)];
  assert.deepEqual(pokes(ev), []);
  assert.equal(ofType(ev, 'propCleared').length, 1);
});

test('cipher: a try with the wrong hero stands up a knocked-out Robin, so the door never waits on her', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 5 }, { id: 'robin', level: 4 }], spawns: [door], start: west(20) });
  const robin = s.heroes[1]!;
  robin.ko = true; robin.hp = 0;
  run(sim, 60, inp({ mx: 1 }));
  assert.equal(robin.ko, false);
  assert.ok(robin.hp > 0);
});

test('cipher: a flag opens it at once, and a retry that has it open starts that way', () => {
  const { sim, s } = makeWhite({ ...lead('mike'), spawns: [door], start: west(80) });
  sim.openProp('cipher1');
  const ev = run(sim, 2);
  assert.deepEqual(ofType(ev, 'propCleared'), [{ t: 'propCleared', propId: 'cipher1' }]);
  assert.ok(sfxIds(ev).includes('decode'));
  assert.equal(s.props[0]?.solid, false);
  assert.equal(kOf(sim), 1);
  run(sim, 30);
  assert.equal(ofType(run(sim, 1), 'propCleared').length, 0, 'opening it twice says nothing the second time');
  const again = makeWhite({ ...lead('mike'), spawns: [door], start: west(80), openProps: ['cipher1'] });
  assert.equal(again.s.props[0]?.state, 'open');
  assert.equal(again.s.props[0]?.solid, false);
  assert.equal(kOf(again.sim), 1);
});

test('cipher: closeProp shuts it again with its progress gone', () => {
  const { sim, s } = makeWhite({ ...lead('robin'), spawns: [door], start: west(30) });
  run(sim, 60);
  assert.equal(s.props[0]?.state, 'open');
  sim.dev.teleport(80, 140);
  sim.closeProp('cipher1');
  run(sim, 2);
  assert.equal(s.props[0]?.state, 'closed');
  assert.equal(s.props[0]?.solid, true);
  assert.equal(kOf(sim), 0);
});
