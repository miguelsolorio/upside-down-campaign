import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { flags } from '../src/core/flags.ts';
import { clearSave, hasSave, loadSave, parseSave, savingAllowed, writeSave } from '../src/core/save.ts';
import type { SaveData } from '../src/core/save.ts';

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
