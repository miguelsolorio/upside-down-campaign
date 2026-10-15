import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debugProgress, entrySave } from '../src/flow.ts';
import { STAGE_ORDER, defaultParty, partyFor } from '../src/core/campaign.ts';
import { flags } from '../src/core/flags.ts';
import { clearProgress, loadProgress, recordClear, writeProgress } from '../src/core/progress.ts';
import { clearSave, loadSave, parseSave, writeSave } from '../src/core/save.ts';

// START OVER writes the save that waits at a stage's first moment. A hero new to the party (Will in 2.1, Max and Steve in
// 2.2) has no XP in the arrival seed, and the loader refuses a save with such a hero, so CONTINUE never showed.
test('the save START OVER writes at the start of a stage loads back, for every stage and both ways of building the party', () => {
  for (const stage of STAGE_ORDER) {
    for (const party of [defaultParty(stage), partyFor(stage, [])]) {
      const save = entrySave(stage, party);
      const back = parseSave(JSON.parse(JSON.stringify(save)));
      assert.ok(back, `stage ${stage}: the entry save reads back`);
      assert.deepEqual(back.party.map((p) => p.id), party.map((p) => p.id), `stage ${stage}: same heroes in the same order`);
      assert.deepEqual(back.checkpoint.state, { fired: [], cleared: [] });
    }
  }
});

test('the entry save keeps the levels and XP a hero already has, and gives a new one level 1 and no XP', () => {
  const save = entrySave('2.1', [{ id: 'mike', level: 4, xp: 150 }, { id: 'will', level: 2 }, { id: 'dustin' }]);
  assert.deepEqual(save.party.map((p) => [p.id, p.level, p.xp]), [['mike', 4, 150], ['will', 2, 0], ['dustin', 1, 0]]);
});

// A ?stage= jump is a debug run. It used to read and write the real save and progress, so jumping to 2.2 and clearing it
// replaced a player's map with one stage cleared.
test('a debug run that jumps to a stage starts with the stages before it cleared, in memory', () => {
  assert.deepEqual(debugProgress('2.2')?.cleared, ['1.1', '1.2', '1.3', '2.1']);
  assert.deepEqual(debugProgress('1.2')?.cleared, ['1.1']);
  assert.equal(debugProgress('1.1'), null);
});

test('a ?stage= jump never writes the real save or progress', () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } },
  });
  const player = recordClear(null, '1.1', [{ id: 'mike', level: 3, xp: 12, hp: 20, hpMax: 20 }], 5);
  writeProgress(player);
  const save = entrySave('1.3', defaultParty('1.3'));
  writeSave(save);
  const before = JSON.stringify([...data]);

  const stage = flags.stage;
  flags.stage = '2.2';
  try {
    writeProgress(recordClear(debugProgress('2.2'), '2.2', [], 0));
    writeSave(entrySave('2.2', defaultParty('2.2')));
    clearProgress();
    clearSave();
    assert.equal(JSON.stringify([...data]), before, 'nothing in storage changed');
    assert.deepEqual(loadProgress()?.cleared, ['1.1']);
    assert.equal(loadSave()?.stage, '1.3');
  } finally {
    flags.stage = stage;
  }
  // The same calls on the first stage are a normal run again.
  writeProgress(recordClear(player, '1.2', [], 0));
  assert.deepEqual(loadProgress()?.cleared, ['1.1', '1.2']);
});
