// Elite tier: `tier: 'elite'` on any enemy spawn. HP x1.9, ATK x1.6, speed x1.1, cooldown x0.75, XP x2, quarter drops x2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_DEFS, ELITE } from '../src/enemies/index.ts';
import { hitEnemy } from '../src/combat/damage.ts';
import { agent, inp, makeWhite, ofType, rat, run, tc, tf } from './sim-helpers.ts';
import { guardAt } from './guard-helpers.ts';
import type { SimSpawn } from '../src/core/types.ts';

const elite = (s: SimSpawn): SimSpawn => ({ ...s, tier: 'elite' } as SimSpawn);

test('elite: the scale factors are the contract numbers', () => {
  assert.deepEqual({ ...ELITE }, { hp: 1.9, atk: 1.6, speed: 1.1, cooldown: 0.75, xp: 2, drop: 2 });
});

test('elite: HP, ATK, speed, cooldown, XP and drop chance scale on any kind, and difficulty still applies', () => {
  for (const [kind, spawn] of [['agent', agent('e', 12, 4)], ['rat', rat('e', 12, 4)], ['guard', guardAt(12, 4, { id: 'e' })]] as const) {
    const def = ENEMY_DEFS[kind];
    const plain = makeWhite({ spawns: [spawn] }).s.enemies[0]!;
    const tough = makeWhite({ spawns: [elite(spawn)] }).s.enemies[0]!;
    assert.equal(plain.hpMax, def.hp, `${kind} plain HP`);
    assert.equal(tough.hpMax, Math.round(def.hp * 1.9), `${kind} elite HP`);
    assert.equal(plain.atk, def.atk);
    assert.ok(Math.abs(tough.atk - def.atk * 1.6) < 1e-9, `${kind} elite ATK ${tough.atk}`);
    assert.equal(tough.def, def.def, 'DEF is unchanged');
    assert.equal(plain.spd, 1);
    assert.equal(tough.spd, 1.1);
    assert.equal(plain.cdMul, 1);
    assert.equal(tough.cdMul, 0.75);
    assert.equal(plain.xp, def.xp);
    assert.equal(tough.xp, def.xp * 2);
    assert.ok(Math.abs(tough.drop - def.drop * 2) < 1e-9, `${kind} elite drop ${tough.drop}`);
    assert.equal(plain.elite, false);
    assert.equal(tough.elite, true);
  }
  const upside = makeWhite({ spawns: [elite(agent('e', 12, 4))], difficulty: 'upside' }).s.enemies[0]!;
  assert.equal(upside.hpMax, Math.round(24 * 1.9 * 1.4), 'elite HP is scaled by difficulty too');
  const kid = makeWhite({ spawns: [elite(agent('e', 12, 4))], difficulty: 'kid' }).s.enemies[0]!;
  assert.equal(kid.hpMax, Math.round(24 * 1.9 * 0.7));
});

test('elite: the view marks it, and an ordinary enemy carries no mark', () => {
  const { sim } = makeWhite({ spawns: [elite(agent('e', 14, 4)), agent('p', 14, 12)] });
  const actors = sim.view().actors.filter((a) => a.kind === 'enemy');
  assert.equal(actors.length, 2);
  assert.equal(actors.filter((a) => a.elite === true).length, 1);
  assert.equal(actors.filter((a) => a.elite === undefined).length, 1);
});

test('elite: a kill pays double XP in the event and in the party', () => {
  for (const [spawn, base] of [[agent('a', 8, 8), 8], [rat('r', 8, 8), 4], [guardAt(8, 8), 24]] as const) {
    for (const tier of [false, true]) {
      const { sim, s } = makeWhite({ party: [{ id: 'mike' }], spawns: [tier ? elite(spawn) : spawn] });
      s.enemies[0]!.hp = 0;
      s.enemies[0]!.dormant = false;
      const ev = run(sim, 1);
      const kill = ofType(ev, 'kill')[0]!;
      assert.equal(kill.xp, tier ? base * 2 : base, `${kill.kind} ${tier ? 'elite' : 'plain'} kill event`);
      assert.equal(sim.stats().xpEarned, kill.xp, 'the party is paid the same');
    }
  }
});

