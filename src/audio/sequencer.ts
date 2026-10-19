// The bar-based sequencer. scheduleBar puts one bar of a track on the clock, so the same code runs live
// (a lookahead timer, one bar at a time) and offline (every bar up front).
import type { LayerId, Track } from './tracks/types.ts';
import { barSeconds, barStartSeconds, barStartSteps, compile, noteTiming, stepSeconds } from './tracks/compile.ts';
import { midiToHz } from './dsp.ts';
import { drum, tone } from './synth.ts';
import type { Routes } from './rig.ts';

/** The lookahead timer wakes every 25 ms and schedules any bar that starts within the next 100 ms. */
export const TICK_MS = 25;
export const LOOKAHEAD = 0.1;

/**
 * Schedules every note of one bar. `barIndex` counts from the start of play and wraps around the loop.
 * `t0` is the context time the bar starts. `layers` is either the list of layers to play, all routed to
 * `dest`, or a Routes object that sends each layer to its own bus. A layer that is not named is skipped.
 * `phase` picks the tempo of a track that has phases. Returns every source node it started.
 */
export function scheduleBar(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: Track,
  barIndex: number,
  t0: number,
  layers: Routes | readonly LayerId[],
  phase = 0,
): AudioScheduledSourceNode[] {
  const c = compile(track);
  const stepSec = stepSeconds(track, phase);
  const bar = ((barIndex % c.bars) + c.bars) % c.bars;
  const routes: Routes = Array.isArray(layers)
    ? Object.fromEntries((layers as readonly LayerId[]).map((l) => [l, dest]))
    : (layers as Routes);
  const started: AudioScheduledSourceNode[] = [];
  for (const n of c.byBar[bar]) {
    const target = routes[n.layer];
    if (!target) continue;
    const t = t0 + n.step * stepSec;
    if (n.drum) {
      // A drum rings for its own length. The compiler guarantees the next hit on the slot starts after that.
      started.push(...drum(ctx, target, n.drum, t, n.vel, barStartSteps(track, barIndex) + n.step));
    } else if (n.inst) {
      const inst = n.inst;
      const send = n.layer === 'base' ? routes.sendBase : routes.sendCombat;
      const { gate, release } = noteTiming(n, stepSec);
      started.push(...tone(ctx, target, {
        wave: inst.wave,
        freq: midiToHz(n.midi),
        t,
        gate,
        vol: inst.vol * n.vel,
        env: inst.env,
        release,
        vib: inst.vib,
        detune: inst.detune,
        send: inst.send ? send : undefined,
        sendAmt: inst.send,
      }));
    }
  }
  return started;
}

/**
 * The offline driver: schedules every bar from the start up to `seconds`, all at the tempo of `phase`. A track that
 * plays once stops after its last bar, and the rest of `seconds` is left for the tail to ring.
 */
export function scheduleOffline(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: Track,
  seconds: number,
  layers: Routes | readonly LayerId[],
  t0 = 0,
  phase = 0,
): void {
  for (let bar = 0; barStartSeconds(track, bar, phase) < seconds && (!track.once || bar < track.bars); bar++) {
    scheduleBar(ctx, dest, track, bar, t0 + barStartSeconds(track, bar, phase), layers, phase);
  }
}

export interface Driver {
  /** Context time the first bar started. */
  readonly startAt: number;
  /** The tempo phase now playing. A new phase takes hold at the next bar that has not been scheduled yet. */
  setPhase(phase: number): void;
  /** The loop bar sounding at context time `t`, from the bars scheduled so far. */
  barAt(t: number): number;
  /** Context time a play-once track runs out, known once its last bar is scheduled. Null for a loop and until then. */
  readonly endAt: number | null;
  stop(): void;
}

/** How many scheduled bars the driver remembers, for barAt. */
const HISTORY = 6;

/**
 * The live driver. A timer wakes every 25 ms and schedules any bar that starts within 100 ms, so the music
 * keeps time on the audio clock and not on the timer's. If the page stalls and a bar's start is already past,
 * the clock restarts from now rather than playing the bar in a burst. A track with `once` set stops after its
 * last bar and reports when it ends.
 */
export function startLive(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: Track,
  routes: Routes,
  startAt: number,
  onSources?: (sources: AudioScheduledSourceNode[]) => void,
  phase0 = 0,
): Driver {
  let bar = 0;
  let next = startAt;
  let first = startAt;
  let phase = phase0;
  let endAt: number | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const played: { bar: number; at: number }[] = [];
  const tick = (): void => {
    while (endAt === null && next < ctx.currentTime + LOOKAHEAD) {
      if (next < ctx.currentTime) next = ctx.currentTime + 0.02;
      if (bar === 0) first = next;
      // Schedule first: with no callback, an optional call would skip its arguments and play nothing.
      const sources = scheduleBar(ctx, dest, track, bar, next, routes, phase);
      onSources?.(sources);
      played.push({ bar, at: next });
      if (played.length > HISTORY) played.shift();
      next += barSeconds(track, bar, phase);
      bar++;
      if (track.once && bar >= track.bars) {
        endAt = next;
        if (timer !== undefined) clearInterval(timer);
      }
    }
  };
  tick();
  if (endAt === null) timer = setInterval(tick, TICK_MS);
  return {
    get startAt() { return first; },
    get endAt() { return endAt; },
    setPhase(p) { phase = p; },
    barAt(t) {
      let found = played.length > 0 ? played[0].bar : 0;
      for (const p of played) if (p.at <= t) found = p.bar;
      return found % track.bars;
    },
    stop() { if (timer !== undefined) clearInterval(timer); },
  };
}
