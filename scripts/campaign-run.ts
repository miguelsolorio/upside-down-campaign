// A whole run, 1.1 to 3.2, played headlessly by the bot and carried between stages the way flow.ts carries it:
// partyFor and the map's picks build each party, recordClear keeps every hero at their best. Inside a stage it does
// what the play scene does for a person: lights each string of lights it walks past (half heal, new checkpoint) and,
// on a wipe, rebuilds at the last lights with levels, XP and kills kept. scripts/measure-campaign.ts prints it, and
// tests/pace.test.ts holds it to the pace in docs/game-design.md.
import { createSim } from '../src/combat/index.ts';
import { createBot } from '../src/combat/bot.ts';
import { STAGE_ORDER, needsPicks, partyFor, pickParty } from '../src/core/campaign.ts';
import { recordClear, withPicks } from '../src/core/progress.ts';
import type { Progress } from '../src/core/progress.ts';
import type { Difficulty, HeroId, HeroSnapshot, PartySeed, Sim, SimInput } from '../src/core/types.ts';
import { xpForLevel } from '../src/progression/xp.ts';
import { nearUsable } from '../src/world/interact.ts';
import { isLoss } from '../src/world/loss.ts';
import { routeFrom, simOptions, stageGrid } from '../src/world/options.ts';
import { createDirector } from '../src/world/triggers.ts';
import type { DirectorState } from '../src/world/triggers.ts';
import type { StageData } from '../src/world/types.ts';
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
import { STAGE_51 } from '../src/world/stages/stage51.ts';
import { STAGE_52 } from '../src/world/stages/stage52.ts';

export const STAGES: Record<string, StageData> = { '1.1': STAGE_11, '1.2': STAGE_12, '1.3': STAGE_13, '2.1': STAGE_21, '2.2': STAGE_22, '2.3': STAGE_23, '3.1': STAGE_31, '3.2': STAGE_32, '3.3': STAGE_33, '4.1': STAGE_41, '4.2': STAGE_42, '5.1': STAGE_51, '5.2': STAGE_52 };

/** Props a retry leaves open, as the play scene's KEPT_PROPS. */
const KEPT = new Set(['gate', 'log', 'target', 'lights', 'door', 'console', 'crate', 'camera', 'van', 'vines', 'firebox', 'hidden', 'crack', 'gap']);
/** Frames one attempt at a stage may take, and attempts before a stage counts as stuck. */
const MAX_FRAMES = 30000;
const MAX_TRIES = 6;

export interface RunOpts {
  difficulty?: Difficulty;
  careless?: boolean;
  /** Seconds between swaps to the next hero, for a player who shares the lead around. 0 leaves swapping to the bot. */
  rotate?: number;
  /** The party picked on the map for 2.2 and 2.3, lead first. Default: confirm whatever the panel shows. */
  picks?: HeroId[];
  /** Skip the lights, as the ?bot=1 run in the browser does. */
  noLights?: boolean;
}

export interface StageRun {
  stage: string;
  cleared: boolean;
  /** Wipes before the clear (a retry each). */
  wipes: number;
  frames: number;
  xp: number;
  /** The party that walked in and the party that walked out. */
  entered: PartySeed[];
  party: HeroSnapshot[];
}

export interface CampaignRun {
  stages: StageRun[];
  /** Every hero met, at their best, after each stage (progress.heroes). */
  after: Record<string, PartySeed[]>;
}

/** Total XP a hero has earned since Lv 1. */
export const totalXp = (s: { level?: number; xp?: number }): number => xpForLevel(s.level ?? 1) + (s.xp ?? 0);

