import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DEFS, HERO_IDS, statsAt, fixedGain, critChance } from '../src/heroes/index.ts';
import { ENEMY_DEFS, DIFFICULTY_MULT } from '../src/enemies/index.ts';
import { STAT_KEYS, emptyStats } from '../src/progression/index.ts';
import { hasEmDash } from '../src/core/text.ts';

test('the four Level 1 heroes each define basic, special and a Lv 3 talent', () => {
  assert.deepEqual([...HERO_IDS].sort(), ['dustin', 'eleven', 'lucas', 'max', 'mike', 'nancy', 'robin', 'steve', 'will']);
  for (const id of HERO_IDS) {
    const d = HERO_DEFS[id];
    assert.equal(d.id, id);
    assert.ok(d.name.length > 0 && d.role.length > 0);
    for (const a of [d.basic, d.special]) {
      assert.ok(a.name.length > 0, `${id} ability name`);
      assert.ok(a.cd > 0 && a.dur > 0 && a.at >= 0 && a.at <= a.dur, `${id} ${a.name} timing`);
      assert.ok(a.lock >= 0 && a.lock <= 1);
      assert.ok(!hasEmDash(a.name));
    }
    assert.equal(d.basic.mp, 0, `${id} basic is free`);
    assert.ok(d.special.mp > 0, `${id} special costs MP`);
    assert.deepEqual(d.talents.map((t) => t.level), [3, 6]);
    for (const t of d.talents) assert.ok(t.name.length > 0 && t.text.length <= 32);
  }
});

test('special costs and utilities match the design', () => {
  assert.equal(HERO_DEFS.mike.special.mp, 6);
  assert.equal(HERO_DEFS.dustin.special.mp, 8);
  assert.equal(HERO_DEFS.lucas.special.mp, 5);
  assert.equal(HERO_DEFS.eleven.special.mp, 8);
  assert.deepEqual(HERO_DEFS.mike.utilities, []);
  assert.deepEqual(HERO_DEFS.dustin.utilities, ['burn', 'compass']);
  assert.deepEqual(HERO_DEFS.lucas.utilities, ['shoot']);
  assert.deepEqual(HERO_DEFS.eleven.utilities, ['push', 'sense']);
  assert.equal(HERO_DEFS.mike.special.x.life, 300, 'DM screen stands for five seconds');
  assert.equal(HERO_DEFS.dustin.basic.x.land, 24, 'the lure lands after about 24 frames');
});

test('movement is about 1 px per frame, Mike and Eleven slightly slower', () => {
  assert.ok(HERO_DEFS.mike.speed < HERO_DEFS.dustin.speed);
  assert.ok(HERO_DEFS.eleven.speed < HERO_DEFS.lucas.speed);
  for (const id of HERO_IDS) {
    assert.ok(HERO_DEFS[id].speed >= 0.8 && HERO_DEFS[id].speed <= 1.1);
  }
});

test('stats grow with level and never shrink', () => {
  for (const id of HERO_IDS) {
    const d = HERO_DEFS[id];
    assert.deepEqual(statsAt(d, 1), d.base);
    for (let l = 1; l < 12; l++) {
      const g = fixedGain(d, l);
      for (const k of STAT_KEYS) assert.ok(g[k] >= 0, `${id} ${k} at ${l}`);
    }
    for (const k of STAT_KEYS) assert.ok(statsAt(d, 12)[k] >= d.base[k]);
    assert.ok(statsAt(d, 12).hp > statsAt(d, 1).hp * 2);
    const bonus = { ...emptyStats(), atk: 2 };
    assert.equal(statsAt(d, 3, bonus).atk, statsAt(d, 3).atk + 2);
  }
});

test('crit chance is 5 percent plus the hero bonus, and Sharp eye adds 15 at Lv 3', () => {
  assert.equal(critChance(HERO_DEFS.mike, 1), 0.05);
  assert.ok(critChance(HERO_DEFS.lucas, 2) < critChance(HERO_DEFS.lucas, 3));
  assert.ok(Math.abs(critChance(HERO_DEFS.lucas, 3) - critChance(HERO_DEFS.lucas, 2) - 0.15) < 1e-9);
  assert.equal(critChance(HERO_DEFS.mike, 3), critChance(HERO_DEFS.mike, 1));
});

test('enemy numbers match the spec', () => {
  assert.equal(ENEMY_DEFS.rat.hp, 10);
  assert.equal(ENEMY_DEFS.rat.xp, 4);
  assert.equal(ENEMY_DEFS.agent.hp, 24);
  assert.equal(ENEMY_DEFS.agent.xp, 8);
  assert.equal(ENEMY_DEFS.agent.windup, 24);
  assert.equal(ENEMY_DEFS.agent.x.near, 70);
  assert.equal(ENEMY_DEFS.agent.x.far, 100);
  assert.equal(ENEMY_DEFS.agent.aggro, 90);
  assert.ok(ENEMY_DEFS.rat.speed > 1.1, 'rats are fast chasers');
  assert.deepEqual(DIFFICULTY_MULT, { kid: 0.7, chief: 1, upside: 1.4 });
  // 8 rats and 14 agents are worth 144 XP, inside the 130 to 175 budget.
  const total = 8 * ENEMY_DEFS.rat.xp + 14 * ENEMY_DEFS.agent.xp;
  assert.ok(total >= 130 && total <= 175, `stage XP ${total}`);
});
