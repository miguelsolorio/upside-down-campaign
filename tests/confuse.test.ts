// The confusion brain (combat/confuse.ts, docs/level-7.md): a confused enemy forgets the party, walks to the nearest other enemy and
// bump-attacks it, whatever its kind. Robin's Word vomit is what confuses them (tests/robin-nancy.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EnemyKind, SimInput, SimSpawn } from '../src/core/types.ts';
import { createRng } from '../src/core/rng.ts';
import { buildSim } from '../src/combat/sim.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { confuse } from '../src/combat/confuse.ts';
import { damageRange } from '../src/combat/damage.ts';
import type { Enemy } from '../src/combat/state.ts';
import { arena, inp, makeWhite, ofType, run, tc, tf } from './sim-helpers.ts';

const enemy = (s: { enemies: Enemy[] }, i: number): Enemy => s.enemies[i] as Enemy;
const unit = (id: string, type: EnemyKind, tx: number, ty: number, extra: Partial<Extract<SimSpawn, { kind: 'enemy' }>> = {}): SimSpawn =>
  ({ kind: 'enemy', id, type, tx, ty, group: 'g', ...extra });

test('a confused enemy walks to the nearest other enemy, winds up for 20 frames under the "!", and bumps it for ATK x 0.8 against its DEF', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'robin', level: 2 }], god: true, start: { x: tc(2), y: tf(13) },
    spawns: [unit('bumper', 'rat', 8, 6), unit('mark', 'agent', 10, 6), unit('far', 'rat', 20, 10)],
  });
  const [bumper, mark] = [enemy(s, 0), enemy(s, 1)];
  mark.stat.stun = 99999;
  s.enemies[2]!.dormant = true;
  confuse(s, bumper, 600);
  const startHp = mark.hp;
  const alerts: boolean[] = [];
  let bumpedAt = -1, dmg = 0;
  for (let i = 0; i < 160; i++) {
    sim.step(inp());
    alerts.push(sim.view().actors.find((a) => a.id === 'rat')?.alert === true);
    if (bumpedAt < 0 && mark.hp < startHp) { bumpedAt = i; dmg = startHp - mark.hp; }
  }
  assert.ok(bumpedAt > 0, 'it reached the agent and bumped it');
  const range = damageRange(0.8, bumper.atk, mark.def);
  assert.ok(dmg >= range.min && dmg <= range.max, `bump of ${dmg}, expected ${range.min} to ${range.max}`);
  const first = alerts.indexOf(true);
  const run20 = alerts.slice(first, first + 24);
  assert.equal(run20.filter(Boolean).length, 20, 'the "!" shows for 20 frames');
  assert.equal(bumpedAt, first + 20, 'and the bump lands as it ends');
});

test('a confused enemy never goes for the hero, whatever its kind, and does nothing with nobody to fight', () => {
  const kinds: EnemyKind[] = ['rat', 'agent', 'guard', 'melter', 'flayed', 'soldier', 'demodog'];
  for (const type of kinds) {
    const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 6 }], start: { x: tc(4), y: tf(8) }, spawns: [unit('e', type, 5, 8)] });
    confuse(s, enemy(s, 0), 600);
    const hp = s.heroes[0]!.hp;
    run(sim, 400);
    assert.equal(s.heroes[0]!.hp, hp, `${type} left the hero alone`);
  }
});

test('any kind of confused enemy bumps a neighbour: the brain is shared', () => {
  const kinds: EnemyKind[] = ['rat', 'agent', 'guard', 'warden', 'melter', 'flayed', 'soldier', 'demodog'];
  for (const type of kinds) {
    const { sim, s } = makeWhite({
      party: [{ id: 'mike', level: 6 }], god: true, start: { x: tc(2), y: tf(13) },
      spawns: [unit('c', type, 8, 6), unit('t', 'flayed', 11, 6)],
    });
    enemy(s, 1).stat.stun = 99999;
    enemy(s, 1).hp = enemy(s, 1).hpMax = 9999;
    confuse(s, enemy(s, 0), 900);
    run(sim, 300);
    assert.ok(enemy(s, 1).hp < 9999, `a confused ${type} bumped it (${ENEMY_DEFS[type].name})`);
  }
});

test('two confused enemies fight each other, and a kill by a bump pays XP and fires the kill event', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike', level: 6 }], god: true, start: { x: tc(2), y: tf(13) },
    spawns: [unit('a', 'flayed', 8, 6), unit('b', 'rat', 10, 6)],
  });
  enemy(s, 1).hp = enemy(s, 1).hpMax = 4;
  confuse(s, enemy(s, 0), 900);
  const ev = run(sim, 300);
  assert.equal(ofType(ev, 'kill').filter((k) => k.spawnId === 'b').length, 1);
  assert.ok(sim.stats().xpEarned >= ENEMY_DEFS.rat.xp);
});

