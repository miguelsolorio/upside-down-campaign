// The eight effects of Levels 3 and 4: the Demogorgon's roar, spit, charge, petals, bite and wall hit, the
// hidden path that shimmers into view, and the vines that burn. Each sits in its own part of the spectrum,
// because the roar and the petals fire together and a charge, a thud and a bite can land inside one second.
// Pure data in the shape sfx.ts plays. LEVELS34 is the gain for each, measured with an offline render.
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx34 = 'roar' | 'acid' | 'lunge' | 'petals' | 'chomp' | 'thud' | 'reveal' | 'sizzle';

// roar: low and long, about a second and a half. A square an octave under middle C drags upward for the
// breath in (0.3 s), falls through the body of the call, and rings out on an exponential tail. A triangle
// shadows it for weight and the vibrato is wide and fast, so it tears. A short noise register at 3.2 kHz
// clocked through a lowpass gives the gravel, and breath sweeps down under it. Everything stays below 1.3 kHz,
// leaving the mid band to petals, which plays on top of it.
const ROAR = R([
  T('p25', 58, 0.32, 0.3, { f2: 118, hold: true, vib: { rate: 22, cents: 420, delay: 0 } }),
  T('p25', 118, 0.7, 0.34, { at: 0.31, f2: 52, hold: true, vib: { rate: 20, cents: 420, delay: 0 } }),
  T('p25', 52, 0.55, 0.34, { at: 1, f2: 40, vib: { rate: 20, cents: 300, delay: 0 } }),
  T('tri', 59, 0.32, 0.4, { f2: 118, hold: true }),
  T('tri', 118, 0.7, 0.4, { at: 0.31, f2: 52, hold: true }),
  T('tri', 52, 0.55, 0.4, { at: 1, f2: 40 }),
  N(7, 3200, 1.55, 0.55, { f: lp(1000, 380), rise: 0.3 }),
  N(15, 20000, 1.3, 0.4, { at: 0.05, f: bp(650, 280, 1), rise: 0.25 }),
], 0.03);

// acid: a wet spit, about a quarter of a second. A band of noise falls from 3 kHz to 1 kHz for the spray,
// two bubbles chirp upward, and a few pops and a hiss follow as it lands and eats the floor.
const ACID = R([
  N(15, 30000, 0.13, 0.8, { f: bp(2600, 900, 1.6) }),
  T('tri', 300, 0.08, 0.45, { at: 0.02, f2: 900 }),
  T('tri', 420, 0.07, 0.35, { at: 0.1, f2: 1200 }),
  N(7, 9000, 0.02, 0.5, { at: 0.05, f: bp(2200, undefined, 1.5) }),
  N(7, 8000, 0.02, 0.4, { at: 0.12, f: bp(2000, undefined, 1.5) }),
  N(7, 10000, 0.02, 0.35, { at: 0.17, f: bp(2400, undefined, 1.5) }),
  N(15, 44100, 0.18, 0.12, { at: 0.1, f: hp(5500), rise: 0.03 }),
]);

// lunge: a whoosh, a third of a second. Noise rises through the bands as the body comes at you and falls
// away as it goes past, with a dull rumble under it so it reads as a heavy thing and not a sword.
const LUNGE = R([
  N(15, 44100, 0.2, 0.9, { f: bp(300, 2600, 1.4), rise: 0.15 }),
  N(15, 44100, 0.24, 0.8, { at: 0.15, f: bp(2400, 450, 1.2), rise: 0.03 }),
  N(15, 12000, 0.32, 0.5, { f: lp(600, 200), rise: 0.12 }),
  T('tri', 150, 0.28, 0.2, { f2: 90 }),
], 0.04);

// petals: a wet, fleshy unfolding, three quarters of a second. Five lips open one after another, each a
// squelch of short-register noise through a band that climbs a little every time, a soft slide of
// triangle underneath and a wet click on top. A slow slop of lowpassed noise closes it. All of it sits
// between 400 Hz and 2 kHz, off the roar's low end.
const LIPS = [0, 1, 2, 3, 4].flatMap((k) => [
  N(7, 4000 + k * 500, 0.11, 0.6, { at: k * 0.085, f: bp(500 + k * 220, 900 + k * 300, 2.2), rise: 0.035 }),
  T('tri', 150 + k * 20, 0.09, 0.22, { at: k * 0.085, f2: 260 + k * 30 }),
  N(7, 14000, 0.012, 0.35, { at: k * 0.085 + 0.04, f: hp(2500) }),
]);
const PETALS = R([...LIPS, N(15, 9000, 0.25, 0.35, { at: 0.42, f: lp(1100, 500), rise: 0.05 })], 0.05);