/** One stage with retries, the way a person plays it in the browser. */
export function runStage(id: string, party: PartySeed[], seed: number, o: RunOpts = {}): StageRun {
  const S = STAGES[id];
  if (!S) throw new Error(`unknown stage ${id}`);
  const grid = stageGrid(S);
  let checkpoint: { x: number; y: number; state: DirectorState } = { x: S.start.x, y: S.start.y, state: { fired: [], cleared: [] } };
  const killed = new Set<string>();
  let sim: Sim = createSim(simOptions(S, grid, { party, seed, difficulty: o.difficulty ?? 'chief' }));
  /** Max's Walkman, once a beat gives it (4.2): a retry keeps it, as the save does. */
  let walkman = false;
  const lightUp = (prop: string): void => {
    sim.openProp(prop);
    sim.healParty(0.5);
    const cp = S.checkpoints.find((c) => c.prop === prop);
    if (cp) checkpoint = { x: cp.x, y: cp.y, state: dir.snapshot() };
  };
  const dir = createDirector(S.beats, S.waves, {
    sim: () => sim, say: (_i, done) => done(), scare: (done) => done(), open: (p) => sim.openProp(p),
    alarm: () => undefined, jingle: () => undefined, finish: () => undefined,
    light: (p) => { if (sim.view().props.some((q) => q.id === p && q.kind === 'lights' && q.state !== 'lit')) lightUp(p); },
    walkman: () => { walkman = true; sim.giveWalkman?.(); },
  });
  let bot = createBot({ grid, waypoints: S.waypoints, careless: o.careless });
  const every = Math.round((o.rotate ?? 0) * 60);
  let wipes = 0, frames = 0, f = 0, lastSwap = 0;
  while (!dir.finished() && wipes < MAX_TRIES) {
    let lost = false;
    for (f = 0; f < MAX_FRAMES && !dir.finished() && !lost; f++, frames++) {
      const input: SimInput = bot.next(sim);
      if (every > 0 && input.swapTo < 0 && frames - lastSwap >= every) {
        const hud = sim.view().hud;
        if (!hud.boss && !hud.ward) {
          const n = hud.party.length, at = hud.party.findIndex((p) => p.active);
          for (let k = 1; k < n; k++) if (!hud.party[(at + k) % n]?.ko) { input.swapTo = (at + k) % n; break; }
          lastSwap = frames;
        }
      }
      if (input.swapTo >= 0) lastSwap = frames;
      const ev = sim.step(input);
      dir.events(ev);
      for (const e of ev) if (e.t === 'kill') killed.add(e.spawnId);
      if (ev.some(isLoss)) lost = true;
      const p = sim.heroPos();
      dir.tick(Math.floor(p.x / 16), Math.floor((p.y - 4) / 16));
      // A person presses Space at every string of lights they pass, but not mid-boss or mid-defense.
      if (!o.noLights && f % 10 === 0 && !dir.busy()) {
        const v = sim.view();
        const near = v.hud.boss || v.hud.ward ? null : nearUsable(v.props, p);
        if (near && near.kind === 'lights') lightUp(near.id);
      }
    }
    if (dir.finished() || !lost) break;
    // A wipe: back to the last lights with the same party, levels and XP, the dead left dead and the open left open.
    wipes++;
    const live = sim.party().map((h) => ({ id: h.id, level: h.level, xp: h.xp, bonus: h.bonus }));
    const open = sim.view().props.filter((q) => KEPT.has(q.kind) && (q.state === 'open' || q.state === 'lit')).map((q) => q.id);
    const skip = live.some((h) => h.id === 'eleven') ? [...killed, 'eleven'] : [...killed];
    sim = createSim(simOptions(S, grid, { party: live, start: { x: checkpoint.x, y: checkpoint.y }, seed: seed + 1000 * wipes, difficulty: o.difficulty ?? 'chief', skipSpawns: skip, openProps: open, walkman }));
    dir.restore(checkpoint.state);
    bot = createBot({ grid, waypoints: routeFrom(S.waypoints, checkpoint), careless: o.careless });
  }
  return { stage: id, cleared: dir.finished(), wipes, frames, xp: sim.stats().xpEarned, entered: party, party: sim.party() };
}

/** 1.1 to 2.3 in order, each party built from the last clear as flow.ts builds it. A stuck stage still carries on. */
export function runCampaign(seed: number, o: RunOpts = {}, stages: readonly string[] = STAGE_ORDER): CampaignRun {
  let progress: Progress | null = null;
  const out: CampaignRun = { stages: [], after: {} };
  for (const id of stages) {
    // The map's picks panel opens on the last picks, fixed up for the stage, and the player confirms it.
    if (needsPicks(id)) progress = withPicks(progress, pickParty(id, o.picks ?? progress?.picks, progress?.heroes));
    const party = partyFor(id, progress?.heroes ?? [], progress?.picks);
    const r = runStage(id, party, seed, o);
    out.stages.push(r);
    progress = recordClear(progress, id, r.party);
    out.after[id] = progress.heroes.map((h) => ({ ...h }));
  }
  return out;
}
