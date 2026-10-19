// The campaign's pace (docs/pace.md): a whole run, 1.1 to 3.3, played by the bot on chief with the party
// carried between stages the way the game carries it (scripts/campaign-run.ts). The lead ends chapter 1 at Lv 4, chapter 2
// at Lv 6 and chapter 3 at Lv 8, nobody who played the chapter is left far behind, and a ?stage= jump walks in with what a real run brings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_ORDER, chapterOf, defaultParty } from '../src/core/campaign.ts';
import type { HeroId, HeroSnapshot } from '../src/core/types.ts';
import { xpForLevel } from '../src/progression/xp.ts';
import { runCampaign, totalXp } from '../scripts/campaign-run.ts';
import type { CampaignRun } from '../scripts/campaign-run.ts';

const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);
/** The bot keeps the lead unless a hero is hurt or a gate needs someone else: the lead takes most of the XP. */
const kept = SEEDS.map((seed) => runCampaign(seed));
/** A player who hands the lead to the next hero every 20 s, so the XP spreads. */
const shared = SEEDS.map((seed) => runCampaign(seed, { rotate: 20 }));

const after = (r: CampaignRun, stage: string): HeroSnapshot[] => r.stages.find((s) => s.stage === stage)?.party ?? [];
const levelOf = (xp: number): number => { let l = 1; while (xpForLevel(l + 1) <= xp) l++; return l; };
const best = (party: HeroSnapshot[]): number => Math.max(...party.map(totalXp));
const lastOf = (chapter: number): string => STAGE_ORDER.filter((id) => chapterOf(id) === chapter).at(-1) as string;
/** The heroes in the party of every stage of a chapter. */
function stayed(r: CampaignRun, chapter: number): HeroId[] {
  const stages = r.stages.filter((s) => chapterOf(s.stage) === chapter);
  return (stages[0]?.party ?? []).map((p) => p.id).filter((id) => stages.every((s) => s.party.some((p) => p.id === id)));
}

test('pace: the bot clears every stage of a carried run, both ways of sharing the lead', () => {
  for (const [i, r] of [...kept, ...shared].entries()) {
    assert.deepEqual(r.stages.map((s) => s.stage), [...STAGE_ORDER]);
    for (const s of r.stages) assert.ok(s.cleared, `run ${i}: stage ${s.stage} was not cleared after ${s.wipes} wipes`);
  }
});

test('pace: chapter 1 ends with the lead at Lv 4 and the rest of the party at Lv 3 or 4', () => {
  for (const [i, r] of kept.entries()) {
    const party = after(r, lastOf(1));
    assert.equal(levelOf(best(party)), 4, `seed ${i + 1}: the lead has ${best(party)} XP`);
    for (const p of party) assert.ok(p.level >= 3 && p.level <= 4, `seed ${i + 1}: ${p.id} is Lv ${p.level}`);
  }
});

test('pace: chapter 2 ends with the lead at Lv 6, whoever played all of it at Lv 5 or 6, and the recruits a level up', () => {
  for (const [i, r] of kept.entries()) {
    const party = after(r, lastOf(2));
    assert.equal(levelOf(best(party)), 6, `seed ${i + 1}: the lead has ${best(party)} XP`);
    const core = stayed(r, 2);
    assert.deepEqual(core, ['mike', 'dustin'], 'the default picks keep Mike and Dustin through chapter 2');
    for (const id of core) {
      const lv = party.find((p) => p.id === id)?.level ?? 0;
      assert.ok(lv >= 5 && lv <= 6, `seed ${i + 1}: ${id} is Lv ${lv}`);
    }
    // Max and Steve join in 2.2 at the others' average minus one, and gain a level in their two stages.
    const joined = r.stages.find((s) => s.stage === '2.2')?.entered ?? [];
    for (const id of ['max', 'steve'] as HeroId[]) {
      const at = joined.find((p) => p.id === id)?.level ?? 0;
      assert.ok((party.find((p) => p.id === id)?.level ?? 0) > at, `seed ${i + 1}: ${id} joined at Lv ${at} and stayed there`);
    }
  }
});

