// The dev panel's group and prop suggestions come from the stage being played, not from stage 1.1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Sim } from '../src/core/types.ts';
import { devHooks, devSuggestions } from '../src/world/devhooks.ts';
import type { Director } from '../src/world/triggers.ts';
import type { StageData } from '../src/world/types.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { STAGE_13 } from '../src/world/stages/stage13.ts';
import { STAGE_21 } from '../src/world/stages/stage21.ts';
import { STAGE_22 } from '../src/world/stages/stage22.ts';
import { STAGE_23 } from '../src/world/stages/stage23.ts';

const STAGES: StageData[] = [STAGE_11, STAGE_12, STAGE_13, STAGE_21, STAGE_22, STAGE_23];
/** Props with no open and closed state: dressing, or a prop the beats own. */
const SCENERY = ['tank', 'rack', 'generator', 'floodlight', 'bike', 'sign', 'arcade', 'rift'];

test('stage 1.1 keeps its own suggestions', () => {
  const s = devSuggestions(STAGE_11);
  for (const g of ['rats1', 'agents1', 'rats2', 'agents2', 'ambush1', 'ambush2', 'ambush3']) assert.ok(s.groups.includes(g), g);
  for (const p of ['gate1', 'log1']) assert.ok(s.props.includes(p), p);
});

test('the Lab suggests the Lab: its enemy groups, its doors and its consoles, and none of 1.1\'s gate and log', () => {
  const s = devSuggestions(STAGE_12);
  for (const g of ['agents1', 'reinf1', 'labguard', 'lock1']) assert.ok(s.groups.includes(g), g);
  for (const p of ['door1', 'door2', 'sensor1', 'relay1', 'crate1', 'cam1', 'lights_hall']) assert.ok(s.props.includes(p), p);
  assert.ok(!s.groups.includes('ambush3') && !s.groups.includes('rats2'));
  assert.ok(!s.props.includes('gate1') && !s.props.includes('log1'));
});

test('every stage suggests only what it has, all of it, with no repeats', () => {
  for (const stage of STAGES) {
    const { groups, props } = devSuggestions(stage);
    const enemyGroups = new Set(stage.spawns.flatMap((s) => (s.kind === 'enemy' ? [s.group] : [])));
    const propIds = new Map(stage.spawns.flatMap((s) => (s.kind === 'prop' ? [[s.id, s.prop] as const] : [])));
    assert.ok(groups.length > 0, `${stage.id} has groups to spawn`);
    assert.ok(props.length > 0, `${stage.id} has props to open`);
    assert.equal(new Set(groups).size, groups.length, `${stage.id}: no repeated group`);
    assert.equal(new Set(props).size, props.length, `${stage.id}: no repeated prop`);
    for (const g of groups) assert.ok(enemyGroups.has(g), `${stage.id}: ${g} is a group in the stage`);
    for (const p of props) {
      assert.ok(propIds.has(p), `${stage.id}: ${p} is a prop in the stage`);
      assert.ok(!SCENERY.includes(propIds.get(p) as string), `${stage.id}: ${p} is not scenery`);
    }
    for (const g of enemyGroups) assert.ok(groups.includes(g), `${stage.id}: ${g} is offered`);
  }
});

test('no two stages offer the same groups, so the suggestions really do change with the stage', () => {
  const seen = new Set<string>();
  for (const stage of STAGES) {
    const key = devSuggestions(stage).groups.join();
    assert.ok(!seen.has(key), `${stage.id} repeats another stage's groups`);
    seen.add(key);
  }
});

test('the hooks carry the suggestions and follow the sim a retry rebuilds', () => {
  const made: string[] = [];
  const sims = [1, 2].map((n): Sim => ({ spawnGroup: (g: string) => { made.push(`${n}:${g}`); }, dev: { god: false } }) as unknown as Sim);
  let current = 0;
  const hooks = devHooks({
    stage: STAGE_12, sim: () => sims[current] as Sim, director: () => ({}) as Director, checkpoint: () => ({ x: 0, y: 0 }),
  });
  assert.deepEqual(hooks.groups, devSuggestions(STAGE_12).groups);
  assert.deepEqual(hooks.props, devSuggestions(STAGE_12).props);
  hooks.spawnGroup('agents1');
  current = 1;
  hooks.spawnGroup('agents1');
  hooks.god = true;
  assert.deepEqual(made, ['1:agents1', '2:agents1']);
  assert.equal(hooks.god, true);
  assert.equal((sims[0] as Sim).dev.god, false, 'and it set the new sim, not the old one');
});
