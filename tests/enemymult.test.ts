import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hurtHero, hurtHeroFlat } from '../src/combat/damage.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { agent, makeWhite } from './sim-helpers.ts';

// StageData.enemyMult: a stage can make its own enemies tougher than the difficulty setting does.

test('enemyMult scales enemy HP and the damage enemies deal, and nothing else', () => {
  const plain = makeWhite({ spawns: [agent('a', 8, 8)] });
  const tough = makeWhite({ spawns: [agent('a', 8, 8)], enemyMult: 1.5 });
  assert.equal(plain.s.foeMult, 1, 'one by default');
  assert.equal(tough.s.foeMult, 1.5);
  const hp = (b: typeof plain): number => (b.s.enemies[0] as { hpMax: number }).hpMax;
  assert.equal(hp(tough), Math.round(hp(plain) * 1.5), 'enemy HP scales');

  // The same attack on the same hero with the same random stream: the tough stage hits harder by about the factor.
  const hit = (b: typeof plain): number => hurtHero(b.s, b.s.heroes[0]!, 0, 0, 1, 20);
  const dPlain = hit(plain), dTough = hit(tough);
  assert.ok(dTough > dPlain, `${dTough} should beat ${dPlain}`);
  assert.ok(dTough / dPlain > 1.3 && dTough / dPlain < 1.7, `ratio ${(dTough / dPlain).toFixed(2)} is about 1.5`);

  // A floor hazard is the stage's, not an enemy's: it does not take the factor.
  const flat = (b: typeof plain): number => hurtHeroFlat(b.s, b.s.heroes[0]!, 0, 0, 14);
  assert.equal(flat(tough), flat(plain), 'hazard damage ignores enemyMult');
});

test('enemyMult stacks on the difficulty setting rather than replacing it', () => {
  const kid = makeWhite({ spawns: [agent('a', 8, 8)], enemyMult: 1.3, difficulty: 'kid' });
  const chief = makeWhite({ spawns: [agent('a', 8, 8)], enemyMult: 1.3, difficulty: 'chief' });
  const upside = makeWhite({ spawns: [agent('a', 8, 8)], enemyMult: 1.3, difficulty: 'upside' });
  const hp = (b: typeof kid): number => (b.s.enemies[0] as { hpMax: number }).hpMax;
  assert.ok(hp(kid) < hp(chief) && hp(chief) < hp(upside), `${hp(kid)}, ${hp(chief)}, ${hp(upside)}`);
  assert.equal(hp(chief), Math.round(24 * 1.3), 'chief is 1.0, so the stage factor is all of it');
});

test('stage data passes enemyMult to the sim; stage 1.1 leaves it out and 1.2 sets it', () => {
  assert.equal(STAGE_11.enemyMult, undefined, 'the woods play as the difficulty setting says');
  assert.equal(STAGE_12.enemyMult, 1.3, 'the Lab is thirty percent tougher');
  const opts = simOptions(STAGE_12, stageGrid(STAGE_12), { party: [{ id: 'mike' }] });
  assert.equal(opts.enemyMult, 1.3);
  assert.equal(simOptions(STAGE_11, stageGrid(STAGE_11), { party: [{ id: 'mike' }] }).enemyMult, undefined);
});