test('pace: chapter 3 ends with the lead at Lv 8 in nine runs of ten, never more than a kill or two short, and Eleven caught up', () => {
  let eight = 0;
  for (const [i, r] of kept.entries()) {
    const party = after(r, lastOf(3));
    // Who the boss fight leaves standing moves the XP around, so the lead lands a little either side of the line.
    assert.ok(best(party) >= xpForLevel(8) - 30 && best(party) < xpForLevel(9), `seed ${i + 1}: the lead has ${best(party)} XP`);
    if (levelOf(best(party)) === 8) eight++;
    // Eleven sits 3.1 and 3.2 out, comes back to 3.3 at the party's level less one, and leaves it at least a level up from chapter 1.
    const back = r.stages.find((s) => s.stage === '3.3')?.entered.find((p) => p.id === 'eleven')?.level ?? 0;
    assert.ok(back >= 4, `seed ${i + 1}: Eleven came back at Lv ${back}`);
  }
  assert.ok(eight >= 9, `Lv 8 after chapter 3 in ${eight} of ${kept.length} runs`);
});

test('pace: sharing the lead lands the same, with chapter 2 at Lv 6 in most runs and never more than a kill or two short', () => {
  let six = 0;
  for (const [i, r] of shared.entries()) {
    const one = after(r, lastOf(1)), two = after(r, lastOf(2));
    assert.equal(levelOf(best(one)), 4, `seed ${i + 1}: the best hero has ${best(one)} XP after chapter 1`);
    assert.ok(best(two) >= xpForLevel(6) - 25 && best(two) < xpForLevel(7), `seed ${i + 1}: the best hero has ${best(two)} XP after chapter 2`);
    if (levelOf(best(two)) === 6) six++;
  }
  assert.ok(six >= 7, `Lv 6 after chapter 2 in ${six} of ${shared.length} runs`);
});

test('pace: a ?stage= jump walks in with the party a real run brings, within a few kills of XP', () => {
  // Chapter 5's ARRIVAL rows are placeholders, the lead at Lv 10, and its two stages are stubs that pay no XP: they join this check once
  // 4.3 and 4.4 are in and the stages are measured (docs/chapter-5.md, "The pace").
  for (const id of STAGE_ORDER.filter((s) => chapterOf(s) < 5)) {
    const runs = kept.map((r) => r.stages.find((s) => s.stage === id)?.entered ?? []);
    const jump = defaultParty(id);
    assert.deepEqual(jump.map((s) => s.id), runs[0]?.map((s) => s.id), `${id}: the same heroes, lead first`);
    for (const seed of jump) {
      const xp = runs.map((e) => totalXp(e.find((s) => s.id === seed.id) ?? {})).sort((a, b) => a - b);
      const median = xp[Math.floor(xp.length / 2)] as number;
      assert.ok(Math.abs(totalXp(seed) - median) <= 40, `${id}: ${seed.id} jumps in with ${totalXp(seed)} XP, a run brings ${median}`);
    }
  }
});

test('pace: chapter 4 ends with the lead at Lv 10 in most runs, and never under Lv 9', () => {
  let ten = 0;
  for (const [i, r] of kept.entries()) {
    const party = after(r, lastOf(4));
    // Hopper plays 4.1 alone and Eddie falls in 4.3, so the lead is Mike or Dustin, carried from chapter 3 (docs/pace.md, "Chapter 4").
    assert.ok(best(party) >= xpForLevel(9) && best(party) < xpForLevel(11), `seed ${i + 1}: the lead has ${best(party)} XP`);
    if (levelOf(best(party)) >= 10) ten++;
  }
  assert.ok(ten >= 7, `Lv 10 after chapter 4 in ${ten} of ${kept.length} runs`);
});
