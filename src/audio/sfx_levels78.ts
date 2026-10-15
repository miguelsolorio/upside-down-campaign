// Effects for Levels 7 and 8 (stages 3.1 and 3.2): Nancy's pistol and shotgun, Robin's scoop and babble, a soldier's rifle,
// a melting rat bursting, a grab, a cipher door opening, an item from Erica's stash, and a purchase at her cart. Each is
// its own recipe and sits in its own part of the spectrum: the shotgun owns the low end (nothing else here goes below
// 60 Hz), the pistol is the crisp crack in the highs, the rifle is the same idea made short and dull enough to hear
// three times in a row, scoop, melt and grab are wet and live under 1.5 kHz, babble and decode are the pitched ones, and
// stash and buy sit up at the top with a bell and a fizz. Pure data in the shape sfx.ts plays. LEVELS78 is the gain for
// each, measured with an offline render (the audio lab's E key, or renderWith in render.ts).
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx78 = 'pistol' | 'shotgun' | 'scoop' | 'babble' | 'rifle' | 'melt' | 'grab' | 'decode' | 'stash' | 'buy';

// pistol: Nancy's shot, a fifth of a second. One crack. A click of white noise through a band that falls from 2.6 kHz to
// 1.6 kHz opens it, a wider bang under it falls from 1.1 kHz to 500 Hz, a short thump drops from 260 Hz to 90 Hz, and a
// breath of air round 4 kHz fades behind it, which is the room. No second part, no pitched ring: it is over before the
// ear asks for more.
const PISTOL = R([
  N(15, 26000, 0.03, 0.95, { f: bp(2600, 1600, 0.9) }),
  N(15, 18000, 0.012, 0.8, { f: hp(2500) }),
  N(15, 20000, 0.09, 0.85, { f: bp(1100, 500, 0.7) }),
  T('tri', 260, 0.07, 0.5, { f2: 90 }),
  N(15, 24000, 0.15, 0.1, { at: 0.03, f: bp(5000, 3500, 0.7), rise: 0.01 }),
], 0.04);

// shotgun: Nancy's twelve gauge, three quarters of a second. A wide crack, a boom that falls from 120 Hz to 38 Hz, a
// second voice an octave under it, and a long blast of noise that starts bright and sinks to 120 Hz, with a lowpassed
// rumble under that. It is the loudest and the lowest of the new effects. Then the pump: at half a second the slide
// goes back (a lower knock and a click) and at 0.62 s it comes forward (a higher, shorter pair). Everything before
// 0.4 s has died by then, so the two clacks are heard by themselves.
const PUMP = [[0.5, 1800, 240, 120, 0.6], [0.62, 2600, 340, 180, 0.5]] as const;
const SHOTGUN = R([
  N(15, 40000, 0.05, 0.9, { f: bp(2000, 600, 0.5) }),
  T('tri', 120, 0.45, 0.7, { f2: 38 }),
  T('p25', 74, 0.3, 0.3, { f2: 36 }),
  N(15, 14000, 0.45, 0.9, { f: lp(1400, 120), rise: 0.008 }),
  N(15, 24000, 0.2, 0.7, { at: 0.005, f: bp(900, 300, 0.4), rise: 0.01 }),
  N(7, 4000, 0.35, 0.4, { f: lp(500, 150) }),
  N(15, 44100, 0.35, 0.1, { at: 0.05, f: hp(3500) }),
  ...PUMP.flatMap(([at, band, f, f2, v]) => [
    N(7, 12000, 0.025, v, { at, f: bp(band, undefined, 2.5) }),
    N(15, 30000, 0.012, v * 0.8, { at, f: hp(3500) }),
    T('tri', f, 0.04, v * 0.5, { at, f2 }),
  ]),
], 0.03);

// scoop: Robin's ice cream scoop, a quarter of a second. A soft wet plop and a smaller one after it. Each is a
// triangle that swells up through a bubble (180 Hz to 520 Hz, then 240 Hz to 620 Hz) over a band of short-register
// noise that squelches the same way, and a slow slosh of lowpassed noise settles it. Nothing is above 1.4 kHz and
// nothing has a hard edge: acid is the bright spit, this is the soft one.
const SCOOP = R([
  T('tri', 180, 0.1, 0.5, { f2: 520 }),
  N(7, 5000, 0.09, 0.5, { f: bp(700, 1100, 2.2), rise: 0.02 }),
  N(15, 9000, 0.14, 0.3, { at: 0.04, f: lp(1000, 400), rise: 0.03 }),
  T('tri', 240, 0.07, 0.3, { at: 0.11, f2: 620 }),
  N(7, 5000, 0.06, 0.28, { at: 0.11, f: bp(800, 1200, 2.2), rise: 0.015 }),
  N(7, 4000, 0.05, 0.2, { at: 0.18, f: bp(600, 900, 2) }),
], 0.05);

