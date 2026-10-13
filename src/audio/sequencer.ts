// The bar-based sequencer. scheduleBar puts one bar of a track on the clock, so the same code runs live
// (a lookahead timer, one bar at a time) and offline (every bar up front).
import type { LayerId, Track } from './tracks/types.ts';
import { barSeconds, compile, noteTiming } from './tracks/compile.ts';
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
 * Returns every source node it started.
 */
export function scheduleBar(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: Track,
  barIndex: number,
  t0: number,
  layers: Routes | readonly LayerId[],
): AudioScheduledSourceNode[] {
  const c = compile(track);
  const bar = ((barIndex % c.bars) + c.bars) % c.bars;
  const routes: Routes = Array.isArray(layers)
    ? Object.fromEntries((layers as readonly LayerId[]).map((l) => [l, dest]))
    : (layers as Routes);
  const started: AudioScheduledSourceNode[] = [];
  for (const n of c.byBar[bar]) {
    const target = routes[n.layer];
    if (!target) continue;
    const t = t0 + n.step * c.stepSec;
    if (n.drum) {
      // A drum rings for its own length. The compiler guarantees the next hit on the slot starts after that.
      started.push(...drum(ctx, target, n.drum, t, n.vel, barIndex * 16 + n.step));
    } else if (n.inst) {
      const inst = n.inst;
      const send = n.layer === 'base' ? routes.sendBase : routes.sendCombat;
      const { gate, release } = noteTiming(n, c.stepSec);
      started.push(...tone(ctx, target, {
        wave: inst.wave,
        freq: midiToHz(n.midi),
        t,
        gate,
        vol: inst.vol * n.vel,
        env: inst.env,
        release,
        vib: inst.vib,
        send: inst.send ? send : undefined,
        sendAmt: inst.send,
      }));
    }
  }
  return started;
}

/** The offline driver: schedules every bar from the start up to `seconds`. */
export function scheduleOffline(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: Track,
  seconds: number,
  layers: Routes | readonly LayerId[],
  t0 = 0,
): void {
  const barSec = barSeconds(track);
  for (let bar = 0; bar * barSec < seconds; bar++) scheduleBar(ctx, dest, track, bar, t0 + bar * barSec, layers);
}

export interface Driver {
  /** Context time bar zero started. */
  readonly startAt: number;
  stop(): void;
}

/**
 * The live driver. A timer wakes every 25 ms and schedules any bar that starts within 100 ms, so the music
 * keeps time on the audio clock and not on the timer's. If the page stalls and a bar's start is already past,
 * the clock restarts from now rather than playing the bar in a burst.
 */
export function startLive(
  ctx: BaseAudioContext,
  dest: AudioNode,
  track: Track,
  routes: Routes,
  startAt: number,
  onSources?: (sources: AudioScheduledSourceNode[]) => void,
): Driver {
  const barSec = barSeconds(track);
  let bar = 0;
  let next = startAt;
  let zero = startAt;
  const tick = (): void => {
    while (next < ctx.currentTime + LOOKAHEAD) {
      if (next < ctx.currentTime) {
        next = ctx.currentTime + 0.02;
        zero = next - bar * barSec;
      }
      onSources?.(scheduleBar(ctx, dest, track, bar, next, routes));
      bar++;
      next += barSec;
    }
  };
  tick();
  const timer = setInterval(tick, TICK_MS);
  return {
    get startAt() { return zero; },
    stop() { clearInterval(timer); },
  };
}
