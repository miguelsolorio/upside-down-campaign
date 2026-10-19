// How fast does the party level over a real run? Plays 1.1 to 5.3 with the bot, carrying the party between stages the
// way the game does (scripts/campaign-run.ts), and prints each hero's level and XP after each stage over N seeds, next
// to what a ?stage= jump starts the next stage with, and the lead's XP against the pace's targets. Run from the project root:
//
//   node scripts/measure-campaign.ts [difficulty] [seeds] [--careless] [--rotate=20] [--picks=mike,dustin,max,steve] [--no-lights] [--seeds]
//   node scripts/measure-campaign.ts chief 20
//   node scripts/measure-campaign.ts chief 20 --rotate=20
//
// The bot keeps the lead unless a hero is hurt or a gate needs someone else, so the lead takes most of the XP. --rotate
// swaps to the next hero every so many seconds, for a player who shares it around. --seeds prints one line per seed.
// --picks sets the party for the stages with picks (lead first); it is fixed up for each stage's locked heroes the way the picks panel is
// (Hopper in 5.1, Will in 5.2, Eleven and Will in 5.3).
import { STAGE_ORDER, chapterOf, defaultParty } from '../src/core/campaign.ts';
import type { Difficulty, HeroId, PartySeed } from '../src/core/types.ts';
import { xpForLevel } from '../src/progression/xp.ts';
import { runCampaign, totalXp } from './campaign-run.ts';
import type { CampaignRun } from './campaign-run.ts';

const args = process.argv.slice(2);
const flag = (f: string): boolean => args.includes(f);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [difficulty = 'chief', seedsArg = '10'] = args.filter((a) => !a.startsWith('--'));
if (!['kid', 'normal', 'chief', 'upside'].includes(difficulty)) throw new Error(`difficulty is kid, normal, chief or upside, not ${difficulty}`);
const N = Number(seedsArg);
const picks = opt('picks')?.split(',') as HeroId[] | undefined;
const o = { difficulty: difficulty as Difficulty, careless: flag('--careless'), rotate: Number(opt('rotate') ?? 0), picks, noLights: flag('--no-lights') };