test('elite: an elite rat covers ground 10 percent faster', () => {
  const walk = (tier: boolean): number => {
    const { sim, s } = makeWhite({
      party: [{ id: 'dustin' }], start: { x: tc(3), y: tf(8) },
      spawns: [tier ? elite(rat('r', 10, 8)) : rat('r', 10, 8)],
    });
    const r = s.enemies[0]!;
    r.dormant = false; r.aware = true; r.mode = 'chase'; r.cd = 9999;
    const x0 = r.x;
    run(sim, 20);
    return x0 - r.x;
  };
  const plain = walk(false), tough = walk(true);
  assert.ok(Math.abs(tough / plain - 1.1) < 0.02, `elite ${tough.toFixed(2)} px against ${plain.toFixed(2)} px`);
});

test('elite: an elite agent waits 75 frames between darts where a plain one waits 100, and its dart hits harder', () => {
  const firstCd = (tier: boolean): { cd: number; dmg: number } => {
    const { sim, s } = makeWhite({
      party: [{ id: 'mike', level: 3 }], start: { x: tc(4), y: tf(8) }, seed: 3,
      spawns: [tier ? elite(agent('a', 9, 8)) : agent('a', 9, 8)],
    });
    const a = s.enemies[0]!;
    let cd = 0, dmg = 0;
    for (let f = 0; f < 300 && dmg === 0; f++) {
      const wasWind = a.mode === 'windup';
      const ev = sim.step(inp());
      if (!wasWind && a.mode === 'windup') cd = a.cd;
      for (const h of ofType(ev, 'hit')) if (!h.onEnemy) dmg = h.dmg;
    }
    return { cd, dmg };
  };
  const plain = firstCd(false), tough = firstCd(true);
  assert.ok(plain.cd >= 90 && plain.cd <= 110, `plain cooldown ${plain.cd}`);
  assert.ok(tough.cd >= 65 && tough.cd <= 85, `elite cooldown ${tough.cd}`);
  assert.ok(tough.dmg > plain.dmg * 1.4, `elite dart ${tough.dmg}, plain dart ${plain.dmg}`);
});

test('elite: the same seed plays out the same twice', () => {
  const play = (): string => {
    const { sim } = makeWhite({ party: [{ id: 'mike' }, { id: 'dustin' }], spawns: [agent('a', 9, 8), rat('r', 8, 6), rat('q', 8, 10)], seed: 7 });
    let sig = '';
    for (let f = 0; f < 400; f++) {
      const ev = sim.step(inp({ attackHeld: f % 3 === 0, mx: f % 50 < 25 ? 0.5 : -0.5 }));
      for (const e of ev) if (e.t === 'hit' || e.t === 'kill') sig += `${f}${e.t}${'dmg' in e ? e.dmg : ''};`;
    }
    return sig + JSON.stringify(sim.party());
  };
  assert.equal(play(), play());
});

test('elite: a hit that kills an elite is worth its own XP even when a different enemy dies the same tick', () => {
  const { sim, s } = makeWhite({ party: [{ id: 'mike' }], spawns: [elite(agent('a', 8, 8)), agent('b', 9, 8)] });
  for (const e of s.enemies) { e.dormant = false; e.hp = 1; }
  const hero = s.heroes[0]!;
  hitEnemy(s, hero, s.enemies[0]!, { power: 1, angle: 0 });
  hitEnemy(s, hero, s.enemies[1]!, { power: 1, angle: 0 });
  const kills = ofType(run(sim, 8), 'kill');
  assert.deepEqual(kills.map((k) => k.xp).sort((x, y) => x - y), [8, 16]);
});
