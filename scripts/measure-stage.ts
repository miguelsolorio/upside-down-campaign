// How hard is a stage? Plays it headlessly with the bot over N seeds and prints a table, so a stage can be tuned with
// numbers instead of by feel. Run from the project root (Node strips the types itself):
//
//   node scripts/measure-stage.ts [stage] [difficulty] [seeds] [--careless] [--no-hazards]
//   node scripts/measure-stage.ts 1.2 chief 20
//   node scripts/measure-stage.ts 1.2 chief 20 --careless
//
// The default bot sidesteps darts, slams and bashes almost perfectly, so it shows the best case. --careless never
// dodges and never circles a shielded guard, which is closer to a player who is not watching the telegraphs.
// --no-hazards switches off the stage's floor hazards, to see how dangerous the enemies are on their own.
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import { STAGE_11 } from '../src/world/stages/stage11.ts';
import { STAGE_12 } from '../src/world/stages/stage12.ts';
import { defaultParty } from '../src/core/campaign.ts';
import type { Difficulty } from '../src/core/types.ts';
import type { StageData } from '../src/world/types.ts';

const args = process.argv.slice(2);
const flag = (f: string): boolean => args.includes(f);
const [stageId = '1.2', difficulty = 'chief', seedsArg = '20'] = args.filter((a) => !a.startsWith('--'));
const STAGES: Record<string, StageData> = { '1.1': STAGE_11, '1.2': STAGE_12 };
const base = STAGES[stageId];
if (!base) throw new Error(`unknown stage ${stageId}; try ${Object.keys(STAGES).join(' or ')}`);
if (!['kid', 'chief', 'upside'].includes(difficulty)) throw new Error(`difficulty is kid, chief or upside, not ${difficulty}`);
const S: StageData = flag('--no-hazards') ? { ...base, hazards: [] } : base;
const N = Number(seedsArg);
const careless = flag('--careless');
const tile = (x: number, y: number): [number, number] => [Math.floor(x / 16), Math.floor((y - 4) / 16)];

const rows: string[] = [];
let cleared = 0, wiped = 0, stuck = 0, dmg = 0, kos = 0, frames = 0, low = 0;
for (let seed = 1; seed <= N; seed++) {
  const grid = stageGrid(S);
  const sim = createSim(simOptions(S, grid, { party: defaultParty(stageId), seed, difficulty: difficulty as Difficulty }));
  const bot = createBot({ grid, waypoints: S.waypoints, careless });
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (_i, done) => done(), scare: (done) => done(), open: (id) => sim.openProp(id),
    alarm: () => undefined, jingle: () => undefined, finish: () => undefined,
  });
  let allDown = false, f = 0, lowest = 1;
  for (; f < 30000 && !dir.finished() && !allDown; f++) {
    const ev = sim.step(bot.next(sim));
    dir.events(ev);
    if (ev.some((e) => e.t === 'allDown')) allDown = true;
    const [tx, ty] = tile(sim.heroPos().x, sim.heroPos().y);
    dir.tick(tx, ty);
    const party = sim.party();
    lowest = Math.min(lowest, party.reduce((a, p) => a + p.hp, 0) / party.reduce((a, p) => a + p.hpMax, 0));
  }
  const st = sim.stats();
  const result = dir.finished() ? 'clear' : allDown ? 'WIPED' : 'STUCK';
  if (result === 'clear') cleared++; else if (result === 'WIPED') wiped++; else stuck++;
  dmg += st.damageTaken; kos += st.kos; frames += f; low += lowest;
  rows.push(`seed ${String(seed).padStart(3)}: ${result.padEnd(5)}  damage ${String(Math.round(st.damageTaken)).padStart(4)}  KOs ${st.kos}  ${(f / 60).toFixed(0).padStart(3)} s  lowest party HP ${(lowest * 100).toFixed(0).padStart(3)}%  XP ${st.xpEarned}`);
}
console.log(rows.join('\n'));
console.log(`--- ${S.id} on ${difficulty}, ${N} seeds${careless ? ', careless bot' : ''}${flag('--no-hazards') ? ', no hazards' : ''}: cleared ${cleared}, wiped ${wiped}, stuck ${stuck}; ` +
  `average damage taken ${(dmg / N).toFixed(0)}, KOs ${(kos / N).toFixed(2)}, time ${(frames / N / 60).toFixed(0)} s, lowest party HP ${(low / N * 100).toFixed(0)}%`);
