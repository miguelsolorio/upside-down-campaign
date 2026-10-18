// PUBLIC API of solo: Eddie's Hellfire solo as a note highway, a retro Guitar Hero (docs/chapter-4.md). A self-contained
// minigame object, not wired into any stage: Eddie's special and the 4.3 rooftop call createSolo and drive it from their
// own update and draw.
//
//   const solo = createSolo({ chart: riff, onHit: (perfect) => ..., onMiss: () => ..., onEnd: (result) => ... });
//   // each tick: solo.update(g.input); each frame: solo.draw(ctx); when solo.done, drop it.
//
// The three lanes are the Attack, Special and Crit actions read through the game's input, so a rebinding moves them. The
// solo starts the matching section of the `solo` track itself, in time with its first note, and hands the stage's music back
// when it ends. Everything it judges is the pure code beside it: chart.ts (the notes, read off the track's lead line),
// judge.ts (the windows, the streak, the ring, the three-miss end) and bot.ts (a player for tests). draw.ts paints the neck.
import type { InputState } from '../core/input.ts';
import { getPromptDevice, labelOf } from '../core/bindings.ts';
import { FPS } from '../core/config.ts';
import { audio } from '../audio/index.ts';
import { startSection } from '../audio/section.ts';
import type { Section } from '../audio/section.ts';
import { compile } from '../audio/tracks/compile.ts';
import { SOLO } from '../audio/tracks/solo.ts';
import type { Ctx } from '../gfx/canvas.ts';
import { LANE_COUNT } from './chart.ts';
import type { Chart, Lane } from './chart.ts';
import { drawHighway } from './draw.ts';
import type { HighwayView } from './draw.ts';
import { HIT_WINDOW, MAX_MISSES, createJudge, ringRadius } from './judge.ts';
import type { EndReason, SoloResult } from './judge.ts';

export type { Chart, ChartNote, Lane } from './chart.ts';
export { CHARTS, riff, rooftop } from './chart.ts';
export { HIT_WINDOW, MAX_MISSES, PERFECT_WINDOW, RING_MAX, RING_START, ringRadius } from './judge.ts';
export type { EndReason, SoloResult } from './judge.ts';

/** The three actions the solo reads: a press of any one is a press on its lane. A rebinding moves the lane with it. */
export type SoloInput = Pick<InputState, 'pressed' | 'interrupted' | 'offer'>;

export interface SoloOpts {
  chart: Chart;
  /** A note was struck. `perfect` is within two frames. The stage crits and widens the ring here. */
  onHit?(perfect: boolean, lane: Lane): void;
  /** A note went by. The stage shrinks the ring and, on the rooftop, lets a demobat through. */
  onMiss?(): void;
  /** The solo is over: the song played out, three misses in a row cut it short, or stop() was called. */
  onEnd?(result: SoloResult): void;
  /** Frames a note takes to come down the neck. Default 60. */
  travel?: number;
  /** Misses in a row that cut the solo short. Default 3, the owner's rule. Infinity makes a miss only a miss, for a long song. */
  maxMisses?: number;
  /** Play the track under it. Default true. A test or a silent run turns it off. */
  sound?: boolean;
}

export interface Solo {
  /** One 60 Hz tick. */
  update(input: SoloInput): void;
  /** Paints the highway over the stage. */
  draw(ctx: Ctx): void;
  /** True once the solo is over and its closing beat has played out. The stage drops it then. */
  readonly done: boolean;
  /** True from the tick onEnd fires, a little before done. */
  readonly over: boolean;
  /** Null until it is over. */
  readonly result: SoloResult | null;
  /** The ring step now (0 to RING_MAX), and its radius in px. */
  readonly ring: number;
  readonly radius: number;
  readonly streak: number;
  /** Frames since the music started: negative in the lead-in. */
  readonly frame: number;
  /** Seconds the music has been playing by the audio clock, or null while it is not (the lead-in, a pause, no sound yet). The stage can check drift against `frame`. */
  audioTime(): number | null;
  /** Holds the solo and its music, for a pause menu. update() also pauses by itself when the window loses focus. */
  pause(): void;
  /** Goes on from the start of the bar the music was in, after a short lead-in. update() resumes on a press. */
  resume(): void;
  /** Ends it now, as a quit. */
  stop(): void;
}

/** Frames the closing beat runs after the solo ends: the squeal and the shake, or the fade. */
const OUTRO: Record<EndReason, number> = { finished: 70, feedback: 50, quit: 0 };
/** The music is asked for this many frames early: the live player starts a short while after it is asked. */
const AUDIO_LEAD = 3;

/** The frame, counted from the section's start, that each bar of the chart's section begins on. */
function barFrames(chart: Chart): number[] {
  const c = compile(SOLO);
  const base = c.starts[chart.bar] as number;
  return Array.from({ length: chart.bars }, (_, k) => Math.round(((c.starts[chart.bar + k] as number) - base) * c.stepSec * FPS));
}

