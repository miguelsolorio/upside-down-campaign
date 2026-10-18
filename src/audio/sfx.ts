// Sound effects. Every SfxId is one short synthesized sound built from pulse, triangle and noise parts.
// playSfx adds a little random pitch variation so repeats do not machine-gun. The part types and builders are
// in sfx_kit.ts. The Level 3 and 4 effects (roar to sizzle) and their levels are in sfx_levels34.ts.
import type { SfxId } from '../core/types.ts';
import { noise, tone } from './synth.ts';
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';
import { LEVELS34, SFX34 } from './sfx_levels34.ts';
import type { Sfx34 } from './sfx_levels34.ts';
import { LEVELS56, SFX56 } from './sfx_levels56.ts';
import type { Sfx56 } from './sfx_levels56.ts';
import { LEVELS78, SFX78 } from './sfx_levels78.ts';
import type { Sfx78 } from './sfx_levels78.ts';
import { LEVELS9, SFX9 } from './sfx_level9.ts';
import type { Sfx9 } from './sfx_level9.ts';
import { LEVELS1011, SFX1011 } from './sfx_level1011.ts';
import type { Sfx1011 } from './sfx_level1011.ts';
import { LEVELS1415, SFX1415 } from './sfx_level1415.ts';
import type { Sfx1415 } from './sfx_level1415.ts';
import { LEVELS_SOLO, SFX_SOLO } from './sfx_solo.ts';
import type { SfxSolo } from './sfx_solo.ts';

// A die bouncing: bursts that space out as it settles.
const RATTLE = [0, 0.05, 0.1, 0.17, 0.25, 0.34, 0.45].map((at, i) =>
  N(7, 6000 + i * 700, 0.03, 0.5 - i * 0.03, { at, f: bp(1800 + i * 300, undefined, 2.5) }));

// Pulses of 0.3 s: E5, B flat 4, E5, B flat 4. Each sags a little, so it wails.
const KLAXON = [0, 1, 2, 3].flatMap((i) => {
  const f = i % 2 === 0 ? 659 : 466;
  const held = i < 3;
  const d = held ? 0.27 : 0.3;
  return [
    T('p50', f, d, 0.26, { at: i * 0.3, hold: held, f2: f * 0.97 }),
    T('tri', f / 2, d, 0.24, { at: i * 0.3, hold: held, f2: (f / 2) * 0.97 }),
  ];
});

