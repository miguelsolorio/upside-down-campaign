// Plays jingles and stingers from their data, and speech blips. Each voice cleans up after itself.
import type { Speaker } from '../core/types.ts';
import { midiToHz } from './dsp.ts';
import { noise, tone } from './synth.ts';
import type { Cue } from './tracks/jingles.ts';
import type { Env, Vib, Wave } from './tracks/types.ts';

const HELD: Env = { a: 0.004, d: 0.05, s: 0.85, r: 0.06 };
const VIB: Vib = { rate: 5.5, cents: 24, delay: 0.12 };

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
}

/** One voice per speaker, from the table in the design doc. The narrator is quiet on purpose. */
export const BLIPS: Record<Speaker, BlipDef> = {
  mike: { wave: 'p50', midi: 67, spread: 3, dur: 0.05, vol: 0.2, attack: 0.003 },
  dustin: { wave: 'p12', midi: 74, spread: 4, dur: 0.035, vol: 0.27, attack: 0.002 },
  lucas: { wave: 'p50', midi: 55, spread: 3, dur: 0.055, vol: 0.2, attack: 0.003 },
  eleven: { wave: 'tri', midi: 64, spread: 2, dur: 0.11, vol: 0.2, attack: 0.025 },
  will: { wave: 'tri', midi: 69, spread: 2, dur: 0.075, vol: 0.2, attack: 0.012 },
  joyce: { wave: 'tri', midi: 60, spread: 3, dur: 0.07, vol: 0.22, attack: 0.008 },
  dm: { wave: 'p50', midi: 48, spread: 3, dur: 0.06, vol: 0.2, attack: 0.003 },
  narrator: { wave: 'p25', midi: 59, spread: 1, dur: 0.05, vol: 0.09, attack: 0.004 },
};

export function playBlip(
  ctx: BaseAudioContext, dest: AudioNode, who: Speaker, t: number, rand: () => number = Math.random,
): void {
  const b = BLIPS[who];
  const semis = Math.floor(rand() * (2 * b.spread + 1)) - b.spread;
  const cents = (rand() - 0.5) * 30;
  tone(ctx, dest, {
    wave: b.wave,
    freq: midiToHz(b.midi + semis) * Math.pow(2, cents / 1200),
    t,
    gate: b.dur,
    vol: b.vol,
    env: { a: b.attack, d: b.dur * 0.6, s: 0.55, r: 0.015 },
  });
}
