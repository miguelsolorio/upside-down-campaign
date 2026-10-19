// Plays jingles and stingers from their data, and speech blips. Each voice cleans up after itself.
import type { Speaker } from '../core/types.ts';
import { midiToHz } from './dsp.ts';
import { noise, tone } from './synth.ts';
import type { Cue } from './tracks/jingles.ts';
import type { Env, Vib, Wave } from './tracks/types.ts';

const HELD: Env = { a: 0.004, d: 0.05, s: 0.85, r: 0.06 };
const VIB: Vib = { rate: 5.5, cents: 24, delay: 0.12 };
/** Billy's growl: a wobble fast enough to roughen the tone, not to be heard as a pitch. Its depth fades in over the blip. */
const GROWL: Vib = { rate: 38, cents: 160, delay: 0 };
/** Eddie's nervous warble: a vibrato slow enough to hear as a wobble in pitch. Its depth fades in over a quarter of a second, so an 80 ms blip reaches a third of it, about a semitone, and the setting has to be wide to be heard. */
const WARBLE: Vib = { rate: 13, cents: 300, delay: 0 };
/** Vecna's crackle: three short pops of white noise, at these fractions of the blip, through a band round 1.8 kHz. */
const CRACKLE: Crackle = { at: [0.1, 0.42, 0.72], dur: 0.014, freq: 1800, vol: 0.5 };

/** Plays a cue starting at context time t. */
export function playCue(ctx: BaseAudioContext, dest: AudioNode, cue: Cue, t: number): void {
  for (const n of cue.notes) {
    const ring = !!n.ring;
    tone(ctx, dest, {
      wave: n.w,
      freq: midiToHz(n.midi),
      to: n.to !== undefined ? midiToHz(n.to) : undefined,
      t: t + n.at,
      gate: ring ? n.dur : Math.max(0.02, n.dur * 0.94),
      vol: n.vol * cue.gain,
      env: ring ? { a: 0.002, d: n.dur, s: 0, r: 0.05, exp: true } : HELD,
      vib: n.vib ? VIB : undefined,
    });
  }
  cue.hits.forEach((h, i) => {
    noise(ctx, dest, {
      mode: h.mode,
      t: t + h.at,
      dur: h.dur,
      vol: h.vol * cue.gain,
      clock: h.clock,
      filter: { type: h.filter, freq: h.freq, freqEnd: h.freqEnd, q: h.q },
      rise: h.rise,
      seed: i * 7919,
    });
  });
}

// ------------------------------------------------------------------ speech blips

interface BlipDef {
  wave: Wave;
  /** MIDI note the voice centers on. */
  midi: number;
  /** Each blip lands a random whole number of semitones within this many of the center. */
  spread: number;
  dur: number;
  vol: number;
  attack: number;
  /** Slide this many semitones over the blip. Steve's sags and Hopper's drops, which is how they sound unimpressed. */
  bend?: number;
  /** A fast, wide vibrato that roughens the tone into a growl. The depth fades in, so a short blip gets a part of it. */
  rough?: Vib;
  /** A musical vibrato that rides the pitch: Eddie's nerves. Billy's `rough` is the same oscillator, faster and wider, so it growls. */
  vibrato?: Vib;
  /** Pops of noise across the blip, dry like a cinder going in a fire: Vecna's. The pitch itself stays clean. */
  crackle?: Crackle;
}

interface Crackle {
  /** Where each pop starts, as a fraction of the blip. */
  at: readonly number[];
  dur: number;
  /** Centre of the band the noise goes through. */
  freq: number;
  vol: number;
}

