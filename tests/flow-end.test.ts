// What follows a stage's clear (docs/level-16.md, "The ending"): the first clear of 5.3 plays the chapter 5 epilogue, then THE END, then the results
// with CAMPAIGN COMPLETE, and the results lead to the map; with the story off the epilogue is skipped and THE END stays; a replay goes straight to the
// results. The chain is flow_end.ts's, built here from the real campaign data exactly as flow.ts builds it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_ORDER, chapterOf, closesChapter } from '../src/core/campaign.ts';
import { EPILOGUES, hasEpilogue } from '../src/story/epilogue.ts';
import { endsCampaign, resultsTitle } from '../src/ui/format.ts';
import { endChain, runChain, skippedEpilogue } from '../src/flow_end.ts';
import type { EndInput, EndStep, Makers } from '../src/flow_end.ts';

/** The input flow.ts builds for a stage cleared first or again, with the story on or off. */
function input(stage: string, firstClear: boolean, story: boolean): EndInput {
  const chapter = closesChapter(stage) ? chapterOf(stage) : undefined;
  return { stage, firstClear, chapter, hasEpilogue: chapter !== undefined && hasEpilogue(chapter), story };
}
const chain = (stage: string, firstClear: boolean, story: boolean): EndStep[] => endChain(input(stage, firstClear, story));

test('the first clear of 5.3 plays the epilogue, then THE END, then the results', () => {
  assert.deepEqual(chain('5.3', true, true), ['epilogue', 'theEnd', 'results']);
});

test('with the story off the epilogue is skipped and THE END stays', () => {
  assert.deepEqual(chain('5.3', true, false), ['theEnd', 'results']);
  assert.equal(skippedEpilogue(input('5.3', true, false)), true);
  assert.equal(skippedEpilogue(input('5.3', true, true)), false);
});

test('a replay of 5.3 goes straight to the results, story on or off', () => {
  assert.deepEqual(chain('5.3', false, true), ['results']);
  assert.deepEqual(chain('5.3', false, false), ['results']);
  assert.equal(skippedEpilogue(input('5.3', false, false)), false, 'nothing was skipped');
});

test('5.3 is the only stage that ends the campaign, and chapter five has an epilogue of words, which is the basement', () => {
  assert.deepEqual(STAGE_ORDER.filter(endsCampaign), ['5.3']);
  assert.equal(closesChapter('5.3'), true);
  assert.equal(chapterOf('5.3'), 5);
  assert.equal(hasEpilogue(5), true);
  assert.equal(EPILOGUES[5], 'l16_basement');
  assert.equal(resultsTitle({ chapter: 5, final: true, level: 16, campaignEnd: true }), 'CAMPAIGN COMPLETE');
});

test('the chapters before it are as they were: chapter three\'s epilogue on its first clear, and no THE END anywhere else', () => {
  assert.deepEqual(chain('3.3', true, true), ['epilogue', 'results']);
  assert.deepEqual(chain('3.3', true, false), ['results']);
  assert.equal(skippedEpilogue(input('3.3', true, false)), true, 'the stage\'s music still stops, as the epilogue\'s own scene did');
  assert.deepEqual(chain('3.3', false, true), ['results']);
  for (const stage of STAGE_ORDER.filter((s) => s !== '5.3')) {
    for (const first of [true, false]) for (const story of [true, false]) {
      const steps = chain(stage, first, story);
      assert.equal(steps.at(-1), 'results', `${stage}: the results come last`);
      assert.ok(!steps.includes('theEnd'), `${stage}: no THE END`);
    }
  }
  // A stage that closes no chapter has no epilogue to play and nothing to skip.
  assert.deepEqual(chain('2.1', true, true), ['results']);
  assert.equal(skippedEpilogue(input('2.1', true, false)), false);
});

test('runChain plays the steps in order, each when the one before is over, and stops at the end', () => {
  const log: string[] = [];
  const pending = new Map<EndStep, () => void>();
  const makers = Object.fromEntries((['epilogue', 'theEnd', 'results'] as const).map((step) => [step, (next: () => void) => { log.push(step); pending.set(step, next); }])) as Makers;
  runChain(['epilogue', 'theEnd', 'results'], makers);
  assert.deepEqual(log, ['epilogue'], 'only the first starts');
  pending.get('epilogue')!();
  assert.deepEqual(log, ['epilogue', 'theEnd']);
  pending.get('theEnd')!();
  assert.deepEqual(log, ['epilogue', 'theEnd', 'results']);
  pending.get('results')!();
  assert.deepEqual(log, ['epilogue', 'theEnd', 'results'], 'the results lead to the map, which is not a step');
  log.length = 0;
  runChain([], makers);
  assert.deepEqual(log, [], 'nothing to play');
});
