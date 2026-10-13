// Sound effects. Every SfxId is one short synthesized sound built from pulse, triangle and noise parts.
// playSfx adds a little random pitch variation so repeats do not machine-gun.
import type { SfxId } from '../core/types.ts';
import { noise, tone } from './synth.ts';
import type { NoiseFilter } from './synth.ts';
import type { Vib, Wave } from './tracks/types.ts';

interface Tn {
  k: 't';
  w: Wave;
  f: number;
  /** Glide to this frequency over the sound. */
  f2?: number;
  at: number;
  d: number;
  v: number;
  /** A flat beep with sharp edges. Without it the tone decays like a pluck. */
  hold: boolean;
  vib?: Vib;
  arp?: number[];
  ar?: number;
}
interface Ns {
  k: 'n';
  m: 15 | 7;
  c: number;
  c2?: number;
  at: number;
  d: number;
  v: number;
  f?: NoiseFilter;
  rise?: number;
}
type Part = Tn | Ns;
interface Recipe {
  /** Random pitch variation, as a fraction either way. */
  j: number;
  parts: Part[];
}

const T = (w: Wave, f: number, d: number, v: number, o: Partial<Tn> = {}): Tn => ({ k: 't', w, f, at: 0, d, v, hold: false, ...o });
const N = (m: 15 | 7, c: number, d: number, v: number, o: Partial<Ns> = {}): Ns => ({ k: 'n', m, c, at: 0, d, v, ...o });
const bp = (freq: number, freqEnd?: number, q = 1): NoiseFilter => ({ type: 'bandpass', freq, freqEnd, q });
const lp = (freq: number, freqEnd?: number): NoiseFilter => ({ type: 'lowpass', freq, freqEnd, q: 0.7 });
const hp = (freq: number): NoiseFilter => ({ type: 'highpass', freq, q: 0.7 });
const R = (parts: Part[], j = 0.04): Recipe => ({ j, parts });

// A die bouncing: bursts that space out as it settles.
const RATTLE = [0, 0.05, 0.1, 0.17, 0.25, 0.34, 0.45].map((at, i) =>
  N(7, 6000 + i * 700, 0.03, 0.5 - i * 0.03, { at, f: bp(1800 + i * 300, undefined, 2.5) }));

