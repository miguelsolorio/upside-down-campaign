// Effects for Level 9 (stage 3.3, the food court): a Mind Flayer leg striking, a leg cut, the skylight breaking, the Key's
// machine blowing up under the mall, and Eleven reaching Billy. Each is its own recipe and sits in its own part of the
// spectrum: legslam is the heavy wet thump with a crack over it (nothing under 55 Hz, which thud, slam and gateShut own),
// sever lives in the mids and highs with a tear that rises and a snap, shatter is all highs (nothing under 200 Hz), boom
// is all lows and nothing above 520 Hz, and reach is the one warm pitched sound, in the mids below 800 Hz. Pure data in
// the shape sfx.ts plays. LEVELS9 is the gain for each, measured with an offline render (the audio lab's E key, or
// renderWith in render.ts).
import { N, R, T, bp, hp, lp } from './sfx_kit.ts';
import type { Recipe } from './sfx_kit.ts';

export type Sfx9 = 'legslam' | 'sever' | 'shatter' | 'boom' | 'reach';

// legslam: a leg comes down on the floor, half a second. A bright crack goes off on top (a click of white noise above
// 3.5 kHz and a slap through a band falling from 3.8 kHz to 2.4 kHz) over a wet strike: a thump that drops from 190 Hz
// to 68 Hz with a pulse an octave under it, a squelch of short-register noise falling from 700 Hz to 260 Hz, and a slop
// of lowpassed noise that settles to 160 Hz. A bubble climbs out of it and four drips fall around the leg. It is the
// heaviest of the sounds that repeat, and it stops at 55 Hz: thud and slam own the sub bass, and this is a leg, not a wall.
const DRIPS = [[0.17, 0.4, 1200], [0.26, 0.32, 950], [0.38, 0.24, 800], [0.46, 0.16, 700]] as const;
const LEGSLAM = R([
  N(15, 44100, 0.03, 0.6, { f: hp(3500) }),
  N(15, 30000, 0.06, 0.5, { f: bp(3800, 2400, 0.9) }),
  T('tri', 190, 0.22, 0.8, { f2: 68 }),
  T('p25', 96, 0.2, 0.35, { f2: 58 }),
  N(7, 5000, 0.2, 0.9, { f: bp(700, 260, 2), rise: 0.01 }),
  N(15, 9000, 0.42, 0.8, { f: lp(900, 160), rise: 0.02 }),
  T('tri', 150, 0.09, 0.26, { at: 0.1, f2: 420 }),
  ...DRIPS.map(([at, v, f]) => N(7, 7000, 0.03, v, { at, f: bp(f, f * 0.7, 1.6) })),
], 0.05);

// sever: a leg is cut off, half a second. The tear comes first: a band of noise climbs from 900 Hz to 3.2 kHz over a
// fifth of a second, a wet squelch rises under it, and eight short fibres pop in it a few hundredths apart, each louder
// than the last. Then the snap at 0.2 s: a click above 4 kHz, a hard crack round 2.8 kHz, a thin pulse that falls from
// 1.5 kHz to 420 Hz like a bone going, and a small knock. A gush of lowpassed noise follows and two drips fall in it.
// Melt and petals fall or open in the low mids; the tear here climbs, and the highs belong to the snap.
const FIBRES = [0.02, 0.05, 0.075, 0.1, 0.12, 0.145, 0.165, 0.185];
const SEVER = R([
  N(15, 30000, 0.2, 0.7, { f: bp(900, 3200, 1.4), rise: 0.12 }),
  N(7, 4200, 0.2, 0.5, { f: bp(600, 1100, 2.2), rise: 0.06 }),
  ...FIBRES.map((at, i) => N(7, 12000 + i * 900, 0.014, 0.3 + i * 0.05, { at, f: bp(2400 + i * 160, undefined, 2) })),
  N(15, 44100, 0.012, 1, { at: 0.2, f: hp(4000) }),
  N(15, 30000, 0.04, 0.85, { at: 0.2, f: bp(2800, 1500, 1.1) }),
  T('p12', 1500, 0.05, 0.4, { at: 0.2, f2: 420 }),
  T('tri', 260, 0.08, 0.4, { at: 0.2, f2: 90 }),
  N(15, 9000, 0.26, 0.45, { at: 0.22, f: lp(1100, 300), rise: 0.03 }),
  T('tri', 520, 0.06, 0.2, { at: 0.3, f2: 300 }),
  T('tri', 440, 0.05, 0.14, { at: 0.38, f2: 260 }),
], 0.04);

