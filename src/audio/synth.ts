// NES-style voices on the Web Audio API: pulse at 12.5, 25 and 50 percent duty through PeriodicWave, the
// stepped triangle, and the noise channel's two shift registers as looping buffers.
// Everything takes a BaseAudioContext, so it runs on AudioContext and OfflineAudioContext alike.
// Nothing here touches the DOM, and nothing creates an audio object at import time.
import type { Drum, Env, Vib, Wave } from './tracks/types.ts';
import { DRUM_SECONDS } from './tracks/theory.ts';
import { envLevel, lfsrBits, noiseOffset, pulseCoefs, triCoefs } from './dsp.ts';
import type { Coefs } from './dsp.ts';

const HARMONICS = 512;
/** The noise buffers are one shift-register step per sample at this rate. playbackRate sets the clock. */
export const NOISE_RATE = 44100;

type Waves = Record<Wave, PeriodicWave>;
const waveCache = new WeakMap<BaseAudioContext, Waves>();

export function waves(ctx: BaseAudioContext): Waves {
  let w = waveCache.get(ctx);
  if (!w) {
    const make = (c: Coefs): PeriodicWave => ctx.createPeriodicWave(c.real, c.imag);
    w = {
      p12: make(pulseCoefs(0.125, HARMONICS)),
      p25: make(pulseCoefs(0.25, HARMONICS)),
      p50: make(pulseCoefs(0.5, HARMONICS)),
      tri: make(triCoefs(HARMONICS)),
    };
    waveCache.set(ctx, w);
  }
  return w;
}

type NoiseBuffers = Record<15 | 7, AudioBuffer>;
const noiseCache = new WeakMap<BaseAudioContext, NoiseBuffers>();

export function noiseBuffers(ctx: BaseAudioContext): NoiseBuffers {
  let n = noiseCache.get(ctx);
  if (!n) {
    const make = (width: 15 | 7): AudioBuffer => {
      const bits = lfsrBits(width);
      const buf = ctx.createBuffer(1, bits.length, NOISE_RATE);
      buf.copyToChannel(bits, 0);
      return buf;
    };
    n = { 15: make(15), 7: make(7) };
    noiseCache.set(ctx, n);
  }
  return n;
}

// ------------------------------------------------------------------ envelope

/**
 * Schedules a gain envelope on `p` and returns the time the voice is silent. The key goes down at t for
 * `gate` seconds, then the release runs for `rel`. If the gate ends mid-attack or mid-decay the release
 * starts from wherever the envelope had got to.
 */
export function shapeEnv(p: AudioParam, t: number, peak: number, e: Env, gate: number, rel: number): number {
  const aEnd = Math.min(e.a, gate);
  p.setValueAtTime(0, t);
  if (e.a > 0) p.linearRampToValueAtTime(peak * envLevel(e, aEnd), t + aEnd);
  else p.setValueAtTime(peak, t);
  if (gate > e.a && e.d > 0) {
    const dEnd = Math.min(e.a + e.d, gate);
    const v = peak * envLevel(e, dEnd);
    if (e.exp) p.exponentialRampToValueAtTime(Math.max(v, peak * 1e-3), t + dEnd);
    else p.linearRampToValueAtTime(v, t + dEnd);
  }
  p.setValueAtTime(peak * envLevel(e, gate), t + gate);
  p.linearRampToValueAtTime(0, t + gate + rel);
  return t + gate + rel;
}

// ------------------------------------------------------------------ tone voice

export interface ToneOpts {
  wave: Wave;
  /** Hz when the key goes down. */
  freq: number;
  t: number;
  /** Seconds the key stays down. */
  gate: number;
  vol: number;
  env: Env;
  /** Release time, if shorter than env.r because another note is about to start. */
  release?: number;
  /** Glide to this frequency over the gate. */
  to?: number;
  vib?: Vib;
  /** Where to feed the echo, and how much. */
  send?: AudioNode;
  sendAmt?: number;
  /** Fast chip arpeggio: semitone offsets, one every arpRate seconds. */
  arp?: readonly number[];
  arpRate?: number;
}

/** One note. Returns the nodes it started, so a caller can stop them early. */
export function tone(ctx: BaseAudioContext, dest: AudioNode, o: ToneOpts): AudioScheduledSourceNode[] {
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(waves(ctx)[o.wave]);
  osc.frequency.setValueAtTime(o.freq, o.t);
  if (o.arp && o.arp.length && o.arpRate) {
    for (let k = 0; k * o.arpRate < o.gate; k++) {
      osc.frequency.setValueAtTime(o.freq * Math.pow(2, o.arp[k % o.arp.length] / 12), o.t + k * o.arpRate);
    }
  } else if (o.to && o.to !== o.freq) {
    osc.frequency.exponentialRampToValueAtTime(o.to, o.t + Math.max(o.gate, 0.01));
  }
  const gain = ctx.createGain();
  // Silent until the envelope starts. A new gain node sits at 1, and a source that begins a sample early would click.
  gain.gain.value = 0;
  const end = shapeEnv(gain.gain, o.t, o.vol, o.env, o.gate, o.release ?? o.env.r);
  osc.connect(gain);
  gain.connect(dest);
  const nodes: AudioNode[] = [osc, gain];
  const started: AudioScheduledSourceNode[] = [osc];
  if (o.send && o.sendAmt) {
    const s = ctx.createGain();
    s.gain.value = o.sendAmt;
    gain.connect(s);
    s.connect(o.send);
    nodes.push(s);
  }
  if (o.vib) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.vib.rate;
    const depth = ctx.createGain();
    depth.gain.value = 0;
    depth.gain.setValueAtTime(0, o.t);
    depth.gain.setValueAtTime(0, o.t + o.vib.delay);
    depth.gain.linearRampToValueAtTime(o.vib.cents, o.t + o.vib.delay + 0.25);
    lfo.connect(depth);
    depth.connect(osc.detune);
    lfo.start(o.t);
    lfo.stop(end + 0.02);
    nodes.push(lfo, depth);
    started.push(lfo);
  }
  osc.start(o.t);
  osc.stop(end + 0.02);
  osc.onended = () => { for (const n of nodes) n.disconnect(); };
  return started;
}

