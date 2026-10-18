// How hard is a stage? Plays it headlessly with the bot over N seeds and prints a table, so a stage can be tuned with
// numbers instead of by feel. Run from the project root (Node strips the types itself):
//
//   node scripts/measure-stage.ts [stage] [difficulty] [seeds] [--careless] [--no-hazards]
//   node scripts/measure-stage.ts 1.2 chief 20
//   node scripts/measure-stage.ts 1.3 chief 20
//   node scripts/measure-stage.ts 2.1 chief 20
//   node scripts/measure-stage.ts 2.2 chief 20
//   node scripts/measure-stage.ts 2.3 chief 20
//   node scripts/measure-stage.ts 3.1 chief 20
//   node scripts/measure-stage.ts 3.2 chief 20
//   node scripts/measure-stage.ts 1.2 chief 20 --careless
//
// The default bot sidesteps darts, slams and bashes almost perfectly, so it shows the best case. --careless never
// dodges and never circles a shielded guard, which is closer to a player who is not watching the telegraphs.
// --no-hazards switches off the stage's floor hazards, to see how dangerous the enemies are on their own.
// --mult=1.5 replaces the stage's enemyMult, to try a number before it goes into the stage. A stage with a boss also
// reports how long the boss fight took (from the beat that wakes it to the finish), the way the 1.3 targets ask.
// --party=mike:5+65,dustin:4 replaces the ?stage= party (id:level+xp, lead first), to try arrival levels before they go
// into campaign.ts. scripts/measure-campaign.ts prints what a real run arrives with.
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { STAGE_13 } from '../src/world/stages/stage13.ts';
import { STAGE_21 } from '../src/world/stages/stage21.ts';
import { STAGE_22 } from '../src/world/stages/stage22.ts';
import { STAGE_23 } from '../src/world/stages/stage23.ts';
import { STAGE_31 } from '../src/world/stages/stage31.ts';
import { STAGE_32 } from '../src/world/stages/stage32.ts';
import { STAGE_33 } from '../src/world/stages/stage33.ts';
import { STAGE_41 } from '../src/world/stages/stage41.ts';
import { STAGE_42 } from '../src/world/stages/stage42.ts';
import { defaultParty } from '../src/core/campaign.ts';
import type { Difficulty, HeroId, PartySeed } from '../src/core/types.ts';
import type { StageData } from '../src/world/types.ts';

const args = process.argv.slice(2);
const flag = (f: string): boolean => args.includes(f);
const [stageId = '1.2', difficulty = 'chief', seedsArg = '20'] = args.filter((a) => !a.startsWith('--'));
const STAGES: Record<string, StageData> = { '1.1': STAGE_11, '1.2': STAGE_12, '1.3': STAGE_13, '2.1': STAGE_21, '2.2': STAGE_22, '2.3': STAGE_23, '3.1': STAGE_31, '3.2': STAGE_32, '3.3': STAGE_33, '4.1': STAGE_41, '4.2': STAGE_42 };
const base = STAGES[stageId];
if (!base) throw new Error(`unknown stage ${stageId}; try ${Object.keys(STAGES).join(' or ')}`);
if (!['kid', 'normal', 'chief', 'upside'].includes(difficulty)) throw new Error(`difficulty is kid, normal, chief or upside, not ${difficulty}`);
const mult = args.find((a) => a.startsWith('--mult='));
const S: StageData = { ...base, ...(flag('--no-hazards') ? { hazards: [] } : {}), ...(mult ? { enemyMult: Number(mult.slice(7)) } : {}) };
const N = Number(seedsArg);
const partyArg = args.find((a) => a.startsWith('--party='))?.slice(8);
const party: PartySeed[] = partyArg
  ? partyArg.split(',').map((t) => { const [id, lv] = t.split(':'); const [level, xp] = (lv ?? '1').split('+'); return { id: id as HeroId, level: Number(level), xp: Number(xp ?? 0) }; })
  : defaultParty(stageId);
const careless = flag('--careless');
const tile = (x: number, y: number): [number, number] => [Math.floor(x / 16), Math.floor((y - 4) / 16)];

