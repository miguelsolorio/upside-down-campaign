import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.ts';
import { buildGrid } from '../src/core/tiles.ts';
import { footBlocked } from '../src/combat/space.ts';
import { buildSim } from '../src/combat/sim.ts';
import { agent, rat, tc, tf } from './sim-helpers.ts';
import type { SimInput, SimSpawn } from '../src/core/types.ts';

function level(): ReturnType<typeof buildGrid> {
  const rows: string[] = [];
  for (let y = 0; y < 22; y++) {
    let row = '';
    for (let x = 0; x < 40; x++) {
      let c = '.';
      if (x === 0 || y === 0 || x === 39 || y === 21) c = 'T';
      else if (x === 20 && y !== 11 && y !== 12) c = '~';
      else if ((x * 5 + y * 11) % 23 === 0) c = 'b';
      row += c;
    }
    rows.push(row);
  }
  return buildGrid(rows);
}

function randomInput(rng: () => number, prev: SimInput): SimInput {
  const hold = rng() < 0.8;
  const pick = (): number => (rng() < 0.5 ? 0 : rng() < 0.5 ? -1 : 1);
  return {
    mx: hold ? prev.mx : pick() * (rng() < 0.2 ? 0.3 : 1),
    my: hold ? prev.my : pick() * (rng() < 0.2 ? 0.3 : 1),
    attackHeld: rng() < 0.5, attackPressed: rng() < 0.2,
    specialPressed: rng() < 0.05, specialHeld: false,
    dashPressed: rng() < 0.04,
    swapDelta: rng() < 0.02 ? (rng() < 0.5 ? -1 : 1) : 0,
    swapTo: rng() < 0.02 ? Math.floor(rng() * 5) - 1 : -1,
    burstPressed: rng() < 0.05,
  };
}

test('fuzz: random play never breaks an invariant', () => {
  const spawns: SimSpawn[] = [
    { kind: 'prop', id: 'gate1', prop: 'gate', tx: 10, ty: 8 },
    { kind: 'prop', id: 'log1', prop: 'log', tx: 14, ty: 8 },
    { kind: 'prop', id: 'target1', prop: 'target', tx: 24, ty: 8 },
    { kind: 'npc', id: 'eleven', tx: 6, ty: 10, dir: 'right' },
    { kind: 'item', id: 'i1', item: 'eggo', tx: 8, ty: 11 },
    { kind: 'item', id: 'i2', item: 'coke', tx: 9, ty: 12 },
    { kind: 'item', id: 'i3', item: 'quarter', tx: 12, ty: 11 },
  ];
  for (let i = 0; i < 6; i++) spawns.push(rat(`r${i}`, 15 + i, 5 + i, 'rats', { dormant: i >= 4 }));
  for (let i = 0; i < 6; i++) {
    spawns.push(agent(`a${i}`, 26 + (i % 3) * 2, 6 + i * 2, 'agents', { dormant: i >= 3, patrol: i < 3 ? [{ tx: 26, ty: 6 + i * 2 }, { tx: 30, ty: 6 + i * 2 }] : undefined }));
  }
  for (const difficulty of ['kid', 'chief', 'upside'] as const) {
    for (let seed = 1; seed <= 6; seed++) {
      const { sim, s } = buildSim({
        grid: level(), party: [{ id: 'mike' }, { id: 'dustin' }, { id: 'lucas' }],
        start: { x: tc(3), y: tf(11) }, spawns, difficulty, seed,
      });
      const rng = createRng(seed * 7919);
      let input: SimInput = randomInput(rng, { mx: 0, my: 0 } as SimInput);
      for (let f = 0; f < 2400; f++) {
        if (f % 5 === 0) input = randomInput(rng, input);
        if (f === 300) sim.spawnGroup('rats');
        if (f === 600) sim.recruit('eleven');
        if (f === 900) sim.spawnGroup('agents');
        if (f === 1200) sim.openProp('log1');
        if (f === 1500) sim.openProp('gate1');
        if (f === 1800) sim.healParty(0.5);
        if (f === 2000) sim.dev.giveXp(200);
        const ev = sim.step(input);
        for (const e of ev) {
          assert.ok(typeof e.t === 'string');
          if (e.t === 'hit') assert.ok(Number.isFinite(e.dmg) && e.dmg >= 1, `bad damage ${e.dmg}`);
        }
        const v = sim.view();
        for (const a of v.actors) {
          assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z), `bad actor ${a.id} ${a.x},${a.y}`);
          assert.ok(a.flash >= 0 && a.flash <= 1);
        }
        for (const h of s.heroes) {
          assert.ok(Number.isFinite(h.hp) && h.hp >= 0 && h.hp <= h.st.hp + 1e-6, `hp ${h.hp}/${h.st.hp}`);
          assert.ok(h.mp >= 0 && h.mp <= h.st.mp + 1e-6, `mp ${h.mp}/${h.st.mp}`);
          assert.ok(h.level >= 1 && h.level <= 12);
        }
        const act = s.heroes[s.active]!;
        if (!s.over) assert.ok(!act.ko, 'the active hero is never KO unless the run is over');
        if (!act.ko) assert.ok(!footBlocked(s, act.x, act.y) || f < 5, `hero stuck in a wall at ${act.x},${act.y} frame ${f}`);
        assert.ok(s.burst >= 0 && s.burst <= 1);
        assert.ok(v.hud.burst >= 0 && v.hud.burst <= 1);
        assert.ok(s.fx.length <= 80 && s.floaters.length <= 40);
        assert.ok(Number.isFinite(v.focus.x) && Number.isFinite(v.focus.y));
        assert.equal(sim.enemiesAlive(), s.enemies.filter((e) => !e.dead).length);
        if (s.over) break;
      }
    }
  }
});

test('fuzz: a god-mode hero cannot be hurt, and the sim stays valid without any input', () => {
  const { sim } = buildSim({
    grid: level(), party: [{ id: 'eleven' }], start: { x: tc(3), y: tf(11) }, god: true, difficulty: 'upside', seed: 3,
    spawns: [rat('r', 4, 11), rat('r2', 4, 12), agent('a', 8, 11)],
  });
  for (let f = 0; f < 1500; f++) sim.step({ mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, dashPressed: false, swapDelta: 0, swapTo: -1, burstPressed: false });
  assert.equal(sim.stats().damageTaken, 0);
  assert.equal(sim.party()[0]?.hp, sim.party()[0]?.hpMax);
  sim.dev.god = false;
  assert.equal(sim.dev.god, false);
});
