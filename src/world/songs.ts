// What plays on the note highway, and when (docs/level-11.md, docs/level-12.md). Two things do: the 4.3 rooftop's song, which a beat starts, and
// Eddie's riff, which his Special starts. A scene or a script ticks `Songs` right after the sim and hands it the view's HudView.solo: when that
// goes from null to set with a life (the stand's, not the roof's), the riff starts; when it goes null before the riff is over (a swap away, a KO),
// the riff stops; and when Encore keeps the stand up after a solo, the next tick starts it again. The rooftop's song takes the whole keyboard, so
// the sim hears nothing meanwhile (`holds`); the riff takes the action keys and leaves Eddie's swap alone (`keys`).
//   liveSongs      the play scene's: the real highway, played by the keys or, for ?bot=1, by the solo's bot.
//   headlessSongs  the Node runs': the judge and the bot, no screen and no sound.
import type { HudView, Sim, SimInput } from '../core/types.ts';
import type { Ctx } from '../gfx/canvas.ts';
import type { BotOpts } from '../solo/bot.ts';
import { botRiff, liveRiff } from './riff.ts';
import { botSong, liveSong } from './rooftop.ts';
import type { Song, SongChart, SongInput } from './rooftop.ts';

export interface Songs {
  /** The rooftop beat: plays the song and calls done when it ends. */
  play(chart: SongChart, done: () => void): void;
  /** One 60 Hz tick, after the sim's. `solo` is the view's HudView.solo. */
  step(input: SongInput | undefined, solo: HudView['solo']): void;
  /** Paints the highways (the live ones only). */
  draw(ctx: Ctx): void;
  /** True while the rooftop's song plays: the sim gets no input at all. */
  readonly holds: boolean;
  /** The input the sim gets while the riff plays: the action keys belong to the highway, so only the swap gets through. */
  keys(input: SimInput): SimInput;
  /** The pause menu is up: the highways hold, and a press on a lane brings them back. */
  pause(): void;
  /** The sim was rebuilt: whatever played stops. */
  clear(): void;
}

interface Starters {
  song(sim: Sim, chart: SongChart, done: () => void): Song;
  riff(sim: Sim, done: () => void): Song;
}

function songsWith(sim: () => Sim, start: Starters): Songs {
  let song: Song | null = null;
  let riff: Song | null = null;
  const stopAll = (): void => { song?.stop(); riff?.stop(); song = null; riff = null; };
  return {
    play(chart, done) { song = start.song(sim(), chart, () => { song = null; done(); }); },
    step(input, solo) {
      song?.step(input);
      // The roof's solo has no life: only the stand's starts a riff.
      if (!song && !riff && solo && solo.life > 0) riff = start.riff(sim(), () => { riff = null; });
      else if (riff && !riff.over && !solo) { riff.stop(); riff = null; }
      riff?.step(input);
    },
    draw(ctx) { song?.draw(ctx); riff?.draw(ctx); },
    get holds() { return song !== null; },
    keys: (input) => (riff && !riff.over
      ? { ...input, mx: 0, my: 0, attackHeld: false, attackPressed: false, specialPressed: false, specialHeld: false, burstPressed: false }
      : input),
    pause() { song?.pause(); riff?.pause(); },
    clear: stopAll,
  };
}

/** The play scene's songs. `botOpts` says who plays: a bot's accuracy for ?bot=1, undefined for a person at the keys. */
export const liveSongs = (sim: () => Sim, botOpts: () => BotOpts | undefined): Songs => songsWith(sim, {
  song: (m, chart, done) => liveSong(m, chart, done, botOpts()),
  riff: (m, done) => liveRiff(m, done, botOpts()),
});

/** The measure scripts' songs: no screen, no sound, the bot at `opts` plays. */
export const headlessSongs = (sim: () => Sim, opts: BotOpts): Songs => songsWith(sim, {
  song: (m, chart, done) => botSong(m, chart, done, opts),
  riff: (m, done) => botRiff(m, done, opts),
});
