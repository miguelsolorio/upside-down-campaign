import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { flags } from '../src/core/flags.ts';
import { clearSave, hasSave, loadSave, parseSave, savingAllowed, writeSave } from '../src/core/save.ts';
import type { SaveData } from '../src/core/save.ts';
import { seedsFrom } from '../src/core/campaign.ts';
import type { HeroSnapshot } from '../src/core/types.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';

/** A stand-in for localStorage. */
function stubStorage(): Map<string, string> {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { data.set(k, v); },
      removeItem: (k: string) => { data.delete(k); },
    },
  });
  return data;
}

const SAVE: SaveData = {
  v: 1,
  stage: '1.1',
  party: [
    { id: 'mike', level: 3, xp: 12, bonus: { atk: 2, hp: 1 } },
    { id: 'dustin', level: 2, xp: 0, bonus: {} },
    { id: 'eleven', level: 2, xp: 5, bonus: {} },
  ],
  checkpoint: { x: 120, y: 340, state: { fired: ['start', 'rats'], cleared: ['rats'] } },
  killed: ['rat1', 'rat2'],
  openProps: ['lights_yard', 'gate_a'],
};

let store: Map<string, string>;
beforeEach(() => { store = stubStorage(); });

/** Stage 1.2 saves use the real ids from the stage data, so a renamed prop or spawn fails here. */
const SPAWN_IDS = new Set(STAGE_12.spawns.map((s) => s.id));
const SAVE_12: SaveData = {
  v: 1,
  stage: '1.2',
  party: [
    { id: 'mike', level: 4, xp: 20, bonus: { atk: 3, def: 1 } },
    { id: 'dustin', level: 3, xp: 30, bonus: { mp: 2 } },
    { id: 'lucas', level: 3, xp: 12, bonus: { spd: 1 } },
    { id: 'eleven', level: 3, xp: 4, bonus: { hp: 2, mp: 1 } },
  ],
  checkpoint: {
    x: STAGE_12.checkpoints[1]?.x ?? 0,
    y: STAGE_12.checkpoints[1]?.y ?? 0,
    state: {
      fired: ['start', 'agents1', 'cam1_spotted', 'burn_hint', 'door1_open', 'cages', 'scare', 'relay_hint', 'cam3_spotted', 'door2_open'],
      cleared: ['agents1', 'reinf1', 'rats1', 'reinf3'],
    },
  },
  killed: ['agents1_a', 'reinf1_a', 'reinf2_a', 'rats1_a', 'rats1_b', 'reinf3_a'],
  openProps: ['lights_dock', 'cam2', 'sensor1', 'door1', 'relay1', 'door2', 'lights_hall'],
};

test('a stage 1.2 save comes back the way it went in, and every id in it is real', () => {
  const groups = new Set(STAGE_12.spawns.flatMap((s) => (s.kind === 'enemy' ? [s.group] : [])));
  for (const id of [...SAVE_12.killed, ...SAVE_12.openProps]) assert.ok(SPAWN_IDS.has(id), `${id} is a spawn in stage 1.2`);
  for (const id of SAVE_12.checkpoint.state.fired) assert.ok(STAGE_12.beats.some((b) => b.id === id), `${id} is a beat of stage 1.2`);
  for (const id of SAVE_12.checkpoint.state.cleared) assert.ok(groups.has(id), `${id} is an enemy group of stage 1.2`);
  assert.ok(STAGE_12.checkpoints.some((c) => c.x === SAVE_12.checkpoint.x && c.y === SAVE_12.checkpoint.y), 'the checkpoint is one of the lights');
  writeSave(SAVE_12);
  assert.deepEqual(loadSave(), SAVE_12);
  assert.equal(loadSave()?.stage, '1.2');
});

test('a stage 1.2 save at the third light, before the lockdown, keeps the crate cleared and the guards dead', () => {
  const third = STAGE_12.checkpoints[2];
  assert.equal(third?.prop, 'lights_records');
  const save: SaveData = {
    ...SAVE_12,
    checkpoint: {
      x: third?.x ?? 0, y: third?.y ?? 0,
      state: { fired: [...SAVE_12.checkpoint.state.fired, 'guards', 'crate_hint', 'crate_cleared'], cleared: [...SAVE_12.checkpoint.state.cleared, 'guards1'] },
    },
    killed: [...SAVE_12.killed, 'guard1', 'guard2'],
    openProps: [...SAVE_12.openProps, 'crate1', 'lights_records'],
  };
  for (const id of [...save.killed, ...save.openProps]) assert.ok(SPAWN_IDS.has(id), `${id} is a spawn in stage 1.2`);
  for (const id of save.checkpoint.state.fired) assert.ok(STAGE_12.beats.some((b) => b.id === id), `${id} is a beat of stage 1.2`);
  assert.ok(!save.checkpoint.state.fired.includes('lockdown'), 'the lockdown has not started at the third light');
  writeSave(save);
  assert.deepEqual(loadSave(), save);
});

