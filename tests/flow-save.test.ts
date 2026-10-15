import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entrySave } from '../src/flow.ts';
import { STAGE_ORDER, defaultParty, partyFor } from '../src/core/campaign.ts';
import { parseSave } from '../src/core/save.ts';

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
