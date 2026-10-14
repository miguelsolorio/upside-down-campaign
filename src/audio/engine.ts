// The audio engine: a lazy AudioContext and the mix graph.
//   music voices -> music volume -> duck -+
//   effects, jingles, blips -> sfx volume -+-> master -> compressor used as a limiter -> trim -> speakers
// buildGraph works on any context, so an offline render goes through exactly the same chain as the game.
import { dbToGain } from './dsp.ts';

/** A hard knee at 20:1 behaves as a limiter. The threshold leaves music a little headroom under 0.9. */
export const LIMITER = { threshold: -2, knee: 0, ratio: 20, attack: 0.001, release: 0.12 } as const;

/**
 * Browsers add makeup gain after a compressor: 0.6 of what the static curve takes off a full-scale signal.
 * With a hard knee that is easy to predict, so the trim takes it back out and the limiter is unity gain
 * below its threshold. (Checked against Chrome: a quiet sine comes out at the level it went in.)
 */
export function limiterMakeupDb(): number {
  return 0.6 * -LIMITER.threshold * (1 - 1 / LIMITER.ratio);
}

export interface Graph {
  ctx: BaseAudioContext;
  /** Music voices connect here. Its gain is the music volume. */
  music: GainNode;
  /** After the music volume. Dips when a jingle or stinger plays. */
  duck: GainNode;
  /** Effects, jingles, stingers and blips connect here. Its gain is the effects volume. */
  sfx: GainNode;
  master: GainNode;
  limiter: DynamicsCompressorNode;
}

/**
 * With stereoTap the destination gets two channels: the limited signal on the left and the signal before the
 * limiter on the right. An offline render uses that to measure how much gain the limiter took off.
 */
export function buildGraph(ctx: BaseAudioContext, stereoTap = false): Graph {
  const music = ctx.createGain();
  const duck = ctx.createGain();
  const sfx = ctx.createGain();
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = LIMITER.threshold;
  limiter.knee.value = LIMITER.knee;
  limiter.ratio.value = LIMITER.ratio;
  limiter.attack.value = LIMITER.attack;
  limiter.release.value = LIMITER.release;
  const trim = ctx.createGain();
  trim.gain.value = dbToGain(-limiterMakeupDb());
  music.connect(duck);
  duck.connect(master);
  sfx.connect(master);
  master.connect(limiter);
  limiter.connect(trim);
  if (stereoTap) {
    const merger = ctx.createChannelMerger(2);
    trim.connect(merger, 0, 0);
    master.connect(merger, 0, 1);
    merger.connect(ctx.destination);
  } else {
    trim.connect(ctx.destination);
  }
  return { ctx, music, duck, sfx, master, limiter };
}

// ------------------------------------------------------------------ the live context

interface Live { ctx: AudioContext; g: Graph }

let live: Live | null = null;
const vol = { music: 0.7, sfx: 0.8, muted: false };
/** True while the page is not focused. Silent like a mute, but separate from the M key. */
let away = false;

/** Slider position to gain. A mild curve: the middle of the slider is about 8 dB down. */
const taper = (v: number): number => Math.pow(Math.max(0, Math.min(1, v)), 1.4);
/** Effects are balanced at the default effects volume, so that setting plays them at their designed level. */
const SFX_DEFAULT = 0.8;

export function liveGraph(): Graph | null {
  return live ? live.g : null;
}

/** True once the context exists and the browser has let it run. The title asks a controller player for a click until then. */
export function isRunning(): boolean {
  return live !== null && live.ctx.state === 'running';
}

/** Creates the context on the first call (it has to happen inside a key or pointer event) and resumes it. */
export function unlock(): Graph | null {
  if (!live) {
    const w = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor({ latencyHint: 'interactive' });
      live = { ctx, g: buildGraph(ctx) };
      applyLevels(true);
    } catch {
      return null;
    }
  }
  if (live.ctx.state !== 'running') live.ctx.resume().catch(() => { /* still blocked: the next key tries again */ });
  return live.g;
}

function applyLevels(snap: boolean): void {
  if (!live) return;
  const { ctx, g } = live;
  const now = ctx.currentTime;
  const set = (p: AudioParam, v: number): void => {
    if (snap) p.setValueAtTime(v, now);
    else p.setTargetAtTime(v, now, 0.03);
  };
  set(g.music.gain, taper(vol.music));
  set(g.sfx.gain, taper(vol.sfx) / taper(SFX_DEFAULT));
  set(g.master.gain, vol.muted || away ? 0 : 1);
}

export function setVolumes(music: number, sfx: number): void {
  vol.music = music;
  vol.sfx = sfx;
  applyLevels(false);
}

export function setMuted(on: boolean): void {
  vol.muted = on;
  applyLevels(false);
}

export function isMuted(): boolean {
  return vol.muted;
}

/** The page lost or regained focus. Going away is silent like a mute, and it never touches the player's own mute. */
export function setAway(on: boolean): void {
  if (away === on) return;
  away = on;
  applyLevels(false);
}

export function isAway(): boolean {
  return away;
}

// The duck stage as a small model, so a new duck starts from the true current level.
// Reading AudioParam.value would lag the audio thread by a render quantum.
const DUCK_IN = 0.04;
const DUCK_OUT = 0.35;
let duckPlan = { start: 0, from: 1, depth: 1, hold: 0 };

function duckLevel(t: number): number {
  const { start, from, depth, hold } = duckPlan;
  if (t < start) return from;
  if (t < start + DUCK_IN) return from + (depth - from) * ((t - start) / DUCK_IN);
  if (t < hold) return depth;
  if (t < hold + DUCK_OUT) return depth + (1 - depth) * ((t - hold) / DUCK_OUT);
  return 1;
}

/** Dips the music by `db` for `seconds`, then brings it back over about a third of a second. */
export function duckMusic(g: Graph, seconds: number, db = 6): void {
  const now = g.ctx.currentTime;
  const from = duckLevel(now);
  const depth = dbToGain(-db);
  const hold = Math.max(now + DUCK_IN + seconds, duckPlan.hold);
  duckPlan = { start: now, from, depth, hold };
  const p = g.duck.gain;
  p.cancelScheduledValues(now);
  p.setValueAtTime(from, now);
  p.linearRampToValueAtTime(depth, now + DUCK_IN);
  p.setValueAtTime(depth, hold);
  p.linearRampToValueAtTime(1, hold + DUCK_OUT);
}