// chomp: a bite, a third of a second. Jaws snap on a click of noise, teeth grind through a band around
// 900 Hz and a thump lands under it. The jaw closes again a tenth of a second later, smaller, and a wet
// gnash trails off.
const CHOMP = R([
  N(15, 30000, 0.035, 0.9, { f: bp(2400, undefined, 1.2) }),
  N(7, 3500, 0.12, 0.7, { at: 0.015, f: bp(900, 600, 1.5) }),
  T('tri', 170, 0.1, 0.45, { f2: 70 }),
  N(15, 30000, 0.03, 0.7, { at: 0.11, f: bp(2000, undefined, 1.2) }),
  N(7, 3000, 0.08, 0.5, { at: 0.12, f: bp(800, undefined, 1.5) }),
  T('tri', 130, 0.08, 0.3, { at: 0.11, f2: 60 }),
  N(7, 6000, 0.12, 0.3, { at: 0.17, f: bp(1400, 700, 2) }),
], 0.04);

// thud: a big body hits a wall, seven tenths of a second. A dull crack, a boom that drops from 85 Hz to
// 30 Hz, a rumble of lowpassed noise, then the body slumps: a second, smaller knock and bits of wall
// ticking down. Lower and duller than slam, and it ends with debris.
const DEBRIS = [[0.14, 0.4], [0.22, 0.33], [0.31, 0.27], [0.36, 0.2], [0.47, 0.14]] as const;
const THUD = R([
  N(15, 24000, 0.06, 0.8, { f: bp(900, 300, 0.8) }),
  T('tri', 85, 0.45, 0.6, { f2: 30 }),
  T('p25', 55, 0.3, 0.3, { f2: 28 }),
  N(15, 9000, 0.5, 0.9, { f: lp(380, 90), rise: 0.015 }),
  N(7, 3000, 0.4, 0.35, { at: 0.05, f: bp(600, 250, 1.2) }),
  T('tri', 70, 0.2, 0.35, { at: 0.26, f2: 35 }),
  N(15, 7000, 0.18, 0.5, { at: 0.26, f: lp(300, 100) }),
  ...DEBRIS.map(([at, v], i) => N(7, 11000 + i * 1300, 0.015, v, { at, f: hp(2500) })),
], 0.03);

// reveal: a hidden path appears, a second long. A soft rising run of triangle bells (G, B, D, F sharp, B), a
// thin shimmer above them that wobbles, and a breath of high air. It stays quiet and has no low end.
const BELLS = [784, 988, 1175, 1480, 1976].map((f, i) => T('tri', f, 0.5, 0.26 - i * 0.015, { at: i * 0.07 }));
const REVEAL = R([
  ...BELLS,
  T('tri', 392, 0.6, 0.18),
  T('p12', 2349, 0.7, 0.1, { at: 0.2, vib: { rate: 7, cents: 35, delay: 0.1 } }),
  T('p12', 3136, 0.5, 0.07, { at: 0.3 }),
  N(15, 44100, 0.8, 0.07, { f: hp(6000), rise: 0.4 }),
], 0.02);

// sizzle: vines burning, a second long. A hiss of high noise swells and thins, a wet bubble sits in the
// middle of the band, and a dozen crackles pop at uneven times, getting sparser as the vine goes. No low
// end: this is damp wood, not a flame, so it stays clear of flame.
const POPS = [0.02, 0.09, 0.13, 0.22, 0.27, 0.36, 0.41, 0.52, 0.58, 0.69, 0.77, 0.86].map((at, i) =>
  N(7, 9000 + ((i * 2713) % 8000), 0.015, 0.5 - i * 0.02, { at, f: bp(2400 + ((i * 811) % 2500), undefined, 1.5) }));
const SIZZLE = R([
  N(15, 44100, 1, 0.5, { f: bp(5200, 3200, 0.7), rise: 0.12 }),
  N(7, 5000, 0.8, 0.25, { f: bp(1500, 900, 2.5), rise: 0.2 }),
  ...POPS,
], 0.06);

export const SFX34: Record<Sfx34, Recipe> = {
  roar: ROAR, acid: ACID, lunge: LUNGE, petals: PETALS, chomp: CHOMP, thud: THUD, reveal: REVEAL, sizzle: SIZZLE,
};

/** Gain per effect, from an offline render: roar 0.55, spit 0.35, whoosh 0.4, petals 0.3, bite 0.5, wall 0.65, reveal 0.3, burn 0.4. */
export const LEVELS34: Record<Sfx34, number> = {
  roar: 0.355, acid: 0.63, lunge: 0.5, petals: 0.32, chomp: 0.69, thud: 0.64, reveal: 0.72, sizzle: 0.49,
};
