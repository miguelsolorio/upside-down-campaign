// Eddie's Hellfire solo on the note highway (docs/level-11.md): the `riff` chart played against the sim. Like the rooftop's song
// (rooftop.ts) it has two drivers that share the rule: `liveRiff` runs src/solo's createSolo for the play scene, with the real input or, for
// ?bot=1, the solo's own bot; `botRiff` runs the chart through the judge alone, frame by frame, for the measure scripts and the tests. Each
// tells the sim soloNote for every note with the judge's ring radius, and soloEnd as it ends, `cut` when three misses in a row ended it. The
// sim's own clock pulses the ring until the first note. A solo that finishes with Encore behind it is started again by the same watch that
// started it (songs.ts).
import { createSolo, ringRadius, riff } from '../solo/index.ts';
import type { Solo } from '../solo/index.ts';
import { botInput, createSoloBot } from '../solo/bot.ts';
import type { BotOpts } from '../solo/bot.ts';
import { createJudge } from '../solo/judge.ts';
import type { Sim } from '../core/types.ts';
import { SONG_BOT } from './rooftop.ts';
import type { Song } from './rooftop.ts';

/** Frames a note takes to come down the neck (createSolo's default): the live riff spends them before its first note, and so does the bot's. */
const LEAD = 60;

/** The highway for the play scene. Three misses in a row cut it short. With `bot`, the solo's bot plays it. */
export function liveRiff(sim: Sim, done: () => void, bot?: BotOpts): Song {
  const player = bot ? createSoloBot(riff, bot) : null;
  let called = false;
  const solo: Solo = createSolo({
    chart: riff,
    onHit: (perfect) => sim.soloNote?.(true, perfect, solo.radius),
    onMiss: () => sim.soloNote?.(false, false, solo.radius),
    onEnd: (r) => sim.soloEnd?.(r.reason !== 'finished'),
  });
  return {
    step(input) {
      const feed = player ? botInput(player.at(solo.frame)) : input;
      if (feed) solo.update(feed);
      if (solo.done && !called) { called = true; done(); }
    },
    draw(ctx) { if (!solo.done) solo.draw(ctx); },
    stop: () => solo.stop(),
    pause: () => solo.pause(),
    get done() { return called; },
    get over() { return solo.over; },
  };
}

/** The same riff with no screen and no sound: the judge and the bot, a note at a time, in step with the sim. */
export function botRiff(sim: Sim, done: () => void, opts: BotOpts = SONG_BOT): Song {
  const judge = createJudge(riff);
  const player = createSoloBot(riff, opts);
  let frame = -LEAD;
  let over = false;
  const end = (cut: boolean): void => { over = true; sim.soloEnd?.(cut); done(); };
  return {
    step() {
      if (over) return;
      for (const lane of player.at(frame)) {
        const v = judge.press(lane, frame);
        if (v !== 'empty') sim.soloNote?.(true, v === 'perfect', ringRadius(judge.ring));
      }
      for (const _ of judge.advance(frame)) sim.soloNote?.(false, false, ringRadius(judge.ring));
      frame++;
      if (judge.ended) end(true);
      else if (frame >= riff.length) end(false);
    },
    draw() { /* headless */ },
    stop() { if (!over) { over = true; sim.soloEnd?.(true); } },
    pause() { /* headless */ },
    get done() { return over; },
    get over() { return over; },
  };
}
