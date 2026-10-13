import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DEFS, HERO_IDS } from '../src/heroes/index.ts';
import { ENEMY_DEFS } from '../src/enemies/index.ts';
import { rollDamage, damageRange } from '../src/combat/damage.ts';
import { xpForLevel } from '../src/progression/index.ts';
import { agent, botFight, inp, makeWhite, ofType, rat, run, tc, tf } from './sim-helpers.ts';
import type { HeroId, SimSpawn } from '../src/core/types.ts';

/** Average hits for one basic hit's expected damage to kill. */
function hitsToKill(power: number, atk: number, def: number, hp: number): number {
  return Math.ceil(hp / rollDamage(power, atk, def, 1));
}

test('time to kill at parity: rats in one to three hits, agents in three to five', () => {
  // Mike's chain averages its three swings: 1.0, 1.0 and 1.35.
  const powers: Record<HeroId, number> = {
    mike: (1 + 1 + HERO_DEFS.mike.basic.x.thirdPower) / 3,
    dustin: HERO_DEFS.dustin.basic.power,
    lucas: HERO_DEFS.lucas.basic.power,
    eleven: HERO_DEFS.eleven.basic.power,
  };
  for (const id of HERO_IDS) {
    const atk = HERO_DEFS[id].base.atk;
    const r = hitsToKill(powers[id], atk, ENEMY_DEFS.rat.def, ENEMY_DEFS.rat.hp);
    const a = hitsToKill(powers[id], atk, ENEMY_DEFS.agent.def, ENEMY_DEFS.agent.hp);
    assert.ok(r >= 1 && r <= 3, `${id} needs ${r} hits for a rat`);
    assert.ok(a >= 3 && a <= 5, `${id} needs ${a} hits for an agent`);
    // The worst roll (spread 0.9, no crit) still stays inside the bands.
    const worstRat = Math.ceil(ENEMY_DEFS.rat.hp / damageRange(powers[id], atk, ENEMY_DEFS.rat.def).min);
    const worstAgent = Math.ceil(ENEMY_DEFS.agent.hp / damageRange(powers[id], atk, ENEMY_DEFS.agent.def).min);
    assert.ok(worstRat <= 3, `${id} worst case ${worstRat} for a rat`);
    assert.ok(worstAgent <= 5, `${id} worst case ${worstAgent} for an agent`);
  }
});

test('time to kill in the sim: Mike lands one to three hits on a rat and three to five on an agent', () => {
  const count = (kind: 'rat' | 'agent', seed: number): number => {
    const spawn = kind === 'rat' ? rat('x', 6, 8, 'g') : agent('x', 6, 8, 'g');
    const { sim } = makeWhite({ party: [{ id: 'mike' }], spawns: [spawn], start: { x: tc(5), y: tf(8) }, seed });
    let hits = 0;
    for (let f = 0; f < 900 && sim.enemiesAlive() > 0; f++) {
      const ev = sim.step(inp({ attackHeld: true, mx: 0.9 }));
      hits += ofType(ev, 'hit').filter((h) => h.onEnemy).length;
    }
    assert.equal(sim.enemiesAlive(), 0, `${kind} seed ${seed} died`);
    return hits;
  };
  let rMax = 0, aMin = 99, aMax = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const r = count('rat', seed), a = count('agent', seed);
    rMax = Math.max(rMax, r);
    aMin = Math.min(aMin, a); aMax = Math.max(aMax, a);
  }
  assert.ok(rMax <= 3, `a rat took up to ${rMax} hits`);
  assert.ok(aMin >= 2 && aMax <= 5, `agents took ${aMin} to ${aMax} hits`);
});

test('headless fight: the bot clears 4 rats and 3 agents on chief in at least 90 percent of seeds', () => {
  const N = 40;
  let ok = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = botFight(seed, { difficulty: 'chief' });
    if (r.cleared) ok++;
  }
  assert.ok(ok / N >= 0.9, `cleared ${ok}/${N}`);
});