// shatter: the skylight breaks, a second and a half. A wall of bright noise goes first (white noise above 3.5 kHz and a
// wide band falling from 6 kHz to 3.5 kHz), a hard crack, a crunch of the pane and a short knock in the mids under it,
// and fifteen short shards pop in the highs at uneven times, getting sparser and softer. Then the tinkle: twelve triangle
// pings fall from 6.4 kHz to 2.6 kHz over a second and a quarter, each a little quieter, with a fizz of glass dust
// swelling above them. Nothing is under 200 Hz and the pings are the only pitched parts, so it reads as glass and as the
// brightest thing in the game.
const SHARDS = [0.01, 0.035, 0.05, 0.08, 0.1, 0.14, 0.17, 0.22, 0.27, 0.33, 0.4, 0.48, 0.57, 0.68, 0.8];
const PINGS = [
  [0.06, 6400], [0.12, 5300], [0.19, 6000], [0.27, 4700], [0.35, 5200], [0.45, 4100], [0.56, 4600], [0.68, 3500],
  [0.8, 3900], [0.95, 3000], [1.1, 3300], [1.25, 2600],
] as const;
const SHATTER = R([
  N(15, 44100, 0.14, 0.9, { f: hp(3500) }),
  N(15, 44100, 0.3, 0.8, { f: bp(6000, 3500, 0.5) }),
  N(15, 30000, 0.04, 0.9, { f: bp(2800, 1800, 0.8) }),
  N(7, 8000, 0.15, 0.6, { f: bp(1800, 900, 1.2) }),
  T('tri', 320, 0.08, 0.35, { f2: 200 }),
  ...SHARDS.map((at, i) =>
    N(7, 12000 + ((i * 2713) % 9000), 0.02, 0.8 - i * 0.04, { at, f: bp(4200 + ((i * 1901) % 4200), undefined, 1.8) })),
  ...PINGS.map(([at, f], i) => T('tri', f, 0.2, 0.42 - i * 0.02, { at })),
  N(15, 44100, 1, 0.14, { at: 0.2, f: hp(6000), rise: 0.25 }),
], 0.05);

// boom: the Key's machine blows up far below the mall, nearly three seconds. It comes up through the floor, not
// through the air, so it is deep and muffled: noise swells in over a tenth of a second (nothing starts hard) and sinks
// from 300 Hz to 45 Hz as a long rumble, a boom drops from 70 Hz to 26 Hz, a wobbling sub shakes under it, and a buzz
// an octave and more up gives a small speaker something to play. Three collapses roll after it at 0.7, 1.35 and 2 s,
// each lower and softer. Nothing is above 520 Hz: gateShut, the Gate's close, has a crack, a draining tone and debris,
// and this has none of that, so it is almost silent above 500 Hz where gateShut is not, and it peaks lower too.
const COLLAPSES = [[0.7, 58, 0.4, 260], [1.35, 50, 0.28, 200], [2, 44, 0.2, 160]] as const;
const BOOM = R([
  N(15, 6000, 2.8, 0.9, { f: lp(300, 45), rise: 0.12 }),
  N(7, 2200, 2.3, 0.5, { at: 0.05, f: lp(200, 60), rise: 0.2 }),
  N(15, 9000, 0.12, 0.5, { at: 0.06, f: lp(520, 140) }),
  T('tri', 70, 1.1, 0.7, { at: 0.06, f2: 26 }),
  T('tri', 44, 1.8, 0.35, { at: 0.1, f2: 30, hold: true, vib: { rate: 5, cents: 220, delay: 0 } }),
  T('p25', 140, 0.9, 0.2, { at: 0.05, f2: 52, hold: true, vib: { rate: 8, cents: 200, delay: 0 } }),
  ...COLLAPSES.flatMap(([at, f, v, band]) => [
    T('tri', f, 0.5, v, { at, f2: 28 }),
    N(15, 7000, 0.5, v * 1.2, { at, f: lp(band, 70) }),
  ]),
], 0.03);

// reach: Eleven reaches Billy, a second and a half. A soft run of triangle bells climbs an F major ninth (F, A, C, E, G,
// from 349 Hz to 784 Hz) a tenth of a second apart, each one left to ring so they bloom into a chord, with a triangle
// an octave under the first for warmth and a breath of lowpassed air swelling behind it. The last note wobbles a little,
// like a tape that has been played too often, and its echo comes back twice, fainter, as if remembered. No note is above
// 800 Hz, the air stays under 1.2 kHz and nothing is hard-edged: reveal and heal are brighter and quicker, and this is
// the one sound that is warm.
const CHIME = [[0, 349, 0.3], [0.11, 440, 0.28], [0.22, 523, 0.26], [0.33, 659, 0.26], [0.44, 784, 0.26]] as const;
const REACH = R([
  ...CHIME.map(([at, f, v]) => T('tri', f, 1, v, { at })),
  T('tri', 175, 1.1, 0.16),
  T('tri', 786, 0.9, 0.12, { at: 0.46, vib: { rate: 5, cents: 14, delay: 0.1 } }),
  T('tri', 784, 0.5, 0.09, { at: 0.74 }),
  T('tri', 784, 0.4, 0.05, { at: 1.02 }),
  N(15, 20000, 0.9, 0.06, { f: lp(700, 1200), rise: 0.4 }),
], 0.02);

export const SFX9: Record<Sfx9, Recipe> = { legslam: LEGSLAM, sever: SEVER, shatter: SHATTER, boom: BOOM, reach: REACH };

/**
 * Gain per effect, from an offline render (peak after the limiter, alone, at the effects volume the game is balanced
 * at): legslam 0.5, sever 0.5, shatter 0.5, boom 0.5, reach 0.3. Impacts sit near 0.5 like the rest. Boom, far below
 * the mall, stays under gateShut's 0.6, and reach is the soft pitched one, near 0.3 with the other chimes.
 */
export const LEVELS9: Record<Sfx9, number> = { legslam: 0.336, sever: 0.257, shatter: 0.197, boom: 0.368, reach: 0.621 };
