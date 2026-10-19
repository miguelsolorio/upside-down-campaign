// Offline rendering and level metrics. The same sequencer and the same mix graph as the game, run on an
// OfflineAudioContext, so a number measured here is the number the player gets.
import type { AudioMetrics, TrackId } from '../core/types.ts';
import { gainToDb } from './dsp.ts';
import { buildGraph } from './engine.ts';
import type { Graph } from './engine.ts';
import { createRig } from './rig.ts';
import { scheduleOffline } from './sequencer.ts';
import { TRACKS } from './tracks/index.ts';
import { phaseBpm } from './tracks/compile.ts';
import { encodeWav } from './wav.ts';

export const RENDER_RATE = 44100;
/** Silence ahead of the music. The compressor takes about 60 ms to settle after it is created, so the music waits. */
const LEAD_IN = 0.25;

/**
 * Renders `seconds` of whatever `build` schedules, as a mono 44.1 kHz signal through the limiter. `build` gets
 * the context, the mix graph and the context time the music should start at. The context has two channels: the
 * limited signal on the left and the signal before the limiter on the right. The result is trimmed so both start
 * together at the first note: the compressor's few milliseconds of lookahead delay are taken out.
 */
export async function renderWith(
  seconds: number,
  build: (ctx: OfflineAudioContext, g: Graph, t0: number) => void,
): Promise<{ metrics: AudioMetrics; samples: Float32Array; pre: Float32Array }> {
  const n = Math.max(1, Math.round(seconds * RENDER_RATE));
  const lead = Math.round(LEAD_IN * RENDER_RATE);
  const ctx = new OfflineAudioContext(2, lead + n + Math.round(0.05 * RENDER_RATE), RENDER_RATE);
  const g = buildGraph(ctx, true);
  g.music.gain.value = 1;
  g.sfx.gain.value = 1;
  build(ctx, g, LEAD_IN);
  const buf = await ctx.startRendering();
  const rawPost = buf.getChannelData(0);
  const rawPre = buf.getChannelData(1);
  const lag = limiterDelay(rawPost, rawPre);
  const post = rawPost.slice(lead + lag, lead + lag + n);
  const pre = rawPre.slice(lead, lead + n);
  return { metrics: measure(post, pre, RENDER_RATE), samples: post, pre };
}

/**
 * Renders a track from bar one. With combat, the full combat mix. Without it, the base layer alone. `phase` plays the
 * whole render at that tempo phase. A track that plays once stops after its last bar and the rest of `seconds` is its tail.
 */
export function renderOffline(
  id: TrackId, seconds: number, opts: { combat?: boolean; phase?: number } = {},
): Promise<AudioMetrics> {
  const track = TRACKS[id];
  if (!track) return Promise.reject(new Error(`unknown track ${id}`));
  const combat = !!opts.combat && track.layers.includes('combat');
  return renderWith(seconds, (ctx, g, t0) => {
    const rig = createRig(ctx, g.music, track);
    rig.setIntensity(combat ? 1 : 0, true);
    const { routes } = rig;
    const layers = combat ? routes : { base: routes.base, sendBase: routes.sendBase };
    rig.setBpm(phaseBpm(track, opts.phase ?? 0), true);
    scheduleOffline(ctx, rig.out, track, seconds, layers, t0, opts.phase ?? 0);
  }).then((r) => r.metrics);
}

// ------------------------------------------------------------------ metrics

export function measure(post: Float32Array, pre: Float32Array, rate: number): AudioMetrics {
  let peak = 0;
  let clipped = 0;
  let sum = 0;
  for (let i = 0; i < post.length; i++) {
    const a = Math.abs(post[i]);
    if (a > peak) peak = a;
    if (a >= 0.9999) clipped++;
    sum += post[i] * post[i];
  }
  return {
    seconds: post.length / rate,
    peak,
    rmsDb: gainToDb(Math.sqrt(sum / Math.max(1, post.length))),
    limiterDb: gainReduction(post, pre, rate),
    clipped,
    wav: encodeWav(post, rate),
  };
}

/**
 * The compressor looks ahead by a few milliseconds, so the limited signal trails the raw one. Find that delay
 * by correlation around the loudest passage.
 */
export function limiterDelay(post: Float32Array, pre: Float32Array): number {
  let center = 0;
  let loudest = 0;
  for (let i = 0; i < pre.length; i++) {
    const a = Math.abs(pre[i]);
    if (a > loudest) { loudest = a; center = i; }
  }
  const from = Math.max(0, center - 8192);
  const to = Math.min(pre.length, from + 16384);
  let best = 0;
  let bestScore = -Infinity;
  for (let lag = 0; lag <= 800; lag++) {
    let score = 0;
    for (let j = from; j < to && j + lag < post.length; j++) score += pre[j] * post[j + lag];
    if (score > bestScore) { bestScore = score; best = lag; }
  }
  return best;
}

/**
 * The largest gain reduction in dB. Both signals must already be lined up. Compare the loudest sample in each
 * 20 ms window before and after the limiter. The trim after the limiter takes out the compressor's makeup gain,
 * so no limiting reads as zero.
 */
export function gainReduction(post: Float32Array, pre: Float32Array, rate: number): number {
  const win = Math.round(0.02 * rate);
  let worst = 0;
  for (let i = 0; i + win <= post.length; i += win >> 1) {
    let a = 0;
    let b = 0;
    for (let k = 0; k < win; k++) {
      a = Math.max(a, Math.abs(pre[i + k]));
      b = Math.max(b, Math.abs(post[i + k]));
    }
    if (a > 0.05) worst = Math.max(worst, gainToDb(a) - gainToDb(b));
  }
  return worst;
}