const BASE_SFX = {
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
  // The lockdown siren: two tones a tritone apart, high then low, four pulses over about 1.2 s. A pulse wave
  // carries the pitch and a triangle an octave down gives it body, so it reads without biting. The last
  // tone is not held, so the siren dies away instead of cutting off.
  klaxon: R(KLAXON, 0),
  // The Lab's hazards and guards. Each is short and sits in its own part of the spectrum, so a busy fight keeps them apart.
  // zap: a floor panel firing. A hard crack, a raspy noise buzz that falls from about 170 Hz to 45 Hz, a thin
  // zip sliding down, and four spark pops after it.
  zap: R([
    N(15, 30000, 0.05, 0.9, { f: bp(2400, 1200, 0.7) }),
    N(7, 22000, 0.24, 0.8, { c2: 6000, f: lp(2200), rise: 0.015 }),
    T('p25', 2200, 0.2, 0.2, { f2: 160 }),
    N(7, 14000, 0.02, 0.5, { at: 0.05, f: bp(2800, undefined, 1.2) }), N(7, 17000, 0.02, 0.45, { at: 0.1, f: bp(2800, undefined, 1.2) }),
    N(7, 12000, 0.02, 0.4, { at: 0.14, f: bp(2800, undefined, 1.2) }), N(7, 15000, 0.02, 0.35, { at: 0.19, f: bp(2800, undefined, 1.2) }),
  ], 0.05),
  // steam: a vent venting. Two layers of soft noise swell and fade together, one airy, one a little hollow.
  // Almost nothing above 6 kHz, so it hisses without biting.
  steam: R([
    N(15, 30000, 0.5, 0.8, { f: bp(2600, 1500, 0.5), rise: 0.2 }),
    N(15, 12000, 0.5, 0.45, { f: lp(1500, 800), rise: 0.16 }),
  ], 0.03),
  // spotted: a camera sees the party. Two thin, cold pings a tritone apart, rising, with a faint echo of the
  // second. Thin pulse and no low end, so it cannot be mistaken for alert (a held square fifth, warm and short).
  spotted: R([
    T('p12', 1175, 0.2, 0.3), T('tri', 2349, 0.14, 0.12), N(7, 20000, 0.01, 0.2, { f: hp(5000) }),
    T('p12', 1661, 0.3, 0.3, { at: 0.1 }), T('tri', 3322, 0.18, 0.12, { at: 0.1 }),
    N(7, 20000, 0.01, 0.2, { at: 0.1, f: hp(5000) }), T('p12', 1661, 0.12, 0.08, { at: 0.2 }),
  ], 0.01),
  // block: a riot shield stops a hit. A dull clang from two unrelated metal partials and a narrow ring of noise,
  // on top of a low thud.
  block: R([
    T('tri', 160, 0.1, 0.6, { f2: 60 }),
    N(15, 20000, 0.04, 0.6, { f: bp(1500, undefined, 0.8) }),
    N(7, 11000, 0.15, 0.7, { f: bp(1100, 700, 5), rise: 0.004 }),
    T('p25', 470, 0.18, 0.2, { f2: 450 }), T('p25', 760, 0.14, 0.16),
  ], 0.04),
  // bash: a guard swings. A low whoosh swells for 0.15 s, then a thump lands at the end of it. Lower and
  // heavier than swing, which is a quick high swish.
  bash: R([
    N(15, 30000, 0.18, 0.9, { f: bp(220, 1100, 0.8), rise: 0.12 }),
    T('tri', 200, 0.16, 0.22, { f2: 120 }),
    N(15, 10000, 0.1, 0.9, { at: 0.16, f: lp(900, 200) }), T('tri', 110, 0.1, 0.5, { at: 0.16, f2: 45 }),
  ], 0.04),
  // slam: the Warden hits the floor. A crack, then a boom that drops from 120 Hz to 32 Hz, a rumble of noise
  // that dies away over 0.6 s and a slow grumble underneath. The loudest of the six.
  slam: R([
    N(15, 30000, 0.1, 0.9, { f: bp(1200, 400, 0.7) }),
    T('tri', 120, 0.5, 0.6, { f2: 32 }), T('p25', 70, 0.35, 0.3, { f2: 35 }),
    N(15, 7000, 0.6, 0.9, { f: lp(450, 80), rise: 0.04 }),
    N(7, 2600, 0.55, 0.5, { at: 0.05, f: lp(260, 100) }),
  ], 0.03),
  // the d20
  roll: R(RATTLE),
  rollLand: R([T('tri', 880, 0.12, 0.32, { f2: 1175 }), N(7, 14000, 0.02, 0.5, { f: hp(2000) })]),
  natTwenty: R([
    T('p12', 1047, 0.06, 0.2, { hold: true }), T('p12', 1319, 0.06, 0.2, { at: 0.06, hold: true }),
    T('p12', 1568, 0.06, 0.2, { at: 0.12, hold: true }), T('p12', 2093, 0.35, 0.22, { at: 0.18 }),
    T('p25', 523, 0.5, 0.2, { at: 0.18 }), T('p12', 3136, 0.3, 0.12, { at: 0.3 }),
  ], 0),
  // a level-up while the game runs on: short and soft, so it never talks over a fight
  levelUp: R([
    T('tri', 523, 0.09, 0.3, { hold: true }), T('tri', 659, 0.09, 0.3, { at: 0.07, hold: true }),
    T('tri', 784, 0.09, 0.3, { at: 0.14, hold: true }), T('tri', 1047, 0.34, 0.3, { at: 0.21 }),
    T('p12', 2093, 0.2, 0.08, { at: 0.21 }),
  ], 0.02),
  alert: R([T('p50', 880, 0.05, 0.3, { hold: true }), T('p50', 1320, 0.09, 0.3, { at: 0.05, hold: true })], 0.01),
  step: R([N(7, 5000, 0.025, 0.4, { f: bp(900, undefined, 1.5) })], 0.08),
} satisfies Record<Exclude<SfxId, Sfx34 | Sfx56 | Sfx78 | Sfx9 | Sfx1011 | Sfx1415 | SfxSolo>, Recipe>;

export const SFX: Record<SfxId, Recipe> = { ...BASE_SFX, ...SFX34, ...SFX56, ...SFX78, ...SFX9, ...SFX1011, ...SFX1415, ...SFX_SOLO };

/**
 * Gain per effect, measured with an offline render so every effect peaks where it should: impacts near 0.5,
 * interface sounds near 0.3, footsteps barely there. The noise parts are the hot ones.
 */
const LEVEL: Record<SfxId, number> = {
  swing: 0.68, hit: 0.55, crit: 0.77, kill: 0.5, hurt: 0.5, ko: 0.66,
  rock: 0.82, rockHit: 0.52, dart: 1.1, push: 0.88, beam: 0.57, flame: 0.5, shield: 0.72, lure: 1, candyPop: 0.25,
  dash: 0.45, swap: 0.94, burst: 0.67, pickup: 0.96, heal: 0.81, noMp: 0.65, nosebleed: 1,
  select: 1.1, confirm: 0.8, cancel: 0.7, pause: 1.17, dialogOpen: 1,
  gateOpen: 1, targetHit: 1, logPush: 0.41, lights: 1.22, flicker: 0.3, growl: 0.44, klaxon: 0.7,
  zap: 0.43, steam: 0.31, spotted: 0.64, block: 0.55, bash: 0.56, slam: 0.535,
  roll: 0.89, rollLand: 0.47, natTwenty: 0.95, levelUp: 0.9, alert: 0.47, step: 0.8,
  ...LEVELS34,
  ...LEVELS56,
  ...LEVELS78,
  ...LEVELS9,
  ...LEVELS1011,
  ...LEVELS1415,
  ...LEVELS_SOLO,
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