const rows: string[] = [];
let cleared = 0, wiped = 0, stuck = 0, dmg = 0, kos = 0, frames = 0, low = 0, bossFrames = 0, bossRuns = 0, fell = 0;
// The fight the script times: 2.1, 2.2 and 3.1 end on an ambush, 2.3 on the Alpha and the defense after it, 3.2 on Grigori,
// 3.3 on Billy and the Mind Flayer after him, 4.1 on the pit Demogorgon, 4.2 on the Creel House's back hall.
const BOSS_BEAT = stageId === '2.1' || stageId === '2.2' || stageId === '3.1' ? 'ambush' : stageId === '2.3' ? 'alpha'
  : stageId === '3.2' ? 'grigori' : stageId === '3.3' ? 'billy' : stageId === '4.1' ? 'pit' : stageId === '4.2' ? 'finale' : 'demogorgon';
for (let seed = 1; seed <= N; seed++) {
  const grid = stageGrid(S);
  const sim = createSim(simOptions(S, grid, { party, seed, difficulty: difficulty as Difficulty }));
  const bot = createBot({ grid, waypoints: S.waypoints, careless });
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (_i, done) => done(), scare: (done) => done(), open: (id) => sim.openProp(id),
    alarm: () => undefined, jingle: () => undefined, finish: () => undefined,
    // A beat that lights a string does what the play scene's lightUp does to the party.
    light: (id) => { sim.openProp(id); sim.healParty(0.5); },
    walkman: () => sim.giveWalkman?.(),
  });
  let allDown = false, f = 0, lowest = 1, bossAt = -1, wardDown = false;
  for (; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    if (ev.some((e) => e.t === 'allDown')) allDown = true;
    // In a defense (2.3) the one the party guards going down loses the run too.
    if (ev.some((e) => e.t === 'wardDown')) { allDown = true; wardDown = true; }
    const [tx, ty] = tile(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
    if (bossAt < 0 && dir.hasFired(BOSS_BEAT)) bossAt = f;
    const party = sim.party();
    lowest = Math.min(lowest, party.reduce((a, p) => a + p.hp, 0) / party.reduce((a, p) => a + p.hpMax, 0));
  }
  const st = sim.stats();
  const result = dir.finished() ? 'clear' : wardDown ? 'FELL' : allDown ? 'WIPED' : 'STUCK';
  if (result === 'clear') cleared++; else if (result === 'FELL') { wiped++; fell++; } else if (result === 'WIPED') wiped++; else stuck++;
  dmg += st.damageTaken; kos += st.kos; frames += f; low += lowest;
  if (bossAt >= 0) { bossFrames += f - bossAt; bossRuns++; }
  rows.push(`seed ${String(seed).padStart(3)}: ${result.padEnd(5)}  damage ${String(Math.round(st.damageTaken)).padStart(4)}  KOs ${st.kos}  ${(f / 60).toFixed(0).padStart(3)} s  lowest party HP ${(lowest * 100).toFixed(0).padStart(3)}%  XP ${st.xpEarned}${bossAt >= 0 ? `  boss ${((f - bossAt) / 60).toFixed(0)} s` : ''}`);
}
console.log(rows.join('\n'));
console.log(`--- ${S.id} on ${difficulty}, ${N} seeds${careless ? ', careless bot' : ''}${flag('--no-hazards') ? ', no hazards' : ''}${mult ? `, enemyMult ${S.enemyMult}` : ''}${partyArg ? `, party ${partyArg}` : ''}: cleared ${cleared}, wiped ${wiped}${fell > 0 ? ` (the ward fell ${fell})` : ''}, stuck ${stuck}; ` +
  `average damage taken ${(dmg / N).toFixed(0)}, KOs ${(kos / N).toFixed(2)}, time ${(frames / N / 60).toFixed(0)} s, lowest party HP ${(low / N * 100).toFixed(0)}%` +
  (bossRuns > 0 ? `, boss fight ${(bossFrames / bossRuns / 60).toFixed(0)} s (${(100 * bossFrames / bossRuns / (frames / N)).toFixed(0)}% of the run)` : ''));