/** One voice per speaker, from the table in the design doc. The narrator is quiet on purpose. */
export const BLIPS: Record<Speaker, BlipDef> = {
  mike: { wave: 'p50', midi: 67, spread: 3, dur: 0.05, vol: 0.2, attack: 0.003 },
  dustin: { wave: 'p12', midi: 74, spread: 4, dur: 0.035, vol: 0.27, attack: 0.002 },
  lucas: { wave: 'p50', midi: 55, spread: 3, dur: 0.055, vol: 0.2, attack: 0.003 },
  eleven: { wave: 'tri', midi: 64, spread: 2, dur: 0.11, vol: 0.2, attack: 0.025 },
  will: { wave: 'tri', midi: 69, spread: 2, dur: 0.075, vol: 0.2, attack: 0.012 },
  joyce: { wave: 'tri', midi: 60, spread: 3, dur: 0.07, vol: 0.22, attack: 0.008 },
  max: { wave: 'p25', midi: 72, spread: 3, dur: 0.04, vol: 0.2, attack: 0.002 },
  // Steve is the mid square: between Lucas's low one and Mike's, a little slower, and every blip droops a semitone.
  // Hopper is the low saw, the only sawtooth in the game, slow and gruff, and his sags too. A saw is quieter than a
  // square at the same peak, so it has a little more volume.
  steve: { wave: 'p50', midi: 61, spread: 2, dur: 0.06, vol: 0.2, attack: 0.004, bend: -1 },
  hopper: { wave: 'saw', midi: 45, spread: 2, dur: 0.085, vol: 0.24, attack: 0.006, bend: -1 },
  // Robin is the fastest and highest pulse, and every blip leans a semitone up, as if she is already on the next word.
  // Nancy is the lowest triangle and the most level one: a third of the pitch spread of the others, no bend, a soft
  // start and a steady length. Erica is a bright square above them all, short and hard, with no attack at all. Levels
  // are set by ear-weighted energy (A-weighted, from an offline render), not by peak: a low triangle needs a higher
  // peak than a bright square to be heard at the same level, so Nancy's is 0.38 and Erica's 0.14.
  robin: { wave: 'p25', midi: 77, spread: 4, dur: 0.028, vol: 0.22, attack: 0.001, bend: 1 },
  nancy: { wave: 'tri', midi: 55, spread: 1, dur: 0.07, vol: 0.38, attack: 0.012 },
  erica: { wave: 'p50', midi: 83, spread: 2, dur: 0.03, vol: 0.14, attack: 0.001 },
  // Billy is a low square, a fourth under Lucas's and above Hopper's saw, hard-edged and rough: a fast, wide wobble
  // roughens it into a growl, and every blip drops three semitones, a good deal further than Steve's or Hopper's one.
  // He never speaks while he fights, so it is heard in one short line, and it has to read as him. His level is set by
  // ear-weighted energy like the others: a low square needs more peak than a bright one to be heard as loud.
  billy: { wave: 'p50', midi: 50, spread: 2, dur: 0.07, vol: 0.23, attack: 0.002, bend: -3, rough: GROWL },
  // Eddie is a clean 25 percent pulse that trembles: a vibrato rides every blip, theatrical and nervous underneath. It centres on
  // F4, a major third over Steve's square and a whole tone under Mike's, and runs a little longer than theirs so the warble has
  // time to turn over. Max's pulse is a fifth higher, so the wobble in pitch is what makes it his. His level is set by ear-weighted
  // energy like the others.
  eddie: { wave: 'p25', midi: 65, spread: 3, dur: 0.08, vol: 0.19, attack: 0.003, vibrato: WARBLE },
  // Vecna is very low and slow, and dry: a thin 12.5 percent pulse on B2 (47), two semitones over Hopper's A2, who stays the lowest
  // voice and the only saw, and a minor third under Billy's growl, which stays the only rough one. Every blip is the longest there is
  // (0.12 s, a hesitation before each word, where Hopper's 0.085 is gruff) and sags two semitones, with a pitch spread of one so he
  // hardly moves: slow and certain. The crackle is what makes it his: three pops of white noise through a band round 1.8 kHz
  // land across each blip, like a vine splitting or a cinder going in a fire, where Billy's roughness is a wobble in the pitch
  // itself. Its level is set by ear-weighted energy like the others: a low thin pulse needs a higher peak than a bright one.
  vecna: { wave: 'p12', midi: 47, spread: 1, dur: 0.12, vol: 0.26, attack: 0.012, bend: -2, crackle: CRACKLE },
  dm: { wave: 'p50', midi: 48, spread: 3, dur: 0.06, vol: 0.2, attack: 0.003 },
  narrator: { wave: 'p25', midi: 59, spread: 1, dur: 0.05, vol: 0.09, attack: 0.004 },
};

export function playBlip(
  ctx: BaseAudioContext, dest: AudioNode, who: Speaker, t: number, rand: () => number = Math.random,
): void {
  const b = BLIPS[who];
  const semis = Math.floor(rand() * (2 * b.spread + 1)) - b.spread;
  const cents = (rand() - 0.5) * 30;
  const freq = midiToHz(b.midi + semis) * Math.pow(2, cents / 1200);
  tone(ctx, dest, {
    wave: b.wave,
    freq,
    to: b.bend ? freq * Math.pow(2, b.bend / 12) : undefined,
    t,
    gate: b.dur,
    vol: b.vol,
    env: { a: b.attack, d: b.dur * 0.6, s: 0.55, r: 0.015 },
    vib: b.rough ?? b.vibrato,
  });
  if (b.crackle) {
    const c = b.crackle;
    const seed = Math.floor(rand() * 65536);
    c.at.forEach((f, i) => {
      noise(ctx, dest, {
        mode: 15, t: t + f * b.dur, dur: c.dur, vol: c.vol, clock: 30000, seed: seed + i * 7919,
        filter: { type: 'bandpass', freq: c.freq, q: 1.1 },
      });
    });
  }
}