test('the entry save for stage 1.2 carries the party out of stage 1.1 and begins at the start', () => {
  // What stage 1.1 hands over: levels, XP and the d20 bonus carry. Health does not.
  const cleared: HeroSnapshot[] = [
    { id: 'mike', level: 3, xp: 68, hp: 20, hpMax: 62, bonus: { atk: 2 } },
    { id: 'dustin', level: 2, xp: 40, hp: 1, hpMax: 40, bonus: { mp: 1 } },
    { id: 'lucas', level: 2, xp: 41, hp: 33, hpMax: 40, bonus: { spd: 1 } },
    { id: 'eleven', level: 2, xp: 30, hp: 0, hpMax: 36, bonus: { def: 1 } },
  ];
  const seeds = seedsFrom(cleared);
  assert.deepEqual(seeds.map((s) => s.id), ['mike', 'dustin', 'lucas', 'eleven'], 'party order is kept');
  assert.ok(seeds.every((s) => !('hp' in s) && !('hpMax' in s)), 'health is not carried');
  assert.deepEqual(seeds[0], { id: 'mike', level: 3, xp: 68, bonus: { atk: 2 } });
  const entry: SaveData = {
    v: 1, stage: '1.2', party: seeds,
    checkpoint: { x: STAGE_12.start.x, y: STAGE_12.start.y, state: { fired: [], cleared: [] } },
    killed: [], openProps: [],
  };
  writeSave(entry);
  assert.deepEqual(loadSave(), entry);
  assert.equal(parseSave({ ...entry, stage: 12 }), null, 'the stage is still a string');
});

test('no save reads as null', () => {
  assert.equal(loadSave(), null);
  assert.equal(hasSave(), false);
});

test('a save comes back the way it went in', () => {
  writeSave(SAVE);
  assert.equal(hasSave(), true);
  assert.deepEqual(loadSave(), SAVE);
});

test('clearing removes the save, and clearing nothing is fine', () => {
  clearSave();
  writeSave(SAVE);
  clearSave();
  assert.equal(loadSave(), null);
  assert.equal(store.size, 0);
});

test('corrupt, old or unreadable saves read as no save', () => {
  const put = (raw: string): void => { store.set('upside-down:save:v1', raw); };
  put('{nope');
  assert.equal(loadSave(), null);
  put('null');
  assert.equal(loadSave(), null);
  put(JSON.stringify({ ...SAVE, v: 2 }));
  assert.equal(loadSave(), null);
});

test('bad shapes are rejected', () => {
  const bad = (patch: Record<string, unknown>): void => assert.equal(parseSave({ ...SAVE, ...patch }), null, JSON.stringify(patch));
  bad({ stage: 11 });
  bad({ party: [] });
  bad({ party: [{ id: 'barb', level: 1, xp: 0 }] });
  bad({ party: [{ id: 'mike', level: 0, xp: 0 }] });
  bad({ party: [{ id: 'mike', level: 99, xp: 0 }] });
  bad({ party: [{ id: 'mike', level: 1, xp: -1 }] });
  bad({ party: [{ id: 'mike', level: 1, xp: 0 }, { id: 'mike', level: 1, xp: 0 }] });
  bad({ checkpoint: { x: 'a', y: 1, state: { fired: [], cleared: [] } } });
  bad({ checkpoint: { x: 1, y: 1, state: { fired: [1], cleared: [] } } });
  bad({ killed: 'rat1' });
  bad({ openProps: [null] });
});

test('unknown fields are dropped and stat bonuses are kept clean', () => {
  const loaded = parseSave({
    ...SAVE, extra: 1,
    party: [{ id: 'lucas', level: 2, xp: 1, bonus: { atk: 3, luck: 9, def: 'x' }, hp: 5 }],
  });
  assert.deepEqual(loaded?.party, [{ id: 'lucas', level: 2, xp: 1, bonus: { atk: 3 } }]);
  assert.equal(loaded !== null && 'extra' in loaded, false);
});

test('debug runs leave the real save alone', () => {
  writeSave(SAVE);
  const real = loadSave();
  for (const patch of [{ bot: true }, { god: true }, { level: 3 }, { party: ['mike'] }]) {
    const saved = { ...flags };
    Object.assign(flags, patch);
    try {
      assert.equal(savingAllowed(), false, JSON.stringify(patch));
      writeSave({ ...SAVE, killed: ['other'] });
      clearSave();
      assert.deepEqual(loadSave(), real, JSON.stringify(patch));
    } finally {
      Object.assign(flags, saved);
    }
  }
  assert.equal(savingAllowed(), true);
});

test('blocked storage never throws', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('blocked'); },
  });
  assert.doesNotThrow(() => writeSave(SAVE));
  assert.doesNotThrow(() => clearSave());
  assert.equal(loadSave(), null);
});
