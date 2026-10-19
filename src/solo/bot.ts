// A player for the Hellfire solo, for the tests and ?bot runs. Pure: no DOM. It reads the chart and presses each note's lane
// at the note's frame, give or take a few frames of jitter, and with a chance `accuracy` it plays the note at all. A seed
// makes the same bot play the same solo every time. `stray` adds presses on lanes with no note near, which cost nothing.
import { createRng } from '../core/rng.ts';
import type { Action } from '../core/bindings.ts';
import type { Chart, Lane } from './chart.ts';
import { LANE_COUNT } from './chart.ts';
import { createJudge } from './judge.ts';
import type { SoloResult } from './judge.ts';

export interface BotOpts {
  /** The chance 0 to 1 that it plays a given note. 1 plays every note. */
  accuracy: number;
  /** The most frames early or late it presses, either way. A press is that many frames off at most, evenly spread. */
  jitter: number;
  seed?: number;
  /** Stray presses per second on a random lane, with no regard for the notes. */
  stray?: number;
}

export interface BotPress { frame: number; lane: Lane }

/** Every press the bot makes over the chart, in frame order. */
export function botPresses(chart: Chart, opts: BotOpts): BotPress[] {
  const rng = createRng(opts.seed ?? 1);
  const out: BotPress[] = [];
  for (const n of chart.notes) {
    const play = rng() < opts.accuracy;
    const off = Math.round((rng() * 2 - 1) * opts.jitter);
    if (play) out.push({ frame: n.frame + off, lane: n.lane });
  }
  if (opts.stray) {
    const n = Math.round((opts.stray * chart.length) / 60);
    for (let i = 0; i < n; i++) out.push({ frame: Math.floor(rng() * chart.length), lane: Math.floor(rng() * LANE_COUNT) as Lane });
  }
  return out.sort((a, b) => a.frame - b.frame || a.lane - b.lane);
}

export interface SoloBot {
  /** The lanes it presses on this frame. */
  at(frame: number): Lane[];
  readonly presses: readonly BotPress[];
}

export function createSoloBot(chart: Chart, opts: BotOpts): SoloBot {
  const presses = botPresses(chart, opts);
  const byFrame = new Map<number, Lane[]>();
  for (const p of presses) byFrame.set(p.frame, [...(byFrame.get(p.frame) ?? []), p.lane]);
  return { at: (frame) => byFrame.get(frame) ?? [], presses };
}

/** The actions that carry each lane: Attack, Special and burst, the Crit lane. */
export const LANE_ACTIONS: readonly Action[] = ['attack', 'special', 'burst'];

/** The bot's presses as game input, for a scene's update(): `pressed` is true for the lanes it hits this frame. */
export function botInput(lanes: readonly Lane[]): { pressed(a: Action): boolean; interrupted(): boolean; offer(a: Action): void } {
  const set = new Set<Action>(lanes.map((l) => LANE_ACTIONS[l] as Action));
  return { pressed: (a) => set.has(a), interrupted: () => false, offer: () => {} };
}

/** Plays a whole chart through a judge with no scene: for each frame it presses, then advances. */
export function runBot(chart: Chart, opts: BotOpts): SoloResult {
  const bot = createSoloBot(chart, opts);
  const judge = createJudge(chart);
  // A press can come a few frames before the first note, so the clock starts before frame zero, as the scene's does.
  let frame = -Math.ceil(opts.jitter);
  for (; frame < chart.length && !judge.ended; frame++) {
    for (const lane of bot.at(frame)) judge.press(lane, frame);
    judge.advance(frame);
  }
  return judge.result(judge.ended ? 'feedback' : 'finished', frame);
}