export const SFX: Record<SfxId, Recipe> = {
  // combat
  swing: R([N(15, 44100, 0.12, 0.7, { f: bp(500, 3000, 1.1), rise: 0.05 })]),
  hit: R([N(15, 18000, 0.09, 0.9, { f: bp(900, undefined, 0.8) }), T('p25', 220, 0.09, 0.3, { f2: 90 })]),
  crit: R([
    N(15, 22000, 0.12, 0.9, { f: bp(1400, undefined, 0.8) }), T('p25', 330, 0.12, 0.3, { f2: 110 }),
    T('p12', 1760, 0.16, 0.2, { at: 0.02 }), T('p12', 2349, 0.12, 0.14, { at: 0.06 }),
  ]),
  kill: R([T('p50', 700, 0.22, 0.28, { f2: 90 }), N(15, 20000, 0.2, 0.8, { f: lp(1800, 300) })]),
  hurt: R([
    T('p50', 340, 0.16, 0.3, { f2: 170, vib: { rate: 30, cents: 80, delay: 0 } }),
    N(7, 9000, 0.05, 0.5, { f: hp(1500) }),
  ]),
  ko: R([
    T('tri', 392, 0.5, 0.36, { f2: 98 }), T('p25', 330, 0.45, 0.18, { f2: 82 }),
    N(15, 15000, 0.3, 0.7, { at: 0.05, f: lp(1500, 200) }),
  ]),
  // projectiles and abilities
  rock: R([T('p25', 420, 0.08, 0.2, { f2: 700 }), N(15, 20000, 0.06, 0.5, { f: bp(1800) })]),
  rockHit: R([N(15, 14000, 0.1, 0.9, { f: bp(700) }), T('tri', 130, 0.1, 0.4, { f2: 70 })]),
  dart: R([T('p12', 2600, 0.06, 0.22, { f2: 1300 })]),
  push: R([T('tri', 130, 0.25, 0.45, { f2: 50 }), N(15, 12000, 0.22, 0.8, { f: lp(600, 200), rise: 0.08 })]),
  beam: R([
    T('p50', 300, 0.38, 0.2, { f2: 900, hold: true, vib: { rate: 20, cents: 90, delay: 0 } }),
    T('p12', 600, 0.38, 0.12, { f2: 1800, hold: true }),
    N(15, 30000, 0.3, 0.5, { f: bp(2500) }),
  ]),
  flame: R([N(15, 30000, 0.32, 0.9, { f: bp(1500, 900, 0.7), rise: 0.07 }), N(7, 4000, 0.3, 0.3, { f: bp(700) })]),
  shield: R([T('p50', 660, 0.22, 0.2, { hold: true, arp: [0, 7, 12, 7], ar: 0.035 }), T('p12', 1320, 0.2, 0.1)]),
  lure: R([T('tri', 523, 0.09, 0.3, { f2: 784 }), T('tri', 784, 0.09, 0.26, { at: 0.09 })]),
  candyPop: R([N(7, 16000, 0.06, 0.8, { f: hp(1500) }), T('p25', 900, 0.08, 0.26, { f2: 300 })]),
  dash: R([N(15, 44100, 0.16, 0.8, { f: bp(3500, 700, 1.2) })]),
  swap: R([
    T('p12', 392, 0.05, 0.22, { hold: true }), T('p12', 523, 0.05, 0.22, { at: 0.05, hold: true }),
    T('p12', 784, 0.09, 0.22, { at: 0.1 }),
  ]),
  burst: R([
    N(15, 44100, 0.55, 0.8, { f: bp(400, 5000, 1), rise: 0.35 }), T('tri', 110, 0.5, 0.35, { f2: 440 }),
    T('p25', 220, 0.5, 0.2, { f2: 880 }), T('p50', 880, 0.2, 0.2, { at: 0.45 }),
  ]),
  // pickups and status
  pickup: R([T('p25', 784, 0.06, 0.26, { hold: true }), T('p25', 1175, 0.12, 0.26, { at: 0.06 })]),
  heal: R([
    T('tri', 523, 0.07, 0.28, { hold: true }), T('tri', 659, 0.07, 0.28, { at: 0.07, hold: true }),
    T('tri', 784, 0.07, 0.28, { at: 0.14, hold: true }), T('tri', 1047, 0.2, 0.28, { at: 0.21 }),
  ]),
  noMp: R([T('p50', 110, 0.07, 0.28, { hold: true }), T('p50', 98, 0.09, 0.28, { at: 0.09, hold: true })]),
  nosebleed: R([
    T('tri', 70, 0.35, 0.3), T('p12', 1400, 0.05, 0.2, { at: 0.12, f2: 600 }), T('p12', 1200, 0.05, 0.16, { at: 0.28, f2: 500 }),
  ]),
  // menus: a steady pitch, so the interface sounds the same every time
  select: R([T('p12', 988, 0.03, 0.2, { hold: true })], 0.01),
  confirm: R([T('p25', 660, 0.05, 0.26, { hold: true }), T('p25', 990, 0.09, 0.26, { at: 0.05 })], 0.01),
  cancel: R([T('p50', 440, 0.05, 0.26, { hold: true }), T('p50', 294, 0.09, 0.26, { at: 0.05 })], 0.01),
  pause: R([T('p25', 784, 0.06, 0.24, { hold: true }), T('p25', 523, 0.08, 0.24, { at: 0.07 })], 0.01),
  dialogOpen: R([T('tri', 330, 0.07, 0.3, { f2: 494 }), T('p12', 988, 0.03, 0.1, { at: 0.05 })], 0.01),
  // the world
  gateOpen: R([
    T('tri', 90, 0.1, 0.4, { f2: 50 }),
    T('p25', 90, 0.45, 0.28, { at: 0.08, f2: 130, hold: true, vib: { rate: 17, cents: 150, delay: 0 } }),
    N(15, 9000, 0.4, 0.5, { at: 0.08, f: bp(300, 250) }),
  ]),
  targetHit: R([T('tri', 1319, 0.5, 0.32), T('p12', 3640, 0.25, 0.1)], 0.02),
  logPush: R([
    N(15, 8000, 0.38, 0.9, { f: lp(400, 300), rise: 0.05 }),
    T('tri', 55, 0.38, 0.35, { hold: true, vib: { rate: 9, cents: 120, delay: 0 } }),
  ]),
  lights: R([
    T('p50', 880, 0.03, 0.18, { hold: true }), T('p50', 880, 0.03, 0.18, { at: 0.06, hold: true }),
    T('p50', 880, 0.03, 0.18, { at: 0.12, hold: true }), T('p50', 880, 0.12, 0.18, { at: 0.18, f2: 440 }),
  ], 0.02),
  flicker: R([
    T('p50', 120, 0.04, 0.26, { hold: true }), T('p50', 120, 0.03, 0.26, { at: 0.08, hold: true }),
    T('p50', 120, 0.05, 0.26, { at: 0.15, hold: true }),
    N(7, 12000, 0.03, 0.4, { at: 0.02, f: hp(2500) }), N(7, 12000, 0.03, 0.4, { at: 0.11, f: hp(2500) }),
  ]),
  growl: R([
    T('p25', 70, 0.65, 0.38, { f2: 45, hold: true, vib: { rate: 22, cents: 500, delay: 0 } }),
    N(7, 9000, 0.6, 0.6, { f: lp(700), rise: 0.15 }), T('p50', 140, 0.6, 0.12, { f2: 80 }),
  ]),
  // the d20
  roll: R(RATTLE),
  rollLand: R([T('tri', 880, 0.12, 0.32, { f2: 1175 }), N(7, 14000, 0.02, 0.5, { f: hp(2000) })]),
  natTwenty: R([
    T('p12', 1047, 0.06, 0.2, { hold: true }), T('p12', 1319, 0.06, 0.2, { at: 0.06, hold: true }),
    T('p12', 1568, 0.06, 0.2, { at: 0.12, hold: true }), T('p12', 2093, 0.35, 0.22, { at: 0.18 }),
    T('p25', 523, 0.5, 0.2, { at: 0.18 }), T('p12', 3136, 0.3, 0.12, { at: 0.3 }),
  ], 0),
  alert: R([T('p50', 880, 0.05, 0.3, { hold: true }), T('p50', 1320, 0.09, 0.3, { at: 0.05, hold: true })], 0.01),
  step: R([N(7, 5000, 0.025, 0.4, { f: bp(900, undefined, 1.5) })], 0.08),
};