// babble: Robin talking too fast, six tenths of a second. Eleven short beeps on her own 25 percent pulse, a few
// hundredths of a second each, spaced unevenly and wandering up and down between 520 Hz and 1.4 kHz with no scale
// in them. Four slide, up or down, like the end of a word. Four are started with a tick of noise, like consonants,
// and the last one is longer and sags, like she has run out of breath and is about to start again.
const WORDS = [
  [0, 784, 0.028, 0], [0.045, 988, 0.03, 0], [0.098, 659, 0.024, 880], [0.14, 1175, 0.034, 0],
  [0.2, 880, 0.026, 0], [0.245, 1319, 0.03, 988], [0.302, 740, 0.036, 0], [0.36, 1047, 0.024, 0],
  [0.402, 831, 0.03, 1109], [0.462, 1245, 0.026, 0], [0.51, 698, 0.09, 520],
] as const;
const TICKS = [0.098, 0.2, 0.302, 0.402];
const BABBLE = R([
  ...WORDS.map(([at, f, d, f2]) => T('p25', f, d, 0.5, { at, hold: true, ...(f2 ? { f2 } : {}) })),
  ...TICKS.map((at) => N(7, 14000, 0.012, 0.66, { at, f: bp(3000, undefined, 1.5) })),
], 0.04);

// rifle: one round of a soldier's burst, a tenth of a second, played three times in a row. A flat crack through a
// band that falls from 1.9 kHz to 1.1 kHz, a short thump from 190 Hz to 80 Hz, and a small dull blast and a little
// grit under them. Nothing above 3 kHz, nothing long and no air, so three in a row stay hard but never shrill. It
// is shorter, duller and lower than the pistol, which is one bright shot with a room behind it.
const RIFLE = R([
  N(15, 30000, 0.025, 0.8, { f: bp(1900, 1100, 0.9) }),
  T('tri', 190, 0.05, 0.45, { f2: 80 }),
  N(15, 16000, 0.07, 0.55, { f: bp(800, 400, 0.8) }),
  N(7, 6000, 0.06, 0.15, { at: 0.02, f: lp(900, 300) }),
], 0.06);

// melt: a rat bursts, six tenths of a second. A splat first (a band of noise falling from 1.4 kHz to 400 Hz and a
// triangle that drops from 240 Hz to 60 Hz), then a long squelch whose pass band falls from 1.5 kHz to 260 Hz, three
// bubbles that climb as they come up, five wet pops that thin out, and a slop of lowpassed noise that settles to
// 160 Hz. Petals is a lip that opens and climbs; this is the opposite, a burst that falls and runs out.
const POPS = [[0.12, 0.45], [0.24, 0.4], [0.33, 0.34], [0.41, 0.28], [0.5, 0.2]] as const;
const MELT = R([
  N(15, 22000, 0.07, 0.9, { f: bp(1400, 400, 0.9) }),
  T('tri', 240, 0.09, 0.5, { f2: 60 }),
  N(7, 3600, 0.35, 0.8, { f: bp(1500, 260, 2.4), rise: 0.03 }),
  T('tri', 200, 0.06, 0.3, { at: 0.08, f2: 520 }),
  T('tri', 150, 0.07, 0.28, { at: 0.19, f2: 430 }),
  T('tri', 260, 0.05, 0.22, { at: 0.3, f2: 600 }),
  ...POPS.map(([at, v], i) => N(7, 9000 + i * 900, 0.02, v, { at, f: bp(900 + i * 150, undefined, 1.5) })),
  N(15, 8000, 0.28, 0.35, { at: 0.3, f: lp(700, 160), rise: 0.06 }),
], 0.05);

// grab: a Flayed or Grigori takes hold, half a second. A dull rising whoosh (250 Hz to 1.5 kHz) is the lunge, with
// none of the highs the Demogorgon's has. At 0.16 s the catch lands: a wet slap, a thump that drops from 150 Hz to
// 55 Hz, and a squeeze of short-register noise that swells through 500 to 900 Hz. A little creak of triangle wobbles
// over the squeeze, and a second, smaller grip tightens at 0.34 s.
const GRAB = R([
  N(15, 30000, 0.16, 0.6, { f: bp(250, 1500, 1.2), rise: 0.1 }),
  T('tri', 90, 0.16, 0.25, { f2: 160 }),
  N(15, 14000, 0.05, 0.9, { at: 0.16, f: bp(700, 300, 0.9) }),
  T('tri', 150, 0.1, 0.55, { at: 0.16, f2: 55 }),
  N(7, 4000, 0.22, 0.6, { at: 0.17, f: bp(500, 900, 2.6), rise: 0.05 }),
  T('tri', 420, 0.14, 0.14, { at: 0.2, f2: 300, vib: { rate: 18, cents: 70, delay: 0 } }),
  T('tri', 120, 0.1, 0.3, { at: 0.34, f2: 70 }),
  N(7, 3500, 0.12, 0.4, { at: 0.34, f: bp(600, 400, 2.2) }),
], 0.04);