// ------------------------------------------------------------------ noise voice

export interface NoiseFilter { type: 'lowpass' | 'highpass' | 'bandpass'; freq: number; freqEnd?: number; q?: number }

export interface NoiseOpts {
  /** 15 is white noise. 7 is the short register: pitched and metallic. */
  mode: 15 | 7;
  t: number;
  dur: number;
  vol: number;
  /** Shift register clock in Hz. It sets both the pitch of mode 7 and the brightness of mode 15. */
  clock: number;
  clockEnd?: number;
  filter?: NoiseFilter;
  /** Seconds of swell before the fall. Without it the hit starts at full level and decays. */
  rise?: number;
  /** Picks the start point in the loop, so a render sounds the same every time. */
  seed?: number;
}

export function noise(ctx: BaseAudioContext, dest: AudioNode, o: NoiseOpts): AudioScheduledSourceNode[] {
  const buf = noiseBuffers(ctx)[o.mode];
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.playbackRate.setValueAtTime(o.clock / NOISE_RATE, o.t);
  if (o.clockEnd && o.clockEnd !== o.clock) src.playbackRate.exponentialRampToValueAtTime(o.clockEnd / NOISE_RATE, o.t + o.dur);
  const nodes: AudioNode[] = [src];
  let last: AudioNode = src;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter.type;
    f.Q.value = o.filter.q ?? 1;
    f.frequency.setValueAtTime(o.filter.freq, o.t);
    if (o.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(o.filter.freqEnd, o.t + o.dur);
    last.connect(f);
    last = f;
    nodes.push(f);
  }
  const gain = ctx.createGain();
  const p = gain.gain;
  p.value = 0;
  if (o.rise && o.rise > 0) {
    const rise = Math.min(o.rise, o.dur * 0.9);
    p.setValueAtTime(o.vol * 1e-3, o.t);
    p.exponentialRampToValueAtTime(o.vol, o.t + rise);
    p.linearRampToValueAtTime(0, o.t + o.dur);
  } else {
    p.setValueAtTime(0, o.t);
    p.linearRampToValueAtTime(o.vol, o.t + 0.001);
    p.exponentialRampToValueAtTime(o.vol * 1e-3, o.t + o.dur - 0.002);
    p.linearRampToValueAtTime(0, o.t + o.dur);
  }
  last.connect(gain);
  gain.connect(dest);
  nodes.push(gain);
  src.start(o.t, noiseOffset(o.seed ?? 0, buf.length) / NOISE_RATE);
  src.stop(o.t + o.dur + 0.02);
  src.onended = () => { for (const n of nodes) n.disconnect(); };
  return [src];
}

// ------------------------------------------------------------------ drums

type DrumDef = Omit<NoiseOpts, 't' | 'dur' | 'seed'>;

/** The noise channel's kit. Levels are peak gain at full velocity. */
export const DRUM_DEFS: Record<Drum, DrumDef> = {
  kick: { mode: 7, clock: 14000, clockEnd: 5200, vol: 0.62, filter: { type: 'lowpass', freq: 320, freqEnd: 120, q: 0.8 } },
  snare: { mode: 15, clock: 30000, vol: 0.3, filter: { type: 'bandpass', freq: 1900, q: 0.6 } },
  hat: { mode: 15, clock: 44100, vol: 0.08, filter: { type: 'highpass', freq: 7200, q: 0.7 } },
  ohat: { mode: 15, clock: 44100, vol: 0.075, filter: { type: 'highpass', freq: 6500, q: 0.7 } },
  tick: { mode: 7, clock: 7000, vol: 0.26, filter: { type: 'bandpass', freq: 3300, q: 3 } },
  tock: { mode: 7, clock: 4300, vol: 0.32, filter: { type: 'bandpass', freq: 1700, q: 3 } },
  swell: { mode: 15, clock: 11000, vol: 0.18, rise: 1.5, filter: { type: 'lowpass', freq: 1800, freqEnd: 900, q: 0.5 } },
  crack: { mode: 7, clock: 20000, vol: 0.1, filter: { type: 'highpass', freq: 3000, q: 0.7 } },
};

/** One hit of the noise channel's kit. It rings for DRUM_SECONDS, which the compiler leaves room for. */
export function drum(
  ctx: BaseAudioContext, dest: AudioNode, kind: Drum, t: number, vel: number, seed: number,
): AudioScheduledSourceNode[] {
  const def = DRUM_DEFS[kind];
  return noise(ctx, dest, { ...def, vol: def.vol * vel, t, dur: DRUM_SECONDS[kind], seed });
}