export function createSolo(opts: SoloOpts): Solo {
  const { chart } = opts;
  const travel = opts.travel ?? 60;
  const sound = opts.sound ?? true;
  const judge = createJudge(chart, opts.maxMisses);
  const bars = barFrames(chart);

  let t = -travel;
  let section: Section | null = null;
  /** Where the music comes in: the bar to start from and the frame it is asked on. */
  let audioFrom: { bar: number; at: number } | null = { bar: 0, at: -AUDIO_LEAD };
  let paused = false;
  let reason: EndReason | null = null;
  let result: SoloResult | null = null;
  let outro = -1;
  let done = false;
  const struck = Array.from({ length: LANE_COUNT }, () => -1);
  const pressed = Array.from({ length: LANE_COUNT }, () => -1);
  let floater: HighwayView['floater'] = null;

  const stopSound = (fade: number): void => { section?.stop(fade); section = null; };

  const finish = (why: EndReason): void => {
    if (reason) return;
    reason = why;
    outro = 0;
    result = judge.result(why, Math.max(0, t));
    audioFrom = null;
    if (why === 'feedback') { stopSound(0.06); audio.sfx('squeal'); } else stopSound(why === 'finished' ? 0.6 : 0.2);
    if (OUTRO[why] === 0) done = true;
    opts.onEnd?.(result);
  };

  const pause = (): void => {
    if (reason || paused) return;
    paused = true;
    stopSound(0.1);
  };
  const resume = (): void => {
    if (reason || !paused) return;
    paused = false;
    if (t < 0) { audioFrom = { bar: 0, at: -AUDIO_LEAD }; return; }
    // Back to a bar line a little before where it stopped, so a note that was still waiting in its window is long past.
    let k = 0;
    while (k + 1 < bars.length && (bars[k + 1] as number) <= t - HIT_WINDOW - 1) k++;
    t = (bars[k] as number) - travel;
    audioFrom = { bar: k, at: (bars[k] as number) - AUDIO_LEAD };
    for (let i = 0; i < LANE_COUNT; i++) { struck[i] = -1; pressed[i] = -1; }
  };

  const lanesPressed = (input: SoloInput): boolean[] => [
    input.pressed('attack'),
    input.pressed('special'),
    // Crit is the burst action, and Space (interact) too unless it came with Attack: a controller's A and the touch A do both.
    input.pressed('burst') || (input.pressed('interact') && !input.pressed('attack')),
  ];

  const update = (input: SoloInput): void => {
    if (done) return;
    if (reason) {
      outro++;
      if (outro >= OUTRO[reason]) done = true;
      return;
    }
    if (paused) {
      // A press brings it back; the press itself is not a note.
      if (lanesPressed(input).some(Boolean)) resume();
      return;
    }
    if (input.interrupted()) { pause(); return; }
    input.offer('attack'); input.offer('special'); input.offer('burst');

    if (sound && audioFrom && t >= audioFrom.at) {
      section = startSection(SOLO.id, chart.bar + audioFrom.bar, chart.bars - audioFrom.bar, AUDIO_LEAD / FPS);
      audioFrom = null;
    }
    for (let i = 0; i < LANE_COUNT; i++) {
      if (struck[i]! >= 0) struck[i]!++;
      if (pressed[i]! >= 0) pressed[i]!++;
    }
    if (floater) floater.age++;

    lanesPressed(input).forEach((on, i) => {
      if (!on || judge.ended) return;
      const lane = i as Lane;
      pressed[i] = 0;
      const v = judge.press(lane, t);
      if (v === 'empty') return;
      struck[i] = 0;
      floater = { word: v === 'perfect' ? 'PERFECT' : 'HIT', lane, age: 0 };
      opts.onHit?.(v === 'perfect', lane);
    });
    for (const lane of judge.advance(t)) {
      floater = { word: 'MISS', lane, age: 0 };
      if (!judge.ended) audio.sfx('noMp');
      opts.onMiss?.();
    }
    if (judge.ended) finish('feedback');
    else if (t >= chart.length) finish('finished');
    else t++;
  };

  return {
    update,
    draw(ctx) {
      drawHighway(ctx, {
        chart, judge, t, travel, struck, pressed, floater, outro, reason, paused, maxMisses: opts.maxMisses ?? MAX_MISSES,
        keys: [labelOf('attack'), labelOf('special'), getPromptDevice() === 'touch' ? 'D20' : getPromptDevice() === 'gamepad' ? labelOf('burst') : labelOf('interact')],
      });
    },
    get done() { return done; },
    get over() { return reason !== null; },
    get result() { return result; },
    get ring() { return judge.ring; },
    get radius() { return ringRadius(judge.ring); },
    get streak() { return judge.streak; },
    get frame() { return t; },
    audioTime: () => (section ? section.elapsed() : null),
    pause,
    resume,
    stop: () => finish('quit'),
  };
}