// decode: the cipher door, nine tenths of a second. Four keypad beeps climb, each two tones at once the way a phone
// keypad does it (697 and 1209 Hz, 770 and 1336, 852 and 1477, 941 and 1477), flat and sharp-edged. A bolt slides
// back at 0.36 s (a click, a thump from 150 Hz to 55 Hz and a dull burst) and a chime opens it: C then a high G.
const KEYS = [[0, 697, 1209], [0.08, 770, 1336], [0.16, 852, 1477], [0.24, 941, 1477]] as const;
const DECODE = R([
  ...KEYS.flatMap(([at, low, high]) => [
    T('tri', low, 0.055, 0.22, { at, hold: true }),
    T('tri', high, 0.055, 0.2, { at, hold: true }),
  ]),
  N(7, 14000, 0.015, 0.7, { at: 0.36, f: hp(2500) }),
  T('tri', 150, 0.12, 0.6, { at: 0.37, f2: 55 }),
  N(15, 9000, 0.1, 0.6, { at: 0.37, f: lp(700, 200) }),
  T('p25', 1047, 0.08, 0.22, { at: 0.5, hold: true }),
  T('p25', 1568, 0.3, 0.24, { at: 0.58 }),
  T('tri', 3136, 0.3, 0.1, { at: 0.58 }),
], 0.01);

// stash: something from Erica's stash goes down, four tenths of a second. A crunchy bite (short-register noise round
// 1.9 kHz, a tick of white noise and a small thump), a fizz of air round 5 kHz that swells and pops five times, and
// a happy two-note chirp that slides up (988 Hz to 1175 Hz, then 1319 Hz to 1568 Hz) with a thin shimmer on the second.
const FIZZ = [0.1, 0.15, 0.2, 0.26, 0.31];
const STASH = R([
  N(7, 11000, 0.03, 0.8, { f: bp(1900, undefined, 1.5) }),
  N(15, 30000, 0.02, 0.6, { at: 0.02, f: hp(2500) }),
  T('tri', 220, 0.05, 0.3, { f2: 110 }),
  N(15, 30000, 0.3, 0.14, { at: 0.04, f: bp(5200, 3800, 0.6), rise: 0.08 }),
  ...FIZZ.map((at, i) => N(7, 15000, 0.012, 0.32 - i * 0.04, { at, f: hp(3500) })),
  T('p25', 988, 0.07, 0.3, { at: 0.07, f2: 1175 }),
  T('p25', 1319, 0.14, 0.3, { at: 0.14, f2: 1568 }),
  T('p12', 2637, 0.14, 0.1, { at: 0.14 }),
], 0.03);

// buy: a cash register, nine tenths of a second. "Ka": the drawer slams (a low thump from 180 Hz to 70 Hz, a lowpassed
// burst and three small ratchet clicks), and a bell rings above it at 0.08 s: a triangle at 2.35 kHz that rings out
// for half a second, a quieter partial 2.4 times higher that dies sooner, and a thin pulse a fifth up. One note,
// no run, nothing under 70 Hz: reveal is a rising run of bells, this is a single ding.
const BUY = R([
  N(15, 12000, 0.06, 0.7, { f: lp(1200, 300) }),
  T('tri', 180, 0.06, 0.5, { f2: 70 }),
  N(7, 14000, 0.012, 0.6, { f: hp(3000) }),
  N(7, 14000, 0.012, 0.4, { at: 0.03, f: hp(3000) }),
  N(7, 14000, 0.012, 0.35, { at: 0.05, f: hp(3000) }),
  T('tri', 2349, 0.8, 0.32, { at: 0.08 }),
  T('tri', 5640, 0.5, 0.1, { at: 0.08 }),
  T('p12', 3520, 0.6, 0.08, { at: 0.08 }),
], 0.01);

export const SFX78: Record<Sfx78, Recipe> = {
  pistol: PISTOL, shotgun: SHOTGUN, scoop: SCOOP, babble: BABBLE, rifle: RIFLE,
  melt: MELT, grab: GRAB, decode: DECODE, stash: STASH, buy: BUY,
};

/**
 * Gain per effect, from an offline render (peak after the limiter, alone, at the effects volume the game is balanced
 * at): pistol 0.5, shotgun 0.6, scoop 0.3, babble 0.3, rifle 0.38, melt 0.42, grab 0.45, decode 0.35, stash 0.36, buy 0.4.
 * Impacts sit near 0.5 like the rest and the shotgun, the biggest, a little above; the pitched and interface sounds
 * sit near 0.3 to 0.4. Rifle plays three times in a row, so it is the one impact kept well under 0.5. Three together
 * peak at 0.39 with the limiter doing nothing.
 */
export const LEVELS78: Record<Sfx78, number> = {
  pistol: 0.272, shotgun: 0.298, scoop: 0.659, babble: 0.455, rifle: 0.427,
  melt: 0.479, grab: 0.645, decode: 0.299, stash: 0.309, buy: 0.298,
};