test('hurting a confused enemy does not end it', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 3 }], start: { x: tc(4), y: tf(8) }, spawns: [unit('a', 'flayed', 5, 8)] });
  const e = enemy(s, 0);
  e.hp = e.hpMax = 9999;
  confuse(s, e, 600);
  const before = e.hp;
  run(sim, 30, inp({ attackHeld: true, mx: 0.2 }));
  assert.ok(e.hp < before, 'the bat landed');
  assert.ok(e.stat.confuse > 0, 'and it is still confused');
  assert.equal(sim.view().actors.find((a) => a.id === 'flayed')?.confused, true);
});

test('when the confusion ends the enemy goes back to its own brain and hunts the hero again', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike', level: 6 }], start: { x: tc(4), y: tf(8) }, spawns: [unit('a', 'rat', 6, 8)] });
  confuse(s, enemy(s, 0), 60);
  const hp = s.heroes[0]!.hp;
  run(sim, 59);
  assert.equal(s.heroes[0]!.hp, hp, 'harmless while it lasts');
  assert.ok(run(sim, 200).some((e) => e.t === 'hit' && !e.onEnemy), 'and biting again after');
});

test('a confused enemy does not pick a boss or a sleeper to fight', () => {
  const { sim, s } = makeWhite({
    party: [{ id: 'mike', level: 6 }], god: true, start: { x: tc(2), y: tf(13) },
    spawns: [unit('c', 'rat', 8, 6), unit('boss', 'agent', 10, 6, { group: 'boss' }), unit('sleep', 'agent', 9, 7, { dormant: true })],
  });
  for (const e of s.enemies) e.hp = e.hpMax = 9999;
  confuse(s, enemy(s, 0), 600);
  run(sim, 300);
  assert.equal(enemy(s, 1).hp, 9999, 'the boss is left alone');
  assert.equal(enemy(s, 2).hp, 9999, 'and so is the sleeper');
});


test('fuzz: Robin, Nancy, a stash and a cipher door under random play against every kind never break an invariant', () => {
  const kinds: EnemyKind[] = ['rat', 'agent', 'guard', 'melter', 'flayed', 'soldier', 'demodog'];
  for (let seed = 1; seed <= 6; seed++) {
    const spawns: SimSpawn[] = [{ kind: 'prop', id: 'c1', prop: 'cipher', tx: 20, ty: 8, w: 32, h: 16 }];
    kinds.forEach((k, i) => {
      spawns.push(unit(`e${i}`, k, 14 + (i % 4) * 2, 5 + i), unit(`f${i}`, k, 16 + (i % 3) * 2, 6 + i));
    });
    spawns.push(unit('boss', 'demogorgon', 30, 8, { group: 'boss', dormant: true }));
    const { sim, s } = buildSim({
      grid: arena(40, 22), start: { x: tc(3), y: tf(11) }, spawns, seed, stash: { eggo: 3, coke: 3 },
      party: [{ id: seed % 2 ? 'robin' : 'nancy', level: 1 + (seed % 5) }, { id: seed % 2 ? 'nancy' : 'robin', level: 3 }, { id: 'mike', level: 4 }],
    });
    const rng = createRng(seed * 31);
    let input: SimInput = inp();
    for (let f = 0; f < 3000 && !s.over; f++) {
      if (f % 6 === 0) {
        input = inp({
          mx: rng() < 0.5 ? 1 : rng() < 0.5 ? -1 : 0, my: rng() < 0.5 ? 0 : rng() < 0.5 ? -1 : 1, attackHeld: rng() < 0.5,
          attackPressed: rng() < 0.2, specialPressed: rng() < 0.25, swapDelta: rng() < 0.03 ? 1 : 0, burstPressed: rng() < 0.03,
        });
      }
      if (f === 50) sim.spawnGroup('boss');
      for (const e of sim.step(input)) if (e.t === 'hit') assert.ok(Number.isFinite(e.dmg) && e.dmg >= 1);
      for (const a of sim.view().actors) assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), `${a.id} at ${a.x},${a.y} on frame ${f}`);
      for (const e of s.enemies) assert.ok(Number.isFinite(e.hp) && e.stat.confuse >= 0 && e.stat.slow >= 0 && e.stat.stun >= 0, `${e.kind} on frame ${f}`);
      assert.ok(s.traps.length <= 2);
      assert.ok(s.stash.eggo >= 0 && s.stash.coke >= 0);
      for (const h of s.heroes) assert.ok(h.mp >= 0 && h.mp <= h.st.mp + 1e-6 && h.hp >= 0 && h.hp <= h.st.hp + 1e-6);
      const k = sim.view().props[0]?.k ?? 0;
      assert.ok(k >= 0 && k <= 1, `k ${k}`);
    }
  }
});