/**
 * Gain per effect, measured with an offline render so every effect peaks where it should: impacts near 0.5,
 * interface sounds near 0.3, footsteps barely there. The noise parts are the hot ones.
 */
const LEVEL: Record<SfxId, number> = {
  swing: 0.68, hit: 0.55, crit: 0.77, kill: 0.5, hurt: 0.5, ko: 0.66,
  rock: 0.82, rockHit: 0.52, dart: 1.1, push: 0.88, beam: 0.57, flame: 0.5, shield: 0.72, lure: 1, candyPop: 0.25,
  dash: 0.45, swap: 0.94, burst: 0.67, pickup: 0.96, heal: 0.81, noMp: 0.65, nosebleed: 1,
  select: 1.1, confirm: 0.8, cancel: 0.7, pause: 1.17, dialogOpen: 1,
  gateOpen: 1, targetHit: 1, logPush: 0.41, lights: 1.22, flicker: 0.3, growl: 0.44,
  roll: 0.89, rollLand: 0.47, natTwenty: 0.95, alert: 0.47, step: 0.8,
};

/** Plays one effect at context time t. `mul` scales every pitch, so 1.05 is about a semitone sharp. */
export function playSfx(ctx: BaseAudioContext, dest: AudioNode, id: SfxId, t: number, mul = 1): void {
  const r = SFX[id];
  const level = LEVEL[id];
  r.parts.forEach((p, i) => {
    const at = t + p.at;
    if (p.k === 't') {
      tone(ctx, dest, {
        wave: p.w,
        freq: p.f * mul,
        to: p.f2 ? p.f2 * mul : undefined,
        t: at,
        gate: p.d,
        vol: p.v * level,
        env: p.hold ? { a: 0.002, d: 0, s: 1, r: 0.012 } : { a: 0.002, d: p.d, s: 0, r: 0.01, exp: true },
        vib: p.vib,
        arp: p.arp,
        arpRate: p.ar,
      });
    } else {
      noise(ctx, dest, {
        mode: p.m,
        clock: p.c * mul,
        clockEnd: p.c2 ? p.c2 * mul : undefined,
        t: at,
        dur: p.d,
        vol: p.v * level,
        filter: p.f ? { ...p.f, freq: p.f.freq * mul, freqEnd: p.f.freqEnd ? p.f.freqEnd * mul : undefined } : undefined,
        rise: p.rise,
        seed: i * 104729 + Math.floor(at * 1000),
      });
    }
  });
}
