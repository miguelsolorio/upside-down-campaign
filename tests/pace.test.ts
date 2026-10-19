// The campaign's pace (docs/pace.md): a whole run, 1.1 to 5.3, played by the bot on chief with the party
// carried between stages the way the game carries it (scripts/campaign-run.ts). The lead ends chapter 1 at Lv 4, chapter 2
// at Lv 6, chapter 3 at Lv 8 and chapter 4 at Lv 10, then takes Lv 11 in 5.2 and the cap, Lv 12, in 5.3. Nobody who played the chapter is left far
// behind, and a ?stage= jump walks in with what a real run brings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_ORDER, chapterOf, defaultParty } from '../src/core/campaign.ts';
import type { HeroId, HeroSnapshot, PartySeed } from '../src/core/types.ts';
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
  for (const id of STAGE_ORDER) {
    const runs = kept.map((r) => r.stages.find((s) => s.stage === id)?.entered ?? []);
    const jump = defaultParty(id);
    assert.deepEqual(jump.map((s) => s.id), runs[0]?.map((s) => s.id), `${id}: the same heroes, lead first`);
    // A few kills: 40 XP up to chapter 4, where a kill pays 10 to 20. Chapter 5's pay is two to five times that (xpMult 2.2, 2.4 and 5), and the lead's XP into
    // 5.3 runs from 3900 to 4700 across seeds, so its medians over ten seeds and over forty sit as much as 220 XP apart: 120 holds the jump between them.
    const tolerance = chapterOf(id) === 5 ? 120 : 40;
    for (const seed of jump) {
      const xp = runs.map((e) => totalXp(e.find((s) => s.id === seed.id) ?? {})).sort((a, b) => a - b);
      const median = xp[Math.floor(xp.length / 2)] as number;
      assert.ok(Math.abs(totalXp(seed) - median) <= tolerance, `${id}: ${seed.id} jumps in with ${totalXp(seed)} XP, a run brings ${median}`);
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

/** The level a hero who comes back to a stage walks in at, if he was behind: the rest of the party averaged, less one (CATCH_UP in core/campaign.ts). */
function caughtUp(entered: PartySeed[], id: HeroId): number {
  const rest = entered.filter((p) => p.id !== id);
  return Math.max(1, Math.floor(rest.reduce((n, p) => n + (p.level ?? 1), 0) / rest.length) - 1);
}

test('pace: chapter 5 takes the lead to Lv 11 after 5.2 and the cap, Lv 12, after 5.3, with Dustin at most a level under', () => {
  for (const [i, r] of kept.entries()) {
    const one = after(r, '5.1'), two = after(r, '5.2'), three = after(r, '5.3');
    // The lead walks into 5.1 at Lv 10 (chapter 4's result), comes out of 5.1 at Lv 10 or 11, is Lv 11 after 5.2 and no more, and is at the cap after 5.3.
    assert.ok(best(one) >= xpForLevel(10) && best(one) < xpForLevel(12), `seed ${i + 1}: the lead has ${best(one)} XP after 5.1`);
    assert.equal(levelOf(best(two)), 11, `seed ${i + 1}: the lead has ${best(two)} XP after 5.2`);
    assert.equal(levelOf(best(three)), 12, `seed ${i + 1}: the lead has ${best(three)} XP after 5.3`);
    // Mike and Dustin play all of it. Dustin ends 5.2 at Lv 10 or 11 and 5.3 at Lv 11 or 12, at most a level under the lead.
    assert.deepEqual(stayed(r, 5), ['mike', 'dustin'], 'the default picks keep Mike and Dustin through chapter 5');
    const dustin = (party: HeroSnapshot[]): number => party.find((p) => p.id === 'dustin')?.level ?? 0;
    assert.ok(dustin(two) >= 10 && dustin(two) <= 11, `seed ${i + 1}: Dustin is Lv ${dustin(two)} after 5.2`);
    assert.ok(dustin(three) >= 11, `seed ${i + 1}: Dustin is Lv ${dustin(three)} after 5.3`);
    // Hopper (5.1), Will (5.2) and Eleven and Will (5.3) come back at the party's level less one and are never worse for the stage. They are the stage's
    // catch-up heroes, so they end a few levels under the lead by design: the pace holds the lead and whoever played the whole chapter.
    for (const [stage, id] of [['5.1', 'hopper'], ['5.2', 'will'], ['5.3', 'eleven'], ['5.3', 'will']] as const) {
      const entered = r.stages.find((s) => s.stage === stage)?.entered ?? [];
      const at = entered.find((p) => p.id === id)?.level ?? 0;
      assert.ok(at >= caughtUp(entered, id), `seed ${i + 1}: ${id} walks into ${stage} at Lv ${at}`);
      const out = after(r, stage).find((p) => p.id === id)?.level ?? 0;
      assert.ok(out >= at, `seed ${i + 1}: ${id} leaves ${stage} at Lv ${out}, from Lv ${at}`);
    }
  }
});

test('pace: sharing the lead, chapter 5 lands Lv 11 after 5.2 in most runs and the cap after 5.3, never far short', () => {
  let eleven = 0, twelve = 0;
  for (const [i, r] of shared.entries()) {
    const two = after(r, '5.2'), three = after(r, '5.3');
    // The best hero comes into chapter 5 from chapter 4 a level under in some runs, since a shared lead spreads the XP, so 5.2 can end just short.
    assert.ok(best(two) >= xpForLevel(11) - 160 && best(two) < xpForLevel(12), `seed ${i + 1}: the best hero has ${best(two)} XP after 5.2`);
    assert.ok(best(three) >= xpForLevel(12) - 100, `seed ${i + 1}: the best hero has ${best(three)} XP after 5.3`);
    if (levelOf(best(two)) === 11) eleven++;
    if (levelOf(best(three)) === 12) twelve++;
  }
  assert.ok(eleven >= 8, `Lv 11 after 5.2 in ${eleven} of ${shared.length} runs`);
  assert.ok(twelve >= 9, `Lv 12 after 5.3 in ${twelve} of ${shared.length} runs`);
});