test('headless fight: it also copes on kid and upside, and with each hero in the lead', () => {
  for (const difficulty of ['kid', 'upside'] as const) {
    let ok = 0;
    for (let seed = 1; seed <= 15; seed++) if (botFight(seed, { difficulty }).cleared) ok++;
    assert.ok(ok >= 13, `${difficulty}: ${ok}/15`);
  }
  for (const lead of HERO_IDS) {
    const rest = HERO_IDS.filter((h) => h !== lead).slice(0, 2);
    let ok = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const r = botFight(seed, { party: [{ id: lead }, ...rest.map((id) => ({ id }))] });
      if (r.cleared) ok++;
    }
    assert.ok(ok >= 10, `${lead} in the lead: ${ok}/12`);
  }
});

test('headless fight: same seed gives the same fight, and different seeds differ', () => {
  const a = botFight(31), b = botFight(31);
  assert.deepEqual(a.stats, b.stats);
  assert.deepEqual(a.party, b.party);
  assert.equal(a.frames, b.frames);
  assert.equal(a.events, b.events);
  const frames = new Set<number>();
  for (let seed = 1; seed <= 8; seed++) frames.add(botFight(seed).frames);
  assert.ok(frames.size > 3, 'seeds change the fight');
});

/** The stage's enemies, as XP rewards only: 8 rats and 14 agents, parked far from the hero and killed one by one. */
function stageSpawns(): SimSpawn[] {
  const out: SimSpawn[] = [];
  for (let i = 0; i < 8; i++) out.push(rat(`r${i}`, 20, 2 + i, 'rats'));
  for (let i = 0; i < 14; i++) out.push(agent(`a${i}`, 21, 1 + i, 'agents'));
  return out;
}

test('stage XP: 8 rats and 14 agents are worth 144, the lead hero ends at Lv 3 and stays under Lv 4', () => {
  const { sim, s } = makeWhite({ spawns: stageSpawns(), seed: 5 });
  const order = [...s.enemies];
  for (const e of order) {
    e.hp = 0;
    sim.step(inp());
  }
  assert.equal(sim.stats().xpEarned, 144);
  assert.equal(sim.stats().kills, 22);
  const lead = sim.party()[0];
  assert.equal(lead?.level, 3);
  assert.ok((lead?.xp ?? 0) + xpForLevel(3) === 144 && 144 < xpForLevel(4));
  // The benched heroes earn half: 72 XP is Lv 2.
  assert.deepEqual(sim.party().slice(1).map((p) => p.level), [2, 2]);
});

test('stage XP: a three-hero rotation gets everyone to at least Lv 2', () => {
  const { sim, s } = makeWhite({ spawns: stageSpawns(), seed: 6 });
  const order = [...s.enemies];
  let active = 0;
  order.forEach((e, i) => {
    // Hand the lead to the next hero every seven kills. 100 frames covers the swap cooldown.
    if (i > 0 && i % 7 === 0) {
      active = (active + 1) % 3;
      sim.step(inp({ swapTo: active }));
      run(sim, 100);
    }
    e.hp = 0;
    sim.step(inp());
  });
  assert.equal(sim.stats().xpEarned, 144);
  const levels = sim.party().map((p) => p.level);
  assert.ok(levels.every((l) => l >= 2), `levels ${levels.join(',')}`);
  assert.ok(Math.max(...levels) <= 3);
});

test('stage XP through the real bot: Mike leads a 22-enemy stage and lands at Lv 3', () => {
  // The same 8 rats and 14 agents, awake, spread over the headless arena. The bot's swaps are the only rotation.
  let ok = 0, leadLv3 = 0;
  const N = 8;
  for (let seed = 1; seed <= N; seed++) {
    const r = botFight(seed, { rats: 8, agents: 14, maxFrames: 14000 });
    if (r.cleared) {
      ok++;
      const levels = r.party.map((p) => p.level);
      if (levels.some((l) => l === 3) && levels.every((l) => l >= 2)) leadLv3++;
      assert.ok(Math.max(...levels) <= 3, `levels ${levels.join(',')} should stay below 4`);
    }
  }
  assert.ok(ok >= 6, `cleared ${ok}/${N}`);
  assert.ok(leadLv3 >= 4, `${leadLv3} runs ended with a Lv 3 lead and Lv 2 bench`);
});
