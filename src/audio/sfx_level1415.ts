// Effects for Levels 14 and 15 (stages 5.1 and 5.2): the Commander's whistle, a hit ringing off a trooper's riot shield, a smash breaking
// that shield for good, and a twin Demogorgon dropping into the void. Each is its own recipe and sits in its own part of the spectrum, said
// in its comment: whistle is the shrill one (a trill between 2.6 and 3 kHz), clang the one metal ring (inharmonic partials from 640 Hz to
// 3.5 kHz over a click), shieldBreak the crack and clatter (a broadband snap, a low clunk and pings that fall away), and fall the long
// one that only falls (wind and a cry sliding from 2.6 kHz and 780 Hz down to nothing). Pure data in the shape sfx.ts plays. LEVELS1415 is
// the gain for each, measured with an offline render (renderWith in render.ts, the way tests/audio-ch4.test.ts does it): see the note above it.
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx1415 = 'whistle' | 'clang' | 'shieldBreak' | 'fall';

// whistle: the Commander's pea whistle, 0.58 s: a short blast and a long one, tweet and TWEEEET. Each is a held pulse tone (2.65 kHz,
// then 2.85 kHz, leaning up 100 Hz) under a fast vibrato (30 Hz, 70 cents) for the pea rattling in the cork, a second pulse a few
// cents sharp of it so the two beat, and a breath of noise round 3.3 kHz that swells in under them. The tones are held, so each blast
// stops dead like a held breath. Nothing else is both this high and this steady for this long: alert is two plain beeps, spotted two
// pings, and feedback leans up through one tone with a slow wobble.
const WHISTLE = R([
  N(7, 24000, 0.17, 0.18, { f: bp(3300, undefined, 2.5), rise: 0.015 }),
  T('p50', 2650, 0.17, 0.3, { hold: true, f2: 2750, vib: { rate: 30, cents: 70, delay: 0.015 } }),
  T('p25', 2672, 0.17, 0.16, { hold: true, f2: 2772, vib: { rate: 26, cents: 90, delay: 0.015 } }),
  N(7, 24000, 0.36, 0.22, { at: 0.22, f: bp(3500, 3100, 2.5), rise: 0.03 }),
  T('p50', 2850, 0.36, 0.3, { at: 0.22, hold: true, f2: 2950, vib: { rate: 30, cents: 70, delay: 0.02 } }),
  T('p25', 2874, 0.36, 0.16, { at: 0.22, hold: true, f2: 2974, vib: { rate: 26, cents: 90, delay: 0.02 } }),
], 0.01);

// clang: a hit rings off a riot shield, 0.34 s. A click of noise round 2.6 kHz for the strike, then three triangles at 640 Hz, 1766 Hz and
// 3456 Hz (1, 2.76 and 5.4 times the first, the partials of a struck plate, which are not a chord), the lowest sagging a little as it
// rings and the highest gone in a tenth of a second, and a pulse at 1 kHz that is gone sooner still. No thud under it: block, the guard's
// dull stop, is a low thud with a short ring, and chime, the other long ring, is under 420 Hz. This is the only bright metal.
const CLANG = R([
  N(15, 30000, 0.03, 0.55, { f: bp(2600, undefined, 1.4) }),
  T('tri', 640, 0.34, 0.5, { f2: 626 }),
  T('tri', 1766, 0.24, 0.34),
  T('tri', 3456, 0.12, 0.18),
  T('p12', 1010, 0.07, 0.18),
], 0.03);

// shieldBreak: the shield gives, 0.5 s. A crack of noise through a band falling from 3.2 kHz to 1.2 kHz, a clunk (a triangle falling from
// 150 Hz to 62 Hz) as the strap goes, a hiss of fragments above 2.6 kHz, and then the pieces falling: six pings from 3.6 kHz down to 1.5 kHz,
// each lower and a little later than the last, with small clicks of noise between them. It is the only effect that breaks into
// pieces. Shatter, the skylight, is one big burst of glass; this is a hard crack and a clatter that dies away downward.
const SHIELD_BREAK = R([
  N(15, 44100, 0.05, 0.6, { f: bp(3200, 1200, 0.8) }),
  T('tri', 150, 0.14, 0.7, { f2: 62 }),
  N(15, 20000, 0.2, 0.3, { at: 0.02, f: hp(2600) }),
  T('tri', 3600, 0.08, 0.22, { at: 0.06, f2: 3300 }),
  T('tri', 3000, 0.09, 0.2, { at: 0.11, f2: 2700 }),
  T('tri', 2500, 0.09, 0.2, { at: 0.17, f2: 2300 }),
  T('tri', 2100, 0.1, 0.18, { at: 0.24, f2: 1900 }),
  T('tri', 1750, 0.1, 0.16, { at: 0.32, f2: 1600 }),
  T('tri', 1500, 0.12, 0.14, { at: 0.41, f2: 1380 }),
  N(7, 16000, 0.012, 0.35, { at: 0.09, f: hp(4000) }),
  N(7, 14000, 0.012, 0.3, { at: 0.2, f: hp(3500) }),
  N(7, 12000, 0.012, 0.25, { at: 0.36, f: hp(3000) }),
], 0.03);

// fall: a twin drops into the void, 1.0 s. A wind of noise falls from 2.6 kHz to 160 Hz as the distance opens, a duller register of it
// under that, and the twin's cry slides from 780 Hz to 62 Hz under a wide slow vibrato (7 Hz, 90 cents) with a pulse an octave down
// following it. Everything falls and there is no landing, because there is nothing to land on. Curse climbs and gateOpen, growl and
// logPush hold or rise; this is the one long fall.
const FALL = R([
  N(15, 22000, 1, 0.6, { f: lp(2600, 160), rise: 0.1 }),
  N(7, 3000, 0.9, 0.3, { f: lp(700, 90), rise: 0.1 }),
  T('tri', 780, 1, 0.45, { f2: 62, vib: { rate: 7, cents: 90, delay: 0.1 } }),
  T('p25', 390, 0.9, 0.2, { f2: 52 }),
], 0.02);

export const SFX1415: Record<Sfx1415, Recipe> = { whistle: WHISTLE, clang: CLANG, shieldBreak: SHIELD_BREAK, fall: FALL };

/**
 * Gain per effect, from an offline render (peak after the limiter, alone, at the effects volume the game is balanced at, the median of eight
 * starts, the limiter idle in every one): whistle 0.3, clang 0.45, shieldBreak 0.5, fall 0.4. The two metal sounds are impacts and sit near
 * 0.5 with the rest, shieldBreak the loudest as the biggest thing to happen to a shield; the whistle is a tone, high and held, which the ear
 * hears at a lower peak than a blow, so it sits at 0.3 with the pitched effects; and fall is a long low whoosh, as curse is, at 0.4. The peak
 * of a noise burst depends on where in the noise loop it starts, and the game starts it somewhere new on every play, so one render in
 * the lab can read 20 percent either way on clang, shieldBreak and fall; whistle's peak is tone, and does not move.
 */
export const LEVELS1415: Record<Sfx1415, number> = { whistle: 0.465, clang: 0.478, shieldBreak: 0.51, fall: 0.371 };