const runs: CampaignRun[] = [];
for (let seed = 1; seed <= N; seed++) {
  const r = runCampaign(seed, o);
  runs.push(r);
  if (flag('--seeds')) {
    console.log(`seed ${String(seed).padStart(3)}: ` + r.stages.map((s) =>
      `${s.stage} ${s.cleared ? '' : 'STUCK '}${s.wipes ? `${s.wipes}w ` : ''}${s.party.map((p) => p.level).join('/')}`).join('  '));
  }
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const levelOf = (xp: number): number => { let l = 1; while (xpForLevel(l + 1) <= xp) l++; return l; };
const lv = (xs: number[]): string => {
  const lo = Math.min(...xs), hi = Math.max(...xs), m = mean(xs);
  return `${m.toFixed(1)}${lo === hi ? '' : ` (${lo}-${hi})`}`.padEnd(12);
};

const heroes: HeroId[] = [];
for (const r of runs) for (const id of STAGE_ORDER) for (const h of r.after[id] ?? []) if (!heroes.includes(h.id)) heroes.push(h.id);
const w = 14;
console.log(`\n${N} seeds on ${difficulty}${o.careless ? ', careless bot' : ''}${o.rotate ? `, a swap every ${o.rotate} s` : ''}${picks ? `, picks ${picks.join(' ')}` : ''}${o.noLights ? ', no lights' : ''}`);
console.log('Level after each stage, mean (lowest-highest). Total XP is the mean since Lv 1.\n');
console.log('stage'.padEnd(8) + 'XP'.padEnd(6) + 'wipes'.padEnd(7) + heroes.map((h) => h.padEnd(w)).join('') + 'party avg');
for (const id of STAGE_ORDER) {
  const st = runs.map((r) => r.stages.find((s) => s.stage === id));
  const xp = mean(st.map((s) => s?.xp ?? 0)), wipes = mean(st.map((s) => s?.wipes ?? 0)), stuck = st.filter((s) => !s?.cleared).length;
  const cells = heroes.map((h) => {
    const at = runs.map((r) => r.after[id]?.find((s) => s.id === h)).filter((s): s is PartySeed => !!s);
    return (at.length === 0 ? '-' : lv(at.map((s) => s.level ?? 1))).padEnd(w);
  });
  const avg = mean(st.map((s) => mean((s?.party ?? []).map((p) => p.level))));
  console.log(id.padEnd(8) + xp.toFixed(0).padEnd(6) + (wipes.toFixed(1) + (stuck ? ` ${stuck}!` : '')).padEnd(7) + cells.join('') + avg.toFixed(2));
}

console.log('\nTotal XP after each stage');
console.log('stage'.padEnd(8) + heroes.map((h) => h.padEnd(8)).join(''));
for (const id of STAGE_ORDER) {
  const cells = heroes.map((h) => {
    const at = runs.map((r) => r.after[id]?.find((s) => s.id === h)).filter((s): s is PartySeed => !!s);
    return (at.length === 0 ? '-' : mean(at.map(totalXp)).toFixed(0)).padEnd(8);
  });
  console.log(id.padEnd(8) + cells.join(''));
}

// What the real run walks into each stage with, next to the ?stage= jump's seeds (defaultParty).
console.log('\nArrival: a real run (median level, mean XP into it) against ?stage=');
for (const id of STAGE_ORDER) {
  const entered = runs.map((r) => r.stages.find((s) => s.stage === id)?.entered ?? []);
  const ids = entered[0]?.map((s) => s.id) ?? [];
  const real = ids.map((h) => {
    const at = entered.map((e) => e.find((s) => s.id === h)).filter((s): s is PartySeed => !!s);
    const levels = at.map((s) => s.level ?? 1).sort((a, b) => a - b);
    return `${h} ${levels[Math.floor(levels.length / 2)]}+${mean(at.map((s) => s.xp ?? 0)).toFixed(0)}`;
  });
  const jump = defaultParty(id).map((s) => `${s.id} ${s.level ?? 1}+${s.xp ?? 0}`);
  console.log(`${id}  run: ${real.join(', ')}\n      jump: ${jump.join(', ')}`);
}

// ARRIVAL seeds for core/campaign.ts that match a real run: each hero at the median total XP they walk in with.
console.log('\nARRIVAL from this run (median XP into each stage)');
for (const id of STAGE_ORDER) {
  const entered = runs.map((r) => r.stages.find((s) => s.stage === id)?.entered ?? []);
  const seeds = (entered[0] ?? []).map((first) => {
    const tot = entered.map((e) => totalXp(e.find((s) => s.id === first.id) ?? {})).sort((a, b) => a - b);
    const med = tot[Math.floor(tot.length / 2)] as number;
    let level = 1;
    while (xpForLevel(level + 1) <= med) level++;
    const xp = med - xpForLevel(level);
    return `{ id: '${first.id}'${level > 1 ? `, level: ${level}` : ''}${xp > 0 ? `, xp: ${xp}` : ''} }`;
  });
  console.log(`  '${id}': [${seeds.join(', ')}],`);
}

// The pace in docs/game-design.md: Lv 4 after chapter 1, 6 after 2, 8 after 3, 10 after 4, and chapter 5's 11 after 5.2 and 12 (the cap) after 5.3
// (docs/pace.md). The lead is whoever has the most XP, and the XP columns are the lead's total since Lv 1, so each target's own line shows.
const MARKS: Record<string, number> = { '1.3': 4, '2.3': 6, '3.3': 8, '4.4': 10, '5.2': 11, '5.3': 12 };
console.log('\nPace at each chapter end (and 5.2), the lead against the target');
for (const id of STAGE_ORDER) {
  const target = MARKS[id];
  if (target === undefined) continue;
  const st = runs.map((r) => r.stages.find((s) => s.stage === id));
  // The lead is whoever has the most XP: Mike for the bot, anyone when the lead is shared.
  const xp = st.map((s) => Math.max(...(s?.party ?? []).map(totalXp)));
  const lead = xp.map(levelOf);
  const avg = st.map((s) => mean((s?.party ?? []).map((p) => p.level)));
  const at = lead.filter((l) => l === target).length, under = lead.filter((l) => l < target).length;
  console.log(`chapter ${chapterOf(id)} (${id}): lead ${lv(lead)} Lv ${target} in ${at} of ${N}${under ? `, under in ${under} (${xpForLevel(target) - Math.min(...xp)} XP short at worst)` : ''}${lead.some((l) => l > target) ? `, over in ${lead.filter((l) => l > target).length}` : ''}; XP ${Math.min(...xp)} to ${Math.max(...xp)}, party average ${mean(avg).toFixed(2)} (${Math.min(...avg).toFixed(2)}-${Math.max(...avg).toFixed(2)})`);
}
