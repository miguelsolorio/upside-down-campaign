// The 4.3 rooftop's song (docs/level-12.md): the note highway played against the sim. Each struck note pulses Eddie's ring, each
// miss sends a bat down at him. Two drivers share the rule: `liveSong` runs src/solo's createSolo for the play scene, with the real
// input or, for ?bot=1, the solo's own bot; `botSong` runs the same chart through the judge alone, frame by frame, for the measure
// scripts and the tests. Neither draws anything the sim knows about: the sim only hears rooftop(true), soloNote and rooftop(false).
import type { InputState } from '../core/input.ts';
import type { Sim } from '../core/types.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { CHARTS, createSolo } from '../solo/index.ts';
import type { Solo } from '../solo/index.ts';
import { botInput, createSoloBot } from '../solo/bot.ts';
import type { BotOpts } from '../solo/bot.ts';
import { createJudge } from '../solo/judge.ts';

export type SongChart = 'rooftop';

/** How the headless runs play the song: the careful bot strikes nine notes in ten, the careless one seven. */
export const SONG_BOT: BotOpts = { accuracy: 0.9, jitter: 3 };
export const SONG_CARELESS: BotOpts = { accuracy: 0.7, jitter: 5 };

export interface Song {
  /** One 60 Hz tick. */
  step(input?: Pick<InputState, 'pressed' | 'interrupted' | 'offer'>): void;
  /** Paints the highway (the live one only). */
  draw(ctx: Ctx): void;
  /** True once the song is over and the director can go on. */
  readonly done: boolean;
}

/** The highway for the play scene. A long song: a miss is only a miss (maxMisses Infinity). With `bot`, the solo's bot plays it. */
export function liveSong(sim: Sim, chart: SongChart, done: () => void, bot?: BotOpts): Song {
  sim.rooftop?.(true);
  let ended = false;
  const player = bot ? createSoloBot(CHARTS[chart], bot) : null;
  const solo: Solo = createSolo({
    chart: CHARTS[chart],
    maxMisses: Infinity,
    onHit: (perfect) => sim.soloNote?.(true, perfect),
    onMiss: () => sim.soloNote?.(false, false),
    onEnd: () => { ended = true; sim.rooftop?.(false); },
  });
  let called = false;
  return {
    step(input) {
      const feed = player ? botInput(player.at(solo.frame)) : input;
      if (feed) solo.update(feed);
      if (solo.done && !called) { called = true; if (!ended) sim.rooftop?.(false); done(); }
    },
    draw(ctx) { if (!solo.done) solo.draw(ctx); },
    get done() { return called; },
  };
}

/** The same song with no screen and no sound: the judge and the bot, a note at a time, in step with the sim. */
export function botSong(sim: Sim, chart: SongChart, done: () => void, opts: BotOpts = SONG_BOT): Song {
  const c = CHARTS[chart];
  const judge = createJudge(c, Infinity);
  const player = createSoloBot(c, opts);
  sim.rooftop?.(true);
  let frame = -Math.ceil(opts.jitter);
  let over = false;
  return {
    step() {
      if (over) return;
      for (const lane of player.at(frame)) {
        const v = judge.press(lane, frame);
        if (v !== 'empty') sim.soloNote?.(true, v === 'perfect');
      }
      for (const _ of judge.advance(frame)) sim.soloNote?.(false, false);
      frame++;
      if (frame >= c.length) { over = true; sim.rooftop?.(false); done(); }
    },
    draw() { /* headless */ },
    get done() { return over; },
  };
}
